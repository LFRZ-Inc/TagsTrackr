'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  MapPin, 
  Plus, 
  Battery, 
  Clock, 
  Eye, 
  Filter,
  Search,
  User,
  Settings,
  RefreshCw,
  BarChart3,
  AlertTriangle,
  Signal,
  LogOut,
  Smartphone,
  Tablet,
  Watch,
  Laptop,
  Grid3X3,
  List,
  Bell,
  Shield,
  Users,
  Map,
  Home,
  Activity,
  X,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import InteractiveMap from '@/components/InteractiveMap'
import DeviceTypeSelector from '@/components/DeviceTypeSelector'
import AdBanner from '@/components/ads/AdBanner'
import PhoneTracking from '@/components/PhoneTracking'

interface Tag {
  id: string
  tag_id: string
  description: string | null
  is_active: boolean | null
  battery_level: number | null
  last_ping_at: string | null
  current_location?: {
    latitude: number
    longitude: number
  }
}

interface PersonalDevice {
  id: string
  device_name: string
  device_type: string
  device_model?: string
  location_sharing_active: boolean
  battery_level: number | null
  last_ping_at: string | null
  current_location?: {
    latitude: number
    longitude: number
  }
}

const deviceTypeIcons = {
  gps_tag: MapPin,
  phone: Smartphone,
  tablet: Tablet,
  watch: Watch,
  laptop: Laptop
}

