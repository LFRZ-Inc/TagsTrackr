'use client'

import { useState, useEffect } from 'react'
import { MapPin, Loader2, CheckCircle, AlertCircle, Navigation, RefreshCw } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'

interface LocationPingerProps {
  deviceId: string
  onLocationSent?: (location: { latitude: number; longitude: number; accuracy: number }) => void
  onError?: (error: string) => void
  autoRefresh?: boolean
  refreshInterval?: number // in minutes
}

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: string
}

const TEST_LOCATIONS = [
  { name: 'New York City', lat: 40.7589, lng: -73.9851 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093 }
]

export default function LocationPinger({ 
  deviceId, 
  onLocationSent, 
  onError,
  autoRefresh = false,
  refreshInterval = 5 
}: LocationPingerProps) {
  const [loading, setLoading] = useState(false)
  const [lastLocation, setLastLocation] = useState<LocationData | null>(null)
  const [status, setStatus] = useState<'idle' | 'getting-location' | 'sending' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [locationPermission, setLocationPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt')
  const [autoRefreshActive, setAutoRefreshActive] = useState(autoRefresh)

  // Check location permission on mount
  useEffect(() => {
    if ('geolocation' in navigator && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationPermission(result.state as 'prompt' | 'granted' | 'denied')
      })
    }
  }, [])

  // Auto refresh functionality
  useEffect(() => {
    if (!autoRefreshActive || refreshInterval <= 0) return

    const interval = setInterval(() => {
      if (status !== 'getting-location' && status !== 'sending') {
        getCurrentLocation()
      }
    }, refreshInterval * 60 * 1000) // Convert minutes to milliseconds

    return () => clearInterval(interval)
  }, [autoRefreshActive, refreshInterval, status])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus('error')
      setMessage('Geolocation is not supported by this browser')
      onError?.('Geolocation not supported')
      return
    }

    setLoading(true)
    setStatus('getting-location')
    setMessage('Getting your location...')

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // Cache location for 1 minute
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        }
        
        setLastLocation(location)
        sendLocationToServer(location)
      },
      (error) => {
        setLoading(false)
        setStatus('error')
        
        let errorMessage = 'Failed to get location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.'
            setLocationPermission('denied')
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out'
            break
        }
        
        setMessage(errorMessage)
        onError?.(errorMessage)
      },
      options
    )
  }

  const sendTestLocation = (testLocation: typeof TEST_LOCATIONS[0]) => {
    const location = {
      latitude: testLocation.lat,
      longitude: testLocation.lng,
      accuracy: 10, // Fake accuracy for test locations
      timestamp: new Date().toISOString()
    }
    
    setLastLocation(location)
    sendLocationToServer(location)
  }

  const sendLocationToServer = async (location: LocationData) => {
    setStatus('sending')
    setMessage('Sending location to server...')

    try {
      // Get the current user session
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/ping/simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          device_id: deviceId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        })
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const result = await response.json()
      
      setStatus('success')
      setMessage(`Location updated successfully! (±${Math.round(location.accuracy)}m accuracy)`)
      onLocationSent?.(location)
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        if (status === 'success') {
          setStatus('idle')
          setMessage('')
        }
      }, 3000)

    } catch (error) {
      setStatus('error')
      const errorMessage = `Failed to update location: ${error instanceof Error ? error.message : 'Unknown error'}`
      setMessage(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'getting-location':
        return <Navigation className="h-4 w-4 animate-pulse text-blue-500" />
      case 'sending':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <MapPin className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'getting-location':
      case 'sending':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* Main Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={getCurrentLocation}
          disabled={loading || locationPermission === 'denied'}
          className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {status === 'getting-location' ? (
            <Navigation className="h-4 w-4 mr-2 animate-pulse" />
          ) : (
            <MapPin className="h-4 w-4 mr-2" />
          )}
          {loading ? 'Getting Location...' : 'Update My Location'}
        </button>

        <button
          onClick={() => setAutoRefreshActive(!autoRefreshActive)}
          className={`px-3 py-2 rounded-lg border transition-colors text-sm ${
            autoRefreshActive 
              ? 'bg-green-100 text-green-700 border-green-300' 
              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
          }`}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${autoRefreshActive ? 'animate-spin' : ''}`} />
          Auto ({refreshInterval}m)
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-3 rounded-lg border text-sm ${getStatusColor()}`}>
          <div className="flex items-center">
            {getStatusIcon()}
            <span className="ml-2">{message}</span>
          </div>
        </div>
      )}

      {/* Location Permission Warning */}
      {locationPermission === 'denied' && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>Location access denied. Please enable location permissions in your browser settings and reload the page.</span>
          </div>
        </div>
      )}

      {/* Last Location Info */}
      {lastLocation && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
          <div className="font-medium text-gray-900 mb-1">Last Location Update:</div>
          <div className="text-gray-600 space-y-1">
            <div>Coordinates: {lastLocation.latitude.toFixed(6)}, {lastLocation.longitude.toFixed(6)}</div>
            <div>Accuracy: ±{Math.round(lastLocation.accuracy)} meters</div>
            <div>Time: {new Date(lastLocation.timestamp).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Test Locations */}
      <details className="border border-gray-200 rounded-lg">
        <summary className="p-3 cursor-pointer bg-gray-50 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
          🧪 Test with Sample Locations
        </summary>
        <div className="p-3 space-y-2">
          <div className="text-xs text-gray-500 mb-2">
            Use these for testing when real location is not available:
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TEST_LOCATIONS.map((location) => (
              <button
                key={location.name}
                onClick={() => sendTestLocation(location)}
                disabled={loading}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
              >
                {location.name}
              </button>
            ))}
          </div>
        </div>
      </details>
    </div>
  )
} 