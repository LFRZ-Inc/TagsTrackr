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
  Folder,
  Map,
  LogOut,
  Smartphone,
  Tablet,
  Watch,
  Laptop,
  Grid3X3,
  List
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import AdBanner from '@/components/ads/AdBanner'
import InteractiveMap from '@/components/InteractiveMap'
import DeviceTypeSelector from '@/components/DeviceTypeSelector'
import LocationSharingControl from '@/components/LocationSharingControl'

interface Device {
  id: string
  tag_id: string
  name?: string
  type: string
  device_type: string
  device_model?: string
  device_os?: string
  description: string | null
  is_active: boolean | null
  battery_level: number | null
  last_seen_at: string | null
  last_ping_at?: string | null
  group_name: string | null
  sharing_enabled?: boolean
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
  gpsTagsCount: number
  personalDevicesCount: number
}

const deviceTypeIcons = {
  gps_tag: MapPin,
  phone: Smartphone,
  tablet: Tablet,
  watch: Watch,
  laptop: Laptop
};

export default function Dashboard() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalDevices: 0,
    activeDevices: 0,
    lowBatteryDevices: 0,
    offlineDevices: 0,
    gpsTagsCount: 0,
    personalDevicesCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'low_battery'>('all')
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<'all' | 'gps_tag' | 'phone' | 'tablet' | 'watch' | 'laptop'>('all')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('map')
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [groupingDevice, setGroupingDevice] = useState<string | null>(null)
  const [realTimeEnabled, setRealTimeEnabled] = useState(true)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)

  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchDevices()
      
      // Setup real-time subscription for device locations
      if (realTimeEnabled) {
        const subscription = supabase
          .channel('dashboard_updates')
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'devices',
              filter: `owner_id=eq.${user.id}`
            }, 
            (payload) => {
              console.log('Device update received:', payload)
              fetchDevices()
            }
          )
          .on('postgres_changes', 
            { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'device_locations'
            }, 
            (payload) => {
              console.log('New location ping received:', payload)
              handleNewPing(payload.new as any)
            }
          )
          .subscribe()

        return () => {
          subscription.unsubscribe()
        }
      }
    }
  }, [user, realTimeEnabled])

  useEffect(() => {
    // Filter devices based on search term, status filter, device type, and group
    let filtered = devices

    if (searchTerm) {
      filtered = filtered.filter(device => 
        device.tag_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (device.name && device.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (device.description && device.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (device.device_model && device.device_model.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(device => {
        switch (filterStatus) {
          case 'active':
            return device.is_active === true
          case 'inactive':
            return device.is_active === false
          case 'low_battery':
            return (device.battery_level ?? 100) < 20
          default:
            return true
        }
      })
    }

    if (deviceTypeFilter !== 'all') {
      filtered = filtered.filter(device => device.device_type === deviceTypeFilter)
    }

    if (selectedGroup !== 'all') {
      filtered = filtered.filter(device => device.group_name === selectedGroup)
    }

    setFilteredDevices(filtered)
  }, [devices, searchTerm, filterStatus, deviceTypeFilter, selectedGroup])

  const handleNewPing = (ping: any) => {
    setDevices(prevDevices => 
      prevDevices.map(device => {
        if (device.id === ping.device_id) {
          return {
            ...device,
            current_location: {
              latitude: ping.latitude,
              longitude: ping.longitude
            },
            battery_level: ping.battery_level || device.battery_level,
            last_seen_at: ping.recorded_at || ping.created_at,
            last_ping_at: ping.recorded_at || ping.created_at
          }
        }
        return device
      })
    )
  }

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
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
    
    try {
      setRefreshing(true)
      
      // Fetch all devices (GPS tags and personal devices) with latest location data
      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select(`
          *,
          latest_location:device_locations!device_locations_device_id_fkey(
            latitude,
            longitude,
            recorded_at
          )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (devicesError) throw devicesError

      // Process devices to include current location and normalize data
      const processedDevices = devicesData?.map(device => ({
        ...device,
        name: device.tag_id, // Use tag_id as display name
        current_location: device.latest_location?.[0] ? {
          latitude: device.latest_location[0].latitude,
          longitude: device.latest_location[0].longitude
        } : undefined,
        last_seen_at: device.latest_location?.[0]?.recorded_at || device.last_ping_at
      })) || []

      setDevices(processedDevices)
      
      // Calculate stats
      const totalDevices = processedDevices.length
      const activeDevices = processedDevices.filter(device => device.is_active).length
      const lowBatteryDevices = processedDevices.filter(device => (device.battery_level ?? 100) < 20).length
      const offlineDevices = processedDevices.filter(device => !device.is_active).length
      const gpsTagsCount = processedDevices.filter(device => device.device_type === 'gps_tag').length
      const personalDevicesCount = processedDevices.filter(device => ['phone', 'tablet', 'watch', 'laptop'].includes(device.device_type)).length

      setStats({
        totalDevices,
        activeDevices,
        lowBatteryDevices,
        offlineDevices,
        gpsTagsCount,
        personalDevicesCount
      })
    } catch (error) {
      console.error('Error fetching devices:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchDevices()
  }

  const handleGroupDevice = async (deviceId: string, groupName: string) => {
    try {
      const { error } = await supabase
        .from('devices')
        .update({ group_name: groupName })
        .eq('id', deviceId)

      if (error) throw error

      // Update local state
      setDevices(prevDevices =>
        prevDevices.map(device =>
          device.id === deviceId ? { ...device, group_name: groupName } : device
        )
      )

      setShowGroupModal(false)
      setNewGroupName('')
      setGroupingDevice(null)
    } catch (error) {
      console.error('Error updating group:', error)
      alert('Failed to update device group')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getUniqueGroups = () => {
    const groups = devices
      .map(device => device.group_name)
      .filter((group, index, array) => group && array.indexOf(group) === index)
    return groups as string[]
  }

  const getBatteryColor = (level: number | null) => {
    if (!level) return 'text-gray-500'
    if (level > 50) return 'text-green-600'
    if (level > 20) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getDeviceTypeDisplayName = (deviceType: string) => {
    switch (deviceType) {
      case 'gps_tag': return 'GPS Tag'
      case 'phone': return 'Phone'
      case 'tablet': return 'Tablet'
      case 'watch': return 'Watch'
      case 'laptop': return 'Laptop'
      default: return deviceType
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading your devices...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-primary-600">
                TagsTrackr
              </Link>
              {realTimeEnabled && (
                <div className="ml-4 flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-sm font-medium hidden sm:inline">Live Updates</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-700">
                <User className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">{user?.email}</span>
              </div>
              <button
                onClick={() => setRealTimeEnabled(!realTimeEnabled)}
                className={`p-2 rounded-md ${realTimeEnabled ? 'text-green-600' : 'text-gray-400'}`}
                title="Toggle real-time updates"
              >
                <Signal className="h-5 w-5" />
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-900"
                title="Refresh data"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/account"
                className="p-2 text-gray-600 hover:text-gray-900"
                title="Account settings"
              >
                <User className="h-5 w-5" />
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-5 w-5 mr-1" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Device Dashboard</h1>
              <p className="text-gray-600">Track all your GPS tags and personal devices</p>
            </div>
            <div className="flex space-x-3">
              <DeviceTypeSelector onDeviceAdded={fetchDevices} />
              <Link
                href="/register-tag"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add GPS Tag
              </Link>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-full">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Total Devices</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDevices}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-full">
                <Signal className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeDevices}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Battery className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Low Battery</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.lowBatteryDevices}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Offline</p>
                <p className="text-2xl font-bold text-red-600">{stats.offlineDevices}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-full">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">GPS Tags</p>
                <p className="text-2xl font-bold text-purple-600">{stats.gpsTagsCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-full">
                <Smartphone className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Personal</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.personalDevicesCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ad Banner */}
        <AdBanner pageContext="dashboard" className="mb-6" />

        {/* Location Sharing Control */}
        <LocationSharingControl devices={devices} onDeviceUpdate={fetchDevices} />

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search devices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 w-full sm:w-64"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                  <option value="low_battery">Low Battery</option>
                </select>

                {/* Device Type Filter */}
                <select
                  value={deviceTypeFilter}
                  onChange={(e) => setDeviceTypeFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Types</option>
                  <option value="gps_tag">GPS Tags</option>
                  <option value="phone">Phones</option>
                  <option value="tablet">Tablets</option>
                  <option value="watch">Watches</option>
                  <option value="laptop">Laptops</option>
                </select>

                {/* Group Filter */}
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Groups</option>
                  {getUniqueGroups().map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-md ${viewMode === 'map' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
                >
                  <Map className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {viewMode === 'map' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="h-96">
              <InteractiveMap
                tags={filteredDevices}
                selectedTag={selectedDevice}
                height="100%"
                onTagClick={setSelectedDevice}
                showRoute={true}
                autoCenter={true}
                realTimeUpdates={realTimeEnabled}
              />
            </div>
          </div>
        ) : (
          /* Device List/Grid */
          filteredDevices.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {devices.length === 0 ? 'No devices registered yet' : 'No devices match your filters'}
              </h3>
              <p className="text-gray-600 mb-6">
                {devices.length === 0 
                  ? 'Get started by adding your first GPS tag or personal device.' 
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
              {devices.length === 0 && (
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/register-tag"
                    className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add GPS Tag
                  </Link>
                  <DeviceTypeSelector onDeviceAdded={fetchDevices} className="bg-blue-600 hover:bg-blue-700" />
                </div>
              )}
            </div>
          ) : (
            <div className={`grid gap-4 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {filteredDevices.map((device) => {
                const DeviceIcon = deviceTypeIcons[device.device_type as keyof typeof deviceTypeIcons] || MapPin;
                return (
                  <div key={device.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <DeviceIcon className="h-5 w-5 text-gray-600" />
                            <h3 className="text-lg font-medium text-gray-900 truncate">{device.name || device.tag_id}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              device.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {device.is_active ? 'Active' : 'Offline'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {getDeviceTypeDisplayName(device.device_type)}
                            {device.device_model && ` • ${device.device_model}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">ID: {device.tag_id}</p>
                          {device.group_name && (
                            <div className="flex items-center mt-1">
                              <Folder className="h-3 w-3 text-gray-400 mr-1" />
                              <span className="text-xs text-gray-500">{device.group_name}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          {device.battery_level !== null && (
                            <div className="flex items-center text-sm">
                              <Battery className={`h-4 w-4 mr-1 ${getBatteryColor(device.battery_level)}`} />
                              <span className={getBatteryColor(device.battery_level)}>
                                {device.battery_level}%
                              </span>
                            </div>
                          )}
                          {device.current_location && (
                            <div className="flex items-center text-xs text-gray-500">
                              <MapPin className="h-3 w-3 mr-1" />
                              Location: Yes
                            </div>
                          )}
                          {device.location_sharing_active && (
                            <div className="flex items-center text-xs text-green-600">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                              Sharing
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {device.last_seen_at ? formatTimestamp(device.last_seen_at) : 'Never seen'}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Link
                          href={`/track/${device.tag_id}`}
                          className="flex-1 flex items-center justify-center px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Track
                        </Link>
                        <button
                          onClick={() => {
                            setGroupingDevice(device.id)
                            setShowGroupModal(true)
                          }}
                          className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                        >
                          <Folder className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Group Modal */}
        {showGroupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Group Device</h3>
                <input
                  type="text"
                  placeholder="Enter group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                />
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowGroupModal(false)
                      setNewGroupName('')
                      setGroupingDevice(null)
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => groupingDevice && handleGroupDevice(groupingDevice, newGroupName)}
                    disabled={!newGroupName.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 