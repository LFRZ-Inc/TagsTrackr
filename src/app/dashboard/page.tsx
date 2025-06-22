'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  MapPin, 
  Plus, 
  Search, 
  Grid3X3, 
  List, 
  Settings, 
  Battery, 
  Clock, 
  Crown,
  BarChart3,
  ArrowRight,
  RefreshCw,
  Bell,
  Shield,
  CheckCircle2
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import InteractiveMap from '@/components/InteractiveMap'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface PersonalDevice {
  id: string
  device_name: string
  device_type: string
  location_sharing_active: boolean
  battery_level: number | null
  last_ping_at: string | null
  current_location?: {
    latitude: number
    longitude: number
    accuracy: number
    timestamp: string
  }
}

interface DashboardOption {
  id: string
  title: string
  description: string
  icon: any
  link: string
  isRecommended?: boolean
  features: string[]
  bgColor: string
  textColor: string
}

export default function Dashboard() {
  const supabase = createSupabaseClient()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [devices, setDevices] = useState<PersonalDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDevice, setSelectedDevice] = useState<PersonalDevice | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showDashboardOptions, setShowDashboardOptions] = useState(false)
  const router = useRouter()

  const dashboardOptions: DashboardOption[] = [
    {
      id: 'simple',
      title: 'Simple Dashboard',
      description: 'Perfect for basic tracking needs',
      icon: BarChart3,
      link: '/dashboard-simple',
      features: ['Device location tracking', 'Battery monitoring', 'Basic activity status', 'Simple notifications'],
      bgColor: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      textColor: 'text-blue-900'
    },
    {
      id: 'enhanced',
      title: 'Enhanced Dashboard',
      description: 'Advanced features with interactive maps',
      icon: MapPin,
      link: '/dashboard-enhanced',
      isRecommended: true,
      features: ['Interactive maps & satellite view', 'Geofencing & safe zones', 'Family sharing & permissions', 'Advanced analytics & reports'],
      bgColor: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
      textColor: 'text-purple-900'
    }
  ]

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchDevices()
    }
  }, [user])

  async function checkUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/login')
        return
      }
      setUser(user)
    } catch (error) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  async function fetchDevices() {
    try {
      const { data, error } = await supabase
        .from('personal_devices')
        .select('*')
        .eq('user_id', user?.id)

      if (error) throw error
      
      // Transform data to include current_location for map compatibility
      const transformedDevices = (data || []).map(device => ({
        ...device,
        current_location: device.metadata?.current_location
      }))
      
      setDevices(transformedDevices)
    } catch (error) {
      console.error('Error fetching devices:', error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sendTestLocation = async (deviceId: string) => {
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) return

      const response = await fetch('/api/ping/simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`
        },
        body: JSON.stringify({
          device_id: deviceId,
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10
        })
      })

      if (response.ok) {
        alert('✅ Test location sent successfully!')
        fetchDevices()
      } else {
        alert('❌ Failed to send location')
      }
    } catch (error) {
      console.error('Error sending location:', error)
      alert('❌ Error sending location')
    }
  }

  const filteredDevices = devices.filter(device =>
    device.device_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.device_type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
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
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">{user?.email}</span>
              </div>
              
              <button
                onClick={handleSignOut}
                className="text-gray-600 hover:text-gray-900 text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Bar with Search and Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
          {/* Search and Filter */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search devices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>All Devices</option>
              <option>Active Only</option>
              <option>Inactive Only</option>
            </select>

            <div className="flex bg-white border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons with Dashboard Options */}
          <div className="flex items-center space-x-3">
            {/* Dashboard Options Toggle */}
            <button
              onClick={() => setShowDashboardOptions(!showDashboardOptions)}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              Dashboard Type
            </button>

            {/* Register Device Button */}
            <Link
              href="/register-tag"
              className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              📱 Register Device
            </Link>

            {/* Add Device Button */}
            <Link
              href="/register-tag"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Link>

            {/* Add GPS Tag Button */}
            <Link
              href="/register-tag"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add GPS Tag
            </Link>
          </div>
        </div>

        {/* Dashboard Options Panel */}
        {showDashboardOptions && (
          <div className="mb-6 bg-white rounded-2xl shadow-lg p-6 border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Choose Your Dashboard Experience</h3>
                <p className="text-sm text-gray-600">Select the dashboard that best fits your needs</p>
              </div>
              <button
                onClick={() => setShowDashboardOptions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboardOptions.map((option) => {
                const IconComponent = option.icon
                return (
                  <Link
                    key={option.id}
                    href={option.link}
                    className={`relative border-2 rounded-2xl p-6 transition-all duration-200 hover:shadow-lg ${option.bgColor}`}
                  >
                    {option.isRecommended && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <div className="inline-flex items-center px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">
                          <Crown className="h-3 w-3 mr-1" />
                          Recommended
                        </div>
                      </div>
                    )}
                    
                    <div className="text-center">
                      <div className={`inline-flex items-center justify-center w-16 h-16 ${option.bgColor.replace('50', '100')} rounded-xl mb-4`}>
                        <IconComponent className={`h-8 w-8 ${option.textColor.replace('900', '600')}`} />
                      </div>
                      <h4 className={`text-xl font-semibold ${option.textColor} mb-2`}>{option.title}</h4>
                      <p className={`text-sm ${option.textColor.replace('900', '700')} mb-4`}>{option.description}</p>
                      
                      <div className="text-left">
                        <h5 className={`text-sm font-medium ${option.textColor.replace('900', '800')} mb-2`}>Features:</h5>
                        <ul className={`text-xs ${option.textColor.replace('900', '700')} space-y-1`}>
                          {option.features.map((feature, index) => (
                            <li key={index} className="flex items-center">
                              <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4 flex items-center justify-center">
                        <ArrowRight className="h-4 w-4 text-current" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Map Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-semibold text-gray-900">Live Map</h2>
                  {devices.filter(d => d.location_sharing_active).length > 0 && (
                    <div className="flex items-center text-green-600 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                      Live Updates
                    </div>
                  )}
                </div>
                <button
                  onClick={fetchDevices}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              
              <div className="p-0">
                <InteractiveMap
                  devices={filteredDevices}
                  selectedDevice={selectedDevice}
                  height="400px"
                  onDeviceSelect={setSelectedDevice}
                  realTimeUpdates={true}
                  onRefresh={fetchDevices}
                />
              </div>
            </div>
          </div>

          {/* Your Devices Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Your Devices</h2>
                <div className="text-sm text-gray-500">
                  {devices.length} total
                </div>
              </div>
              
              <div className="p-6">
                {filteredDevices.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No devices found</h3>
                    <p className="text-gray-500 mb-4">Get started by adding your first device</p>
                    <Link
                      href="/register-tag"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Device
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredDevices.map((device) => (
                      <div 
                        key={device.id} 
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedDevice?.id === device.id 
                            ? 'border-blue-300 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedDevice(device)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900">
                            {device.device_name}
                          </h3>
                          <div className={`w-2 h-2 rounded-full ${
                            device.location_sharing_active ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>Type:</span>
                            <span className="capitalize">{device.device_type.replace('_', ' ')}</span>
                          </div>
                          
                          {device.battery_level && (
                            <div className="flex items-center justify-between">
                              <span>Battery:</span>
                              <div className="flex items-center space-x-1">
                                <Battery className="h-3 w-3" />
                                <span>{device.battery_level}%</span>
                              </div>
                            </div>
                          )}
                          
                          {device.last_ping_at && (
                            <div className="flex items-center justify-between">
                              <span>Last seen:</span>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(device.last_ping_at).toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              sendTestLocation(device.id)
                            }}
                            className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                          >
                            📍 Update Location
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 