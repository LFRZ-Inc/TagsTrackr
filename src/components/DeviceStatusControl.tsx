import { useState, useEffect } from 'react'
import { Play, Square, Wifi, WifiOff, Clock, MapPin, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface DeviceStatusControlProps {
  device: {
    id: string
    device_name: string
    device_type: string
    location_sharing_active: boolean
    last_ping_at: string | null
  }
  onStatusChange?: () => void
}

export default function DeviceStatusControl({ device, onStatusChange }: DeviceStatusControlProps) {
  const [isTracking, setIsTracking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null)

  // Check if device is considered "online" (pinged within last 5 minutes)
  const isOnline = device.last_ping_at && 
    new Date().getTime() - new Date(device.last_ping_at).getTime() < 5 * 60 * 1000

  const formatLastSeen = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    const diff = new Date().getTime() - new Date(timestamp).getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const startTracking = async () => {
    setLoading(true)
    setError(null)

    try {
      // Request location permission
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser')
      }

      // Get user session for API authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Authentication required')
      }

      // Start watching position
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          try {
            const pingData = {
              device_id: device.id,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              speed: position.coords.speed,
              heading: position.coords.heading,
              source: 'browser_geolocation',
              is_background: false
            }

            const response = await fetch('/api/ping/personal', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify(pingData)
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || 'Failed to send location ping')
            }

            console.log('✅ Location ping sent successfully')
            onStatusChange?.()
          } catch (error) {
            console.error('Failed to send location ping:', error)
            setError('Failed to send location update')
          }
        },
        (error) => {
          console.error('Location error:', error)
          setError(`Location error: ${error.message}`)
          setIsTracking(false)
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000
        }
      )

      setLocationWatchId(watchId)
      setIsTracking(true)
      
      // Send initial ping immediately
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const pingData = {
              device_id: device.id,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              speed: position.coords.speed,
              heading: position.coords.heading,
              source: 'browser_geolocation',
              is_background: false
            }

            const response = await fetch('/api/ping/personal', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify(pingData)
            })

            if (response.ok) {
              console.log('✅ Initial location ping sent')
              onStatusChange?.()
            }
          } catch (error) {
            console.error('Failed to send initial ping:', error)
          }
        },
        (error) => console.error('Failed to get initial location:', error)
      )

    } catch (error) {
      console.error('Failed to start tracking:', error)
      setError(error instanceof Error ? error.message : 'Failed to start tracking')
    } finally {
      setLoading(false)
    }
  }

  const stopTracking = () => {
    if (locationWatchId) {
      navigator.geolocation.clearWatch(locationWatchId)
      setLocationWatchId(null)
    }
    setIsTracking(false)
    setError(null)
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <div className="flex items-center space-x-2 text-green-600">
              <Wifi className="h-4 w-4" />
              <span className="text-sm font-medium">Online</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-gray-500">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm font-medium">Offline</span>
            </div>
          )}
          
          {isTracking && (
            <div className="flex items-center space-x-1 text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium">Live tracking</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {!isTracking ? (
            <button
              onClick={startTracking}
              disabled={loading}
              className="inline-flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}
              Start Tracking
            </button>
          ) : (
            <button
              onClick={stopTracking}
              className="inline-flex items-center px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <Square className="h-3 w-3 mr-1" />
              Stop Tracking
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4 text-sm text-gray-600">
        <div className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>Last seen: {formatLastSeen(device.last_ping_at)}</span>
        </div>
        
        {device.location_sharing_active && (
          <div className="flex items-center space-x-1 text-green-600">
            <MapPin className="h-3 w-3" />
            <span>Sharing enabled</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
} 