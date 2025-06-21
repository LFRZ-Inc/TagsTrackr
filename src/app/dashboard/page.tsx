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
  Activity
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

// Component imports
import AdBanner from '@/components/ads/AdBanner'
import InteractiveMap from '@/components/InteractiveMap'
import DeviceTypeSelector from '@/components/DeviceTypeSelector'
import FamilySharing from '@/components/FamilySharing'
import AlertsManager from '@/components/AlertsManager'
import MovementAnalytics from '@/components/MovementAnalytics'
import PrivacySettings from '@/components/PrivacySettings'

interface Device {
  id: string
  tag_id: string
  device_name: string
  device_type: string
  device_model?: string
  description: string | null
  is_active: boolean | null
  battery_level: number | null
  last_seen_at: string | null
  location_sharing_active?: boolean
  current_location?: {
    latitude: number
    longitude: number
  }
}

interface DashboardStats {
  totalDevices: number
  activeDevices: number
  lowBatteryDevices: number
  offlineDevices: number
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
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'alerts' | 'analytics' | 'family' | 'privacy'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'low_battery'>('all')
  
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchDevices()
      setupRealTime()
    }
  }, [user])

  async function checkUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      
      if (!user) {
        router.push('/login')
        return
      }
      
      setUser(user)
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/login')
    }
  }

  async function fetchDevices() {
    if (!user) return
    
    setRefreshing(true)
    try {
      // Fetch both GPS tags and personal devices
      const [gpsTagsResponse, personalDevicesResponse] = await Promise.all([
        supabase
          .from('gps_tags')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('personal_devices')
          .select('*')
          .eq('user_id', user.id)
      ])

      const gpsDevices = (gpsTagsResponse.data || []).map(tag => ({
        id: tag.id,
        tag_id: tag.tag_id,
        device_name: tag.description || tag.tag_id,
        device_type: 'gps_tag',
        description: tag.description,
        is_active: tag.is_active,
        battery_level: tag.battery_level,
        last_seen_at: tag.last_ping_at,
        location_sharing_active: true,
        current_location: tag.current_location
      }))

      const personalDevices = (personalDevicesResponse.data || []).map(device => ({
        id: device.id,
        tag_id: device.id,
        device_name: device.device_name,
        device_type: device.device_type,
        device_model: device.device_model,
        description: device.device_name,
        is_active: device.location_sharing_active,
        battery_level: device.battery_level,
        last_seen_at: device.last_ping_at,
        location_sharing_active: device.location_sharing_active,
        current_location: device.current_location
      }))

      const allDevices = [...gpsDevices, ...personalDevices]
      setDevices(allDevices)
      
      if (allDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(allDevices[0])
      }
    } catch (error) {
      console.error('Error fetching devices:', error)
    } finally {
      setRefreshing(false)
      setLoading(false)
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
        () => fetchDevices()
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'personal_devices',
          filter: `user_id=eq.${user.id}`
        }, 
        () => fetchDevices()
      )
      .subscribe()

    return () => subscription.unsubscribe()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getStats = (): DashboardStats => {
    const activeDevices = devices.filter(d => d.is_active).length
    const lowBatteryDevices = devices.filter(d => d.battery_level && d.battery_level < 20).length
    const offlineDevices = devices.filter(d => !d.is_active).length

    return {
      totalDevices: devices.length,
      activeDevices,
      lowBatteryDevices,
      offlineDevices
    }
  }

  const getFilteredDevices = () => {
    let filtered = devices

    if (searchTerm) {
      filtered = filtered.filter(device => 
        device.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (device.description && device.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(device => {
        switch (filterStatus) {
          case 'active': return device.is_active
          case 'inactive': return !device.is_active
          case 'low_battery': return device.battery_level && device.battery_level < 20
          default: return true
        }
      })
    }

    return filtered
  }

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMins = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  const getBatteryColor = (level: number | null) => {
    if (!level) return 'text-gray-500'
    if (level > 50) return 'text-green-500'
    if (level > 20) return 'text-yellow-500'
    return 'text-red-500'
  }

  const DeviceIcon = ({ type }: { type: string }) => {
    const Icon = deviceTypeIcons[type as keyof typeof deviceTypeIcons] || MapPin
    return <Icon className="h-5 w-5" />
  }

  const stats = getStats()
  const filteredDevices = getFilteredDevices()

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'map', label: 'Map View', icon: Map },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'family', label: 'Family', icon: Users },
    { id: 'privacy', label: 'Privacy', icon: Shield }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <MapPin className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">TagsTrackr</span>
              </Link>
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Live Updates</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => fetchDevices()}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <Link
                href="/account"
                className="p-2 text-gray-600 hover:text-gray-900"
                title="Account"
              >
                <User className="h-5 w-5" />
              </Link>
              
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Monitor and manage all your tracked devices</p>
            </div>
            
            <div className="flex space-x-3">
              <DeviceTypeSelector onDeviceAdded={fetchDevices} />
              <Link
                href="/register-tag"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add GPS Tag
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Devices</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDevices}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Signal className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeDevices}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Battery className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Low Battery</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.lowBatteryDevices}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Offline</p>
                <p className="text-2xl font-bold text-red-600">{stats.offlineDevices}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ad Banner */}
        <AdBanner pageContext="dashboard" className="mb-6" />

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search devices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                {/* Device List */}
                <div className="grid gap-4">
                  {filteredDevices.length === 0 ? (
                    <div className="text-center py-12">
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No devices found</h3>
                      <p className="text-gray-600 mb-4">
                        {devices.length === 0 
                          ? "You haven't added any devices yet. Start by adding a GPS tag or registering a personal device."
                          : "No devices match your current filters. Try adjusting your search or filter criteria."
                        }
                      </p>
                      {devices.length === 0 && (
                        <div className="flex justify-center space-x-3">
                          <Link
                            href="/register-tag"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add GPS Tag
                          </Link>
                          <DeviceTypeSelector onDeviceAdded={fetchDevices} />
                        </div>
                      )}
                    </div>
                  ) : (
                    filteredDevices.map((device) => (
                      <div
                        key={device.id}
                        onClick={() => setSelectedDevice(device)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedDevice?.id === device.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${
                              device.device_type === 'phone' ? 'bg-green-100' :
                              device.device_type === 'tablet' ? 'bg-purple-100' :
                              device.device_type === 'watch' ? 'bg-orange-100' :
                              device.device_type === 'laptop' ? 'bg-gray-100' :
                              'bg-blue-100'
                            }`}>
                              <DeviceIcon type={device.device_type} />
                            </div>
                            
                            <div>
                              <h3 className="font-medium text-gray-900">{device.device_name}</h3>
                              <p className="text-sm text-gray-600 capitalize">
                                {device.device_type.replace('_', ' ')} 
                                {device.device_model && ` • ${device.device_model}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <Battery className={`h-4 w-4 ${getBatteryColor(device.battery_level)}`} />
                              <span className={getBatteryColor(device.battery_level)}>
                                {device.battery_level ? `${device.battery_level}%` : 'N/A'}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-1 text-gray-600">
                              <Clock className="h-4 w-4" />
                              <span>{formatTimestamp(device.last_seen_at || '')}</span>
                            </div>
                            
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              device.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {device.is_active ? 'Active' : 'Offline'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Map Tab */}
            {activeTab === 'map' && (
              <div className="h-96">
                <InteractiveMap 
                  devices={devices}
                  selectedDevice={selectedDevice}
                  onDeviceSelect={setSelectedDevice}
                />
              </div>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && <AlertsManager />}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && <MovementAnalytics />}

            {/* Family Tab */}
            {activeTab === 'family' && (
              <FamilySharing devices={devices} onRefresh={fetchDevices} />
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && <PrivacySettings />}
          </div>
        </div>

        {/* Selected Device Details */}
        {selectedDevice && activeTab === 'overview' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Details</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Device Name:</span>
                  <span className="font-medium">{selectedDevice.device_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium capitalize">{selectedDevice.device_type.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${selectedDevice.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedDevice.is_active ? 'Active' : 'Offline'}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Battery:</span>
                  <span className={`font-medium ${getBatteryColor(selectedDevice.battery_level)}`}>
                    {selectedDevice.battery_level ? `${selectedDevice.battery_level}%` : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Seen:</span>
                  <span className="font-medium">{formatTimestamp(selectedDevice.last_seen_at || '')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium">
                    {selectedDevice.current_location ? 'Available' : 'Not available'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 