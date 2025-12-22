'use client'

import { useState, useEffect } from 'react'
import { MapPin, Clock, Route, Download, Share2, TrendingUp, Activity } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface LocationPoint {
  latitude: number
  longitude: number
  timestamp: string
  accuracy?: number
  speed?: number
  heading?: number
}

interface LocationHistoryProps {
  deviceId: string
  deviceName: string
  maxPoints?: number
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d'
  onHistoryUpdate?: (history: LocationPoint[]) => void
}

export default function LocationHistory({
  deviceId,
  deviceName,
  maxPoints = 100,
  timeRange = '24h',
  onHistoryUpdate
}: LocationHistoryProps) {
  const [history, setHistory] = useState<LocationPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalDistance: 0,
    averageSpeed: 0,
    maxSpeed: 0,
    lastUpdate: null as string | null
  })

  const supabase = createClientComponentClient()

  // Fetch location history from database
  const fetchHistory = async () => {
    setLoading(true)
    try {
      // Calculate time range
      const now = new Date()
      const rangeHours = {
        '1h': 1,
        '6h': 6,
        '24h': 24,
        '7d': 168,
        '30d': 720
      }[timeRange] || 24

      const startTime = new Date(now.getTime() - rangeHours * 60 * 60 * 1000)

      // Fetch real location data from location_pings table
      const { data, error } = await supabase
        .from('location_pings')
        .select('latitude, longitude, accuracy, recorded_at, speed, heading')
        .eq('device_id', deviceId)
        .gte('recorded_at', startTime.toISOString())
        .order('recorded_at', { ascending: true })
        .limit(maxPoints)

      if (error) {
        console.error('Error fetching location history:', error)
        // Fallback: try alternative table structure
        const { data: altData, error: altError } = await supabase
          .from('gps_pings')
          .select('latitude, longitude, accuracy, timestamp, speed, heading')
          .gte('timestamp', startTime.toISOString())
          .order('timestamp', { ascending: true })
          .limit(maxPoints)

        if (altError) {
          throw altError
        }

        const points: LocationPoint[] = (altData || []).map((ping: any) => ({
          latitude: parseFloat(ping.latitude),
          longitude: parseFloat(ping.longitude),
          timestamp: ping.timestamp || ping.created_at,
          accuracy: ping.accuracy ? parseFloat(ping.accuracy) : undefined,
          speed: ping.speed ? parseFloat(ping.speed) : undefined,
          heading: ping.heading ? parseFloat(ping.heading) : undefined
        }))

        setHistory(points)
        calculateStats(points)
        onHistoryUpdate?.(points)
        return
      }

      // Convert database records to LocationPoint format
      const points: LocationPoint[] = (data || []).map((ping: any) => ({
        latitude: parseFloat(ping.latitude),
        longitude: parseFloat(ping.longitude),
        timestamp: ping.recorded_at || ping.timestamp || ping.created_at,
        accuracy: ping.accuracy ? parseFloat(ping.accuracy) : undefined,
        speed: ping.speed ? parseFloat(ping.speed) : undefined,
        heading: ping.heading ? parseFloat(ping.heading) : undefined
      }))

      setHistory(points)
      calculateStats(points)
      onHistoryUpdate?.(points)
    } catch (error) {
      console.error('Error fetching location history:', error)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  // Calculate movement statistics
  const calculateStats = (points: LocationPoint[]) => {
    if (points.length < 2) {
      setStats({
        totalDistance: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        lastUpdate: points[0]?.timestamp || null
      })
      return
    }

    let totalDistance = 0
    let totalSpeed = 0
    let maxSpeed = 0
    let speedCount = 0

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      
      // Calculate distance using Haversine formula
      const distance = calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      )
      totalDistance += distance

      if (curr.speed !== undefined) {
        totalSpeed += curr.speed
        maxSpeed = Math.max(maxSpeed, curr.speed)
        speedCount++
      }
    }

    setStats({
      totalDistance: totalDistance / 1000, // Convert to km
      averageSpeed: speedCount > 0 ? totalSpeed / speedCount : 0,
      maxSpeed,
      lastUpdate: points[points.length - 1]?.timestamp || null
    })
  }

  // Haversine distance calculation
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c
  }

  // Export history as JSON
  const exportHistory = () => {
    const data = {
      deviceId,
      deviceName,
      timeRange,
      exportDate: new Date().toISOString(),
      history,
      stats
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${deviceName}_location_history_${timeRange}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Share location data
  const shareLocation = async () => {
    if (navigator.share && history.length > 0) {
      const latest = history[history.length - 1]
      try {
        await navigator.share({
          title: `${deviceName} Location`,
          text: `Current location of ${deviceName}`,
          url: `https://maps.google.com/?q=${latest.latitude},${latest.longitude}`
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      // Fallback: copy to clipboard
      const latest = history[history.length - 1]
      if (latest) {
        const url = `https://maps.google.com/?q=${latest.latitude},${latest.longitude}`
        navigator.clipboard.writeText(url)
        alert('Location URL copied to clipboard!')
      }
    }
  }

  useEffect(() => {
    if (deviceId) {
      fetchHistory()
    }
  }, [deviceId, timeRange])

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`
    return `${km.toFixed(2)}km`
  }

  const formatSpeed = (kmh: number) => {
    return `${kmh.toFixed(1)} km/h`
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.round(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.round(diffMins / 60)}h ago`
    return `${Math.round(diffMins / 1440)}d ago`
  }

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Location History</h3>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => {
              const newRange = e.target.value as '1h' | '6h' | '24h' | '7d' | '30d'
              fetchHistory()
            }}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <button
            onClick={exportHistory}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Export History"
          >
            <Download className="h-4 w-4" />
          </button>
          
          <button
            onClick={shareLocation}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Share Current Location"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center">
            <Route className="h-4 w-4 text-blue-600 mr-2" />
            <div>
              <div className="text-xs text-blue-600 font-medium">Distance</div>
              <div className="text-sm font-semibold text-blue-900">
                {formatDistance(stats.totalDistance)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-3 rounded-lg">
          <div className="flex items-center">
            <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
            <div>
              <div className="text-xs text-green-600 font-medium">Avg Speed</div>
              <div className="text-sm font-semibold text-green-900">
                {formatSpeed(stats.averageSpeed)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 p-3 rounded-lg">
          <div className="flex items-center">
            <Activity className="h-4 w-4 text-orange-600 mr-2" />
            <div>
              <div className="text-xs text-orange-600 font-medium">Max Speed</div>
              <div className="text-sm font-semibold text-orange-900">
                {formatSpeed(stats.maxSpeed)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-purple-600 mr-2" />
            <div>
              <div className="text-xs text-purple-600 font-medium">Last Update</div>
              <div className="text-sm font-semibold text-purple-900">
                {stats.lastUpdate ? formatTimeAgo(stats.lastUpdate) : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Locations */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Recent Locations</h4>
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No location history available</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {history.slice(-10).reverse().map((point, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-3 w-3 text-gray-400" />
                  <div className="text-xs">
                    <div className="font-medium text-gray-900">
                      {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                    </div>
                    <div className="text-gray-500">
                      {point.accuracy && `±${Math.round(point.accuracy)}m`}
                      {point.speed && ` • ${formatSpeed(point.speed)}`}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {formatTimeAgo(point.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 