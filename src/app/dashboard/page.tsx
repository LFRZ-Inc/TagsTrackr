'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LocationPinger from '@/components/LocationPinger'
import InteractiveMap from '@/components/InteractiveMap'
import AlertsManager from '@/components/AlertsManager'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { getDeviceOptimization, getGeolocationOptions, getGeolocationErrorMessage, type DeviceType } from '@/lib/deviceOptimization'

// Types
interface PersonalDevice {
  id: string
  device_type: string
  device_name: string
  hardware_fingerprint: string
  device_model?: string
  device_os?: string
  sharing_enabled: boolean
  location_sharing_active: boolean
  privacy_mode: boolean
  last_ping_at?: string
  battery_level?: number
  is_active: boolean
  created_at: string
  updated_at: string
  metadata?: any
  user_id: string
  current_location?: {
    latitude: number
    longitude: number
    accuracy?: number
    recorded_at: string
  }
}

// Device interface matching InteractiveMap expectations
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
  location_sharing_enabled?: boolean
  current_location?: {
    latitude: number
    longitude: number
    accuracy?: number
    recorded_at: string
  }
}

interface DashboardType {
  id: string
  name: string
  description: string
  features: string[]
  recommended?: boolean
}

// Generate hardware fingerprint to identify current device
const generateHardwareFingerprint = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  
  const hardwareIdentifiers = [
    `${screen.width}x${screen.height}`,
    `${screen.availWidth}x${screen.availHeight}`,
    navigator.hardwareConcurrency || 'unknown',
    navigator.platform,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    (navigator as any).deviceMemory || 'unknown'
  ].join('|');
  
  let hash = 0;
  for (let i = 0; i < hardwareIdentifiers.length; i++) {
    const char = hardwareIdentifiers.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [devices, setDevices] = useState<PersonalDevice[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [selectedDevice, setSelectedDevice] = useState<PersonalDevice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null)
  const [isAutoTracking, setIsAutoTracking] = useState(false)
  const [watchId, setWatchId] = useState<number | null>(null)
  
  // Modal states
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false)
  const [showDashboardSelector, setShowDashboardSelector] = useState(false)
  
  // Add Device Modal states
  const [deviceType, setDeviceType] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)

  const router = useRouter()

  // Dashboard type options
  const dashboardTypes: DashboardType[] = [
    {
      id: 'simple',
      name: 'Simple Dashboard',
      description: 'Basic tracking with essential features',
      features: ['Device locations', 'Basic tracking', 'Simple interface']
    },
    {
      id: 'enhanced',
      name: 'Enhanced Dashboard',
      description: 'Advanced tracking with analytics',
      features: ['Real-time tracking', 'Movement analytics', 'Geofencing', 'History'],
      recommended: true
    }
  ]

  // Device type options
  const deviceTypes = [
    { id: 'gps_tag', name: 'GPS Tag', icon: '🏷️', description: 'Physical GPS tracking device' },
    { id: 'phone', name: 'Phone', icon: '📱', description: 'Mobile phone tracking' },
    { id: 'tablet', name: 'Tablet', icon: '📱', description: 'Tablet device tracking' },
    { id: 'watch', name: 'Watch', icon: '⌚', description: 'Smart watch tracking' },
    { id: 'laptop', name: 'Laptop', icon: '💻', description: 'Laptop/computer tracking' }
  ]

  useEffect(() => {
    getUser()
    
    // Identify current device by hardware fingerprint
    const identifyCurrentDevice = () => {
      if (typeof window === 'undefined') return
      
      const fingerprint = generateHardwareFingerprint()
      const storedDeviceId = localStorage.getItem('tagstrackr_current_device_id')
      
      // Check if we have a stored device ID
      if (storedDeviceId) {
        setCurrentDeviceId(storedDeviceId)
        return
      }
      
      // Try to find device by fingerprint (will be set after devices are loaded)
      if (devices.length > 0) {
        const matchingDevice = devices.find(d => d.hardware_fingerprint === fingerprint)
        if (matchingDevice) {
          setCurrentDeviceId(matchingDevice.id)
          localStorage.setItem('tagstrackr_current_device_id', matchingDevice.id)
        }
      }
    }
    
    identifyCurrentDevice()
  }, [])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  // Update current device when devices are loaded
  useEffect(() => {
    if (devices.length > 0 && !currentDeviceId) {
      const fingerprint = generateHardwareFingerprint()
      const matchingDevice = devices.find(d => d.hardware_fingerprint === fingerprint)
      if (matchingDevice) {
        setCurrentDeviceId(matchingDevice.id)
        localStorage.setItem('tagstrackr_current_device_id', matchingDevice.id)
      }
    }
  }, [devices, currentDeviceId])

  const getUser = async () => {
    try {
      // First check session (faster, doesn't require network call)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        console.log('✅ Session found, user:', session.user.id)
        setUser(session.user)
        setLoading(false)
        return
      }

      // If no session, try getUser (validates with server)
      console.log('⚠️ No session, checking with server...')
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('❌ Auth error:', error)
        // Don't redirect immediately, might be a temporary issue
        setError('Authentication error. Please try refreshing the page.')
        setLoading(false)
        // Only redirect after a delay to avoid race conditions
        setTimeout(() => {
          router.push('/login')
        }, 2000)
        return
      }

      if (user) {
        console.log('✅ User found:', user.id)
        setUser(user)
        setLoading(false)
      } else {
        console.log('❌ No user found, redirecting to login')
        setLoading(false)
        router.push('/login')
      }
    } catch (err) {
      console.error('💥 Error getting user:', err)
      setError('Failed to verify authentication. Please try again.')
      setLoading(false)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch personal devices first
      const { data: devicesData, error: devicesError } = await supabase
        .from('personal_devices')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (devicesError) throw devicesError

      // Fetch latest location ping for each device
      const deviceIds = devicesData?.map(device => device.id) || []
      let latestLocations: any[] = []
      
      if (deviceIds.length > 0) {
        const { data: locationsData, error: locationsError } = await supabase
          .from('location_pings')
          .select('device_id, latitude, longitude, accuracy, recorded_at')
          .in('device_id', deviceIds)
          .order('recorded_at', { ascending: false })
        
        if (locationsError) {
          console.error('Error fetching locations:', locationsError)
        } else {
          // Get only the most recent location per device
          const locationMap = new Map()
          locationsData?.forEach(location => {
            if (!locationMap.has(location.device_id)) {
              locationMap.set(location.device_id, location)
            }
          })
          latestLocations = Array.from(locationMap.values())
        }
             }

      // Process devices with their latest location
      const processedDevices = devicesData?.map(device => {
        // Find latest location for this device
        const deviceLocation = latestLocations.find(loc => loc.device_id === device.id)
        
        let currentLocation = null
        if (deviceLocation) {
          const lat = typeof deviceLocation.latitude === 'string' 
            ? parseFloat(deviceLocation.latitude) 
            : Number(deviceLocation.latitude)
          const lng = typeof deviceLocation.longitude === 'string'
            ? parseFloat(deviceLocation.longitude)
            : Number(deviceLocation.longitude)
          
          // Validate coordinates
          if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            currentLocation = {
              latitude: lat,
              longitude: lng,
              accuracy: deviceLocation.accuracy 
                ? (typeof deviceLocation.accuracy === 'string' 
                    ? parseFloat(deviceLocation.accuracy) 
                    : Number(deviceLocation.accuracy))
                : undefined,
              recorded_at: deviceLocation.recorded_at
            }
          } else {
            console.warn(`Invalid coordinates for device ${device.device_name}:`, { lat, lng })
          }
        }
        
        const processedDevice = {
          ...device,
          current_location: currentLocation
        }
        
        // Debug logging
        console.log(`📍 Device ${device.device_name}:`, {
          id: device.id,
          has_location: !!currentLocation,
          location: currentLocation,
          raw_location_data: deviceLocation
        })
        
        return processedDevice
      }) || []
      
      console.log('✅ [Dashboard] Processed devices for map:', processedDevices)
      console.log('✅ [Dashboard] Devices with locations:', processedDevices.filter(d => d.current_location))

      setDevices(processedDevices)

      // Also fetch tags for backward compatibility
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('is_active', true)

      if (tagsError) throw tagsError
      setTags(tagsData || [])

    } catch (error: any) {
      console.error('Error fetching data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Convert PersonalDevice to Device for InteractiveMap compatibility
  const convertToDevice = (device: PersonalDevice): Device => {
    const converted = {
      id: device.id,
      tag_id: device.id, // Use device id as tag_id for compatibility
      device_name: device.device_name,
      device_type: device.device_type,
      device_model: device.device_model,
      description: `${device.device_type} - ${device.device_model || 'Unknown model'}`,
      is_active: device.is_active && device.location_sharing_active,
      battery_level: device.battery_level || null,
      last_seen_at: device.last_ping_at || null,
      location_sharing_enabled: device.location_sharing_active,
      current_location: device.current_location
    }
    console.log('🔄 [Dashboard] Converting device:', device.device_name, 'Location:', converted.current_location)
    return converted
  }

  const handleDeviceSelect = (device: PersonalDevice) => {
    setSelectedDevice(device)
  }

  const handleUpdateLocation = async (device: PersonalDevice) => {
    console.log('📍 [Dashboard] handleUpdateLocation called with device:', device)
    
    if (!navigator.geolocation) {
      console.error('❌ [Dashboard] Geolocation not supported')
      toast.error('Geolocation is not supported by your browser')
      return
    }

    if (!user) {
      console.error('❌ [Dashboard] No user found')
      toast.error('Please log in to update location')
      return
    }

    if (!device || !device.id) {
      console.error('❌ [Dashboard] Invalid device:', device)
      toast.error('Invalid device. Please try refreshing the page.')
      return
    }

    console.log('📍 [Dashboard] Starting location update for device:', device.device_name, 'User:', user.email)

    try {
      // Always try to get location - this will trigger browser permission prompt if needed
      // On mobile, this will show the permission prompt even if previously denied
      // Don't check permission status first as it might prevent the prompt from showing
      const loadingToast = toast.loading('Requesting location access...')

      // Request location - this will trigger the browser's permission prompt
      // On mobile browsers, this may show the prompt again even if previously denied
      // Desktop browsers typically require manual settings change after denial
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const optimization = getDeviceOptimization(device.device_type as DeviceType)
            console.log('✅ [Dashboard] Location received:', pos.coords)
            console.log(`📍 [Dashboard] Accuracy: ${pos.coords.accuracy}m (${optimization.hasGPS ? 'GPS' : 'WiFi'})`)
            toast.dismiss(loadingToast)
            resolve(pos)
          },
          (err) => {
            console.error('❌ [Dashboard] Geolocation error:', err)
            toast.dismiss(loadingToast)
            
            // Show device-optimized error messages
            const errorMsg = getGeolocationErrorMessage(err.code, device.device_type as DeviceType)
            toast.error(errorMsg, { duration: err.code === 1 ? 8000 : 5000 })
            reject(err)
          },
          getGeolocationOptions(device.device_type as DeviceType)
        )
      })

      // If we reach here, we have a position
      const { latitude, longitude, accuracy } = position.coords
      console.log('📍 [Dashboard] Coordinates:', { latitude, longitude, accuracy })

      const savingToast = toast.loading('Saving location...')

      // Save location to location_pings table (with all required fields)
      const { data: pingData, error: pingError } = await supabase
        .from('location_pings')
        .insert({
          device_id: device.id,
          user_id: user.id,
          user_email: user.email || '',
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          accuracy: accuracy ? accuracy.toString() : null,
          recorded_at: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          is_background_ping: false,
          location_source: 'gps'
        })
        .select()
        .single()

      if (pingError) {
        console.error('❌ [Dashboard] Error saving location ping:', pingError)
        throw pingError
      }

      console.log('✅ [Dashboard] Location ping saved:', pingData)

      // Update device's last_ping_at
      const { error: deviceError } = await supabase
        .from('personal_devices')
        .update({ 
          last_ping_at: new Date().toISOString(),
          location_sharing_active: true
        })
        .eq('id', device.id)

      if (deviceError) {
        console.error('❌ [Dashboard] Error updating device:', deviceError)
        throw deviceError
      }

      toast.dismiss(savingToast)
      toast.success(`✅ Location updated! ${device.device_name} is now at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, {
        duration: 5000,
        icon: '📍'
      })

      // Refresh data to show updated location
      console.log('🔄 [Dashboard] Refreshing data to show updated location...')
      await fetchData()
      
      // Force map to update by refreshing again after a short delay
      setTimeout(async () => {
        console.log('🔄 [Dashboard] Second refresh to ensure map updates...')
        await fetchData()
      }, 1500)

    } catch (error: any) {
      console.error('❌ [Dashboard] Location update failed:', error)
      
      if (error.code === 1) {
        toast.error('❌ Location access denied. Please enable location permissions in your browser settings.', {
          duration: 7000
        })
      } else if (error.code === 2) {
        toast.error('❌ Location unavailable. Please check your GPS/WiFi connection and try again.')
      } else if (error.code === 3) {
        toast.error('⏱️ Location request timed out. Please try again.')
      } else {
        toast.error(`❌ Failed to update location: ${error.message || 'Unknown error'}`)
      }
    }
  }

  const handleAddDevice = async () => {
    if (!deviceType || !deviceName.trim()) {
      toast.error('Please select a device type and enter a device name')
      return
    }

    setIsRegistering(true)
    const loadingToast = toast.loading('Registering device...')

    try {
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('Please log in to add devices')
      }

      // Generate hardware fingerprint based on device type
      const hardwareFingerprint = `${deviceType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Use API endpoint instead of direct database insert (handles RLS properly)
      const response = await fetch('/api/device/personal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          device_type: deviceType,
          device_name: deviceName.trim(),
          hardware_fingerprint: hardwareFingerprint,
          device_model: deviceType === 'phone' || deviceType === 'tablet' ? navigator.userAgent : deviceType,
          device_os: navigator.platform || 'Unknown'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to register device')
      }

      toast.dismiss(loadingToast)
      toast.success(`${deviceName} registered successfully!`)

      // Reset modal
      setShowAddDeviceModal(false)
      setDeviceType('')
      setDeviceName('')

      // Refresh data
      await fetchData()

    } catch (error: any) {
      console.error('Device registration error:', error)
      toast.dismiss(loadingToast)
      toast.error(`Failed to register device: ${error.message || 'Unknown error'}`)
    } finally {
      setIsRegistering(false)
    }
  }

  // Removed test location function - using real data only

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error Loading Dashboard</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Responsive */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-4 gap-3 sm:gap-0">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">TagsTrackr Dashboard</h1>
              <div className="text-xs sm:text-sm text-gray-500 flex-shrink-0 whitespace-nowrap">
                {devices.length} devices • {tags.length} tags
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap sm:flex-nowrap">
              {/* Dashboard Type Selector */}
              <button
                onClick={() => setShowDashboardSelector(!showDashboardSelector)}
                className="relative inline-flex items-center px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Dashboard Type</span>
                <span className="sm:hidden">Type</span>
                <svg className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Add Device Button */}
              <button
                onClick={() => setShowAddDeviceModal(true)}
                className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs sm:text-sm"
              >
                <svg className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="hidden sm:inline">Add Device</span>
                <span className="sm:hidden">Add</span>
              </button>

              {/* Legacy Add GPS Tag */}
              <Link 
                href="/register-tag"
                className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs sm:text-sm"
              >
                <svg className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="hidden sm:inline">Add GPS Tag</span>
                <span className="sm:hidden">Tag</span>
              </Link>

              {/* Account */}
              <Link 
                href="/account"
                className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Account</span>
                <span className="sm:hidden">⚙️</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Dashboard Type Selector Dropdown */}
        {showDashboardSelector && (
          <div className="absolute right-4 top-16 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Choose Dashboard Type</h3>
            <div className="space-y-4">
              {dashboardTypes.map((type) => (
                <Link
                  key={type.id}
                  href={type.id === 'simple' ? '/dashboard-simple' : '/dashboard-enhanced'}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  onClick={() => setShowDashboardSelector(false)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{type.name}</h4>
                    {type.recommended && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    {type.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <svg className="mr-2 h-3 w-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </Link>
              ))}
            </div>
            <button
              onClick={() => setShowDashboardSelector(false)}
              className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Main Content - Responsive Layout */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          
          {/* Live Map Section */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Live Map</h2>
              <p className="text-sm text-gray-500 mt-1">Real-time device locations</p>
            </div>
            <div className="p-3 sm:p-4 md:p-6">
              <div className="h-64 sm:h-80 md:h-96 lg:h-[28rem] xl:h-96 rounded-lg overflow-hidden">
                {(() => {
                  const mapDevices = devices.map(convertToDevice)
                  console.log('🗺️ [Dashboard] Passing devices to map:', mapDevices.length, 'devices')
                  console.log('🗺️ [Dashboard] Devices with locations:', mapDevices.filter(d => d.current_location))
                  return (
                    <InteractiveMap
                      devices={mapDevices}
                      selectedDevice={selectedDevice ? convertToDevice(selectedDevice) : null}
                      onDeviceSelect={(device) => {
                        const personalDevice = devices.find(d => d.id === device.id)
                        if (personalDevice) handleDeviceSelect(personalDevice)
                      }}
                      onRefresh={fetchData}
                      height="100%"
                    />
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Your Devices Section */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Your Devices</h2>
              <p className="text-sm text-gray-500 mt-1">Manage and track your devices</p>
            </div>
            <div className="p-6">
              {devices.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">📱</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No devices registered</h3>
                  <p className="text-gray-500 mb-4">Add your first device to start tracking</p>
                  <button
                    onClick={() => setShowAddDeviceModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Add Your First Device
                  </button>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {devices.map((device) => (
                    <div 
                      key={device.id} 
                      className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedDevice?.id === device.id 
                          ? 'border-blue-300 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => handleDeviceSelect(device)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                          <span className="text-xl sm:text-2xl flex-shrink-0">
                            {deviceTypes.find(t => t.id === device.device_type)?.icon || '📱'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{device.device_name}</h3>
                            <p className="text-xs sm:text-sm text-gray-500 capitalize">
                              {device.device_type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0 ml-2">
                          {/* Status Indicator */}
                          <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${
                            device.location_sharing_active ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                          
                          {/* Battery Level */}
                          {device.battery_level && (
                            <span className="text-xs text-gray-500 hidden sm:inline">
                              🔋 {device.battery_level}%
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Location Status - Responsive */}
                      <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                        {device.current_location ? (
                          <div className="flex items-center space-x-2 text-xs text-green-600 min-w-0">
                            <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                            <span className="truncate">
                              <span className="hidden sm:inline">Location: </span>
                              {device.current_location.latitude.toFixed(4)}, {device.current_location.longitude.toFixed(4)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                            <span>No location yet</span>
                          </div>
                        )}
                        
                        {/* Last Seen */}
                        {device.last_ping_at && (
                          <div className="text-xs text-gray-500 flex-shrink-0">
                            Last seen: <span className="hidden sm:inline">{new Date(device.last_ping_at).toLocaleTimeString()}</span>
                            <span className="sm:hidden">{new Date(device.last_ping_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>

                      {/* Update Location Button - Only show for current device */}
                      {(() => {
                        const fingerprint = generateHardwareFingerprint()
                        const isCurrentDevice = device.hardware_fingerprint === fingerprint || device.id === currentDeviceId
                        const isThisDeviceTracking = isAutoTracking && device.id === currentDeviceId
                        
                        if (!isCurrentDevice) {
                          return (
                            <div className="mt-2 sm:mt-3" onClick={(e) => e.stopPropagation()}>
                              <div className="w-full bg-gray-100 text-gray-500 text-sm py-2 px-4 rounded-lg flex items-center justify-center space-x-2 cursor-not-allowed">
                                <span>📍</span>
                                <span>Use this device to update location</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1 text-center">
                                Each device must update its own location
                              </p>
                            </div>
                          )
                        }
                        
                        return (
                          <div className="mt-2 sm:mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                try {
                                  await handleUpdateLocation(device)
                                } catch (err: any) {
                                  console.error('❌ [Dashboard] Unhandled error in handleUpdateLocation:', err)
                                  toast.error(`Failed to update location: ${err?.message || 'Unknown error'}`)
                                }
                              }}
                              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span>📍</span>
                              <span>{device.current_location ? 'Update Location' : 'Get Location'}</span>
                            </button>
                            
                            {/* Auto-Tracking Toggle */}
                            {!isThisDeviceTracking ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  startAutoTracking(device)
                                }}
                                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                              >
                                <span>🔄</span>
                                <span>Start Auto-Tracking</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  stopAutoTracking()
                                }}
                                className="w-full bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                              >
                                <span>⏹️</span>
                                <span>Stop Auto-Tracking</span>
                              </button>
                            )}
                            
                            {isThisDeviceTracking && (
                              <p className="text-xs text-green-600 text-center">
                                🔄 Auto-tracking active - location updates automatically
                              </p>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Components */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {selectedDevice && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Quick Location Update for {selectedDevice.device_name}
                </h3>
                <LocationPinger deviceId={selectedDevice.id} />
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <AlertsManager />
            </div>
          </div>
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Add New Device</h2>
              <p className="text-sm text-gray-500 mt-1">Register a new device for tracking</p>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                {/* Device Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Choose Device Type
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {deviceTypes.map((type) => (
                      <label
                        key={type.id}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          deviceType === type.id
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="deviceType"
                          value={type.id}
                          checked={deviceType === type.id}
                          onChange={(e) => setDeviceType(e.target.value)}
                          className="sr-only"
                        />
                        <span className="text-2xl mr-3">{type.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900">{type.name}</div>
                          <div className="text-sm text-gray-500">{type.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Device Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Device Name
                  </label>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="e.g., My iPhone, Work Laptop, Kids Tablet"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex space-x-3">
              <button
                onClick={() => {
                  setShowAddDeviceModal(false)
                  setDeviceType('')
                  setDeviceName('')
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg transition-colors"
                disabled={isRegistering}
              >
                Cancel
              </button>
              <button
                onClick={handleAddDevice}
                disabled={!deviceType || !deviceName.trim() || isRegistering}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors"
              >
                {isRegistering ? 'Registering...' : 'Add Device'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 