export default function Dashboard() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [personalDevices, setPersonalDevices] = useState<PersonalDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<PersonalDevice | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'low_battery'>('all')
  const [showAddDevice, setShowAddDevice] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchTags()
      fetchPersonalDevices()
      setupRealTime()
    }
  }, [user])

  async function checkUser() {
    try {
      console.log('🔍 Checking user authentication...')
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('❌ Auth error:', error)
        throw error
      }
      
      if (!user) {
        console.log('❌ No user found, redirecting to login')
        router.push('/login')
        return
      }
      
      console.log('✅ User authenticated:', user.email)
      setUser(user)
    } catch (error) {
      console.error('❌ Error checking user:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  async function fetchTags() {
    if (!user) return
    
    setRefreshing(true)
    try {
      const { data, error } = await supabase
        .from('gps_tags')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTags(data || [])
      
      if (data && data.length > 0 && !selectedTag) {
        setSelectedTag(data[0])
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  async function fetchPersonalDevices() {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('personal_devices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPersonalDevices(data || [])
    } catch (error) {
      console.error('Error fetching personal devices:', error)
    }
  }

  function setupRealTime() {
    if (!user) return

    const subscription = supabase
      .channel('dashboard_updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'gps_tags',
          filter: `user_id=eq.${user.id}`
        }, 
        () => fetchTags()
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'personal_devices',
          filter: `user_id=eq.${user.id}`
        }, 
        () => fetchPersonalDevices()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const allDevices = [
    ...tags.map(tag => ({
      id: tag.id,
      name: tag.description || tag.tag_id,
      type: 'gps_tag' as const,
      isActive: tag.is_active,
      batteryLevel: tag.battery_level,
      lastSeen: tag.last_ping_at,
      location: tag.current_location
    })),
    ...personalDevices.map(device => ({
      id: device.id,
      name: device.device_name,
      type: device.device_type as keyof typeof deviceTypeIcons,
      isActive: device.location_sharing_active,
      batteryLevel: device.battery_level,
      lastSeen: device.last_ping_at,
      location: device.current_location
    }))
  ]

  const getFilteredDevices = () => {
    let filtered = allDevices

    if (searchTerm) {
      filtered = filtered.filter(device => 
        device.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    switch (filterStatus) {
      case 'active':
        filtered = filtered.filter(device => device.isActive)
        break
      case 'inactive':
        filtered = filtered.filter(device => !device.isActive)
        break
      case 'low_battery':
        filtered = filtered.filter(device => 
          device.batteryLevel !== null && device.batteryLevel < 20
        )
        break
    }

    return filtered
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  const getBatteryColor = (level: number | null) => {
    if (level === null) return 'text-gray-400'
    if (level > 50) return 'text-green-500'
    if (level > 20) return 'text-yellow-500'
    return 'text-red-500'
  }

  const DeviceIcon = ({ type }: { type: keyof typeof deviceTypeIcons }) => {
    const IconComponent = deviceTypeIcons[type] || MapPin
    return <IconComponent className="h-5 w-5" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Checking authentication and fetching your devices</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto mb-2" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access your dashboard</p>
          <Link
            href="/login"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <MapPin className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">TagsTrackr</span>
              </Link>
              <div className="ml-4 flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Live Updates</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => fetchTags()}
                disabled={refreshing}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">{user?.email}</span>
              </div>
              
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor and manage all your tracked devices</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Devices</p>
                <p className="text-2xl font-bold text-gray-900">{allDevices.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Signal className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {allDevices.filter(d => d.isActive).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Battery className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Low Battery</p>
                <p className="text-2xl font-bold text-gray-900">
                  {allDevices.filter(d => d.batteryLevel !== null && d.batteryLevel < 20).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Offline</p>
                <p className="text-2xl font-bold text-gray-900">
                  {allDevices.filter(d => !d.isActive).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Phone Tracking Section */}
        <div className="mb-8">
          <PhoneTracking onDeviceUpdate={fetchPersonalDevices} />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search devices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Devices</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="low_battery">Low Battery</option>
            </select>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => setView('grid')}
                className={`p-2 ${view === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 ${view === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            
            {user && (
              <button
                onClick={() => setShowAddDevice(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </button>
            )}
            
            <Link
              href="/register-tag"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add GPS Tag
            </Link>
          </div>
        </div>

        {/* Map and Device List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Live Map</h3>
              <InteractiveMap
                devices={allDevices.map(device => ({
                  id: device.id,
                  tag_id: device.id,
                  device_name: device.name,
                  device_type: device.type,
                  description: device.name,
                  is_active: device.isActive,
                  battery_level: device.batteryLevel,
                  last_seen_at: device.lastSeen,
                  current_location: device.location
                }))}
                selectedDevice={selectedTag ? {
                  id: selectedTag.id,
                  tag_id: selectedTag.tag_id,
                  device_name: selectedTag.description || selectedTag.tag_id,
                  device_type: 'gps_tag',
                  description: selectedTag.description,
                  is_active: selectedTag.is_active,
                  battery_level: selectedTag.battery_level,
                  last_seen_at: selectedTag.last_ping_at,
                  current_location: selectedTag.current_location
                } : null}
                height="500px"
                showRoute={true}
                autoCenter={true}
              />
            </div>
          </div>
          
          {/* Device List */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Your Devices</h3>
            
            {getFilteredDevices().length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {allDevices.length === 0 
                    ? "You haven't added any devices yet" 
                    : "No devices match your search"
                  }
                </p>
                {user && (
                  <button
                    onClick={() => setShowAddDevice(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Device
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {getFilteredDevices().map((device) => (
                  <div
                    key={device.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTag?.id === device.id || selectedDevice?.id === device.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      if (device.type === 'gps_tag') {
                        const tag = tags.find(t => t.id === device.id)
                        setSelectedTag(tag || null)
                        setSelectedDevice(null)
                      } else {
                        const personalDevice = personalDevices.find(d => d.id === device.id)
                        setSelectedDevice(personalDevice || null)
                        setSelectedTag(null)
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          device.isActive ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <DeviceIcon type={device.type} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{device.name}</h4>
                          <p className="text-sm text-gray-500 capitalize">{device.type.replace('_', ' ')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {device.batteryLevel !== null && (
                          <div className="flex items-center space-x-1">
                            <Battery className={`h-4 w-4 ${getBatteryColor(device.batteryLevel)}`} />
                            <span className={`text-sm ${getBatteryColor(device.batteryLevel)}`}>
                              {device.batteryLevel}%
                            </span>
                          </div>
                        )}
                        
                        <div className={`h-2 w-2 rounded-full ${
                          device.isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                      </div>
                    </div>
                    
                    {device.lastSeen && (
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        Last seen {formatTimestamp(device.lastSeen)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ad Banner - Only for non-premium users */}
        {user && !user.user_metadata?.is_premium && (
          <div className="mt-8">
            <AdBanner pageContext="dashboard" />
          </div>
        )}
      </div>

      {/* Add Device Modal */}
      {showAddDevice && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
            <button
              onClick={() => setShowAddDevice(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold mb-4">Add Current Device</h3>
            <DeviceTypeSelector
              user={user}
              onDeviceAdded={() => {
                fetchPersonalDevices()
                setShowAddDevice(false)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
} 