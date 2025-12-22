'use client'

import { useState, useEffect } from 'react'
import { 
  Smartphone, 
  MapPin, 
  Battery, 
  Signal, 
  Play, 
  Square, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Settings,
  Shield,
  Clock
} from 'lucide-react'
import LocationTrackingService, { 
  locationTracker, 
  formatLocationAccuracy, 
  formatLastSeen 
} from '@/lib/locationTracking'
import { supabase } from '@/lib/supabase'

interface PersonalDevice {
  id: string
  device_name: string
  device_type: string
  location_sharing_enabled: boolean
  last_seen: string
  battery_level?: number
}

interface PhoneTrackingProps {
  onDeviceUpdate?: () => void
}

export default function PhoneTracking({ onDeviceUpdate }: PhoneTrackingProps) {
  const [isTracking, setIsTracking] = useState(false)
  const [currentDevice, setCurrentDevice] = useState<PersonalDevice | null>(null)
  const [locationPermission, setLocationPermission] = useState<PermissionState>('prompt')
  const [lastLocation, setLastLocation] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deviceName, setDeviceName] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    checkLocationPermission()
    loadCurrentDevice()
    
    // Update location display every 10 seconds
    const interval = setInterval(() => {
      if (locationTracker.isCurrentlyTracking()) {
        const location = locationTracker.getLastLocation()
        setLastLocation(location)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const checkLocationPermission = async () => {
    const permission = await LocationTrackingService.checkLocationPermission()
    setLocationPermission(permission)
  }

  const loadCurrentDevice = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const fingerprint = await generateDeviceFingerprint()
      
      const { data: devices, error } = await supabase
        .from('personal_devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('hardware_fingerprint', fingerprint)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading device:', error)
        return
      }

      if (devices) {
        setCurrentDevice(devices)
        setDeviceName(devices.device_name)
        setIsTracking(locationTracker.isCurrentlyTracking())
      }
    } catch (err) {
      console.error('Failed to load current device:', err)
    }
  }

  const generateDeviceFingerprint = async (): Promise<string> => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx?.fillText('Device fingerprint', 10, 10)
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|')
    
    // Simple hash
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    
    return Math.abs(hash).toString(36)
  }

  const getDeviceType = (): string => {
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      return 'phone'
    }
    if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
      return 'tablet'
    }
    return 'laptop'
  }

  const registerDevice = async () => {
    if (!deviceName.trim()) {
      setError('Please enter a device name')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please log in to register device')
        return false
      }

      const fingerprint = await generateDeviceFingerprint()
      const deviceType = getDeviceType()

      const { data, error } = await supabase
        .from('personal_devices')
        .upsert({
          user_id: user.id,
          user_email: user.email!,
          device_name: deviceName.trim(),
          device_type: deviceType,
          hardware_fingerprint: fingerprint,
          location_sharing_enabled: true,
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'user_email,hardware_fingerprint'
        })
        .select()
        .single()

      if (error) {
        setError('Failed to register device: ' + error.message)
        return false
      }

      setCurrentDevice(data)
      onDeviceUpdate?.()
      return true
    } catch (err) {
      setError('Failed to register device')
      console.error(err)
      return false
    } finally {
      setLoading(false)
    }
  }

  const startTracking = async () => {
    if (locationPermission === 'denied') {
      setError('Location permission denied. Please enable location access in your browser settings. For phones, also ensure GPS is enabled in your device settings.')
      return
    }

    if (locationPermission === 'prompt') {
      // Request permission with phone-optimized settings
      const granted = await LocationTrackingService.requestLocationPermission('phone')
      if (!granted) {
        setError('Location permission is required for tracking. For best results on phones, ensure GPS is enabled and try going outdoors.')
        return
      }
      setLocationPermission('granted')
    }

    if (!currentDevice) {
      const registered = await registerDevice()
      if (!registered) return
    }

    setLoading(true)
    setError(null)

    try {
      const success = await locationTracker.startTracking(currentDevice!.id)
      if (success) {
        setIsTracking(true)
        
        // Update device as active
        await supabase
          .from('personal_devices')
          .update({ 
            location_sharing_enabled: true,
            last_seen: new Date().toISOString()
          })
          .eq('id', currentDevice!.id)

        onDeviceUpdate?.()
      } else {
        setError('Failed to start location tracking')
      }
    } catch (err) {
      setError('Failed to start tracking')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const stopTracking = async () => {
    locationTracker.stopTracking()
    setIsTracking(false)
    setLastLocation(null)

    if (currentDevice) {
      await supabase
        .from('personal_devices')
        .update({ 
          location_sharing_enabled: false,
          last_seen: new Date().toISOString()
        })
        .eq('id', currentDevice.id)

      onDeviceUpdate?.()
    }
  }

  const sendManualPing = async () => {
    setLoading(true)
    try {
      const success = await locationTracker.sendManualPing()
      if (success) {
        const location = locationTracker.getLastLocation()
        setLastLocation(location)
      } else {
        setError('Failed to send location update')
      }
    } catch (err) {
      setError('Failed to send ping')
    } finally {
      setLoading(false)
    }
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'phone': return <Smartphone className="h-5 w-5" />
      case 'tablet': return <Smartphone className="h-5 w-5" />
      case 'laptop': return <Smartphone className="h-5 w-5" />
      default: return <Smartphone className="h-5 w-5" />
    }
  }

  const getStatusColor = () => {
    if (isTracking) return 'text-green-600'
    if (currentDevice) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const getStatusText = () => {
    if (isTracking) return 'Sharing Location'
    if (currentDevice) return 'Ready to Share'
    return 'Not Registered'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            {currentDevice ? getDeviceIcon(currentDevice.device_type) : <Smartphone className="h-5 w-5 text-blue-600" />}
          </div>
          <div>
            <h3 className="text-lg font-semibold">Phone Tracking</h3>
            <p className={`text-sm ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-3">Device Settings</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Device Name
              </label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder={`My ${getDeviceType()}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Shield className="h-4 w-4" />
              <span>Your location is only shared with your family members</span>
            </div>
          </div>
        </div>
      )}

      {!currentDevice ? (
        <div className="space-y-4">
          <div className="text-center py-6">
            <Smartphone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Enable Phone Tracking
            </h4>
            <p className="text-gray-600 mb-4">
              Share your device location with family members for safety and coordination
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder={`My ${getDeviceType()}`}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <button
              onClick={registerDevice}
              disabled={loading || !deviceName.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Register Device</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {getDeviceIcon(currentDevice.device_type)}
              <div>
                <p className="font-medium">{currentDevice.device_name}</p>
                <p className="text-sm text-gray-600 capitalize">
                  {currentDevice.device_type}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                isTracking ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span>{isTracking ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>

          {lastLocation && isTracking && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Current Location</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Accuracy:</span>
                  <span className="ml-1 font-medium">
                    {formatLocationAccuracy(lastLocation.accuracy)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Updated:</span>
                  <span className="ml-1 font-medium">
                    {formatLastSeen(lastLocation.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            {!isTracking ? (
              <button
                onClick={startTracking}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Start Sharing</span>
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={stopTracking}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2"
                >
                  <Square className="h-4 w-4" />
                  <span>Stop Sharing</span>
                </button>
                
                <button
                  onClick={sendManualPing}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  title="Send location update"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Signal className="h-4 w-4" />
                  )}
                </button>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>Location updates every 30 seconds when active</span>
          </div>
        </div>
      )}
    </div>
  )
} 