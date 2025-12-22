'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MapPin, Clock, Gauge, AlertTriangle, TrendingUp, TrendingDown, Car } from 'lucide-react'
import Link from 'next/link'

interface Trip {
  id: string
  trip_name: string | null
  start_location_lat: number
  start_location_lng: number
  end_location_lat: number | null
  end_location_lng: number | null
  start_address: string | null
  end_address: string | null
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  total_distance_meters: number | null
  average_speed_kmh: number | null
  max_speed_kmh: number | null
  safety_score: number | null
  hard_braking_count: number
  rapid_acceleration_count: number
  speeding_count: number
  harsh_turning_count: number
  is_complete: boolean
}

export default function TripHistory({ deviceId }: { deviceId?: string }) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTrips()
  }, [deviceId])

  const fetchTrips = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(20)

      if (deviceId) {
        query = query.eq('device_id', deviceId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setTrips(data || [])
    } catch (err: any) {
      console.error('Error fetching trips:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDistance = (meters: number | null): string => {
    if (!meters) return 'N/A'
    if (meters < 1000) return `${Math.round(meters)}m`
    return `${(meters / 1000).toFixed(1)}km`
  }

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'N/A'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getSafetyColor = (score: number | null): string => {
    if (!score) return 'text-gray-500'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Error loading trips: {error}</p>
        <button
          onClick={fetchTrips}
          className="mt-2 text-blue-600 hover:text-blue-700 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (trips.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Car className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p>No trips recorded yet</p>
        <p className="text-sm mt-2">Start auto-tracking to begin recording trips</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Trip History</h2>
        <button
          onClick={fetchTrips}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {trips.map((trip) => (
          <Link
            key={trip.id}
            href={`/trips/${trip.id}`}
            className="block bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <h3 className="font-semibold text-gray-900 truncate">
                    {trip.trip_name || `Trip on ${formatDate(trip.started_at)}`}
                  </h3>
                  {!trip.is_complete && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                      Active
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center gap-1 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{formatDistance(trip.total_distance_meters)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(trip.duration_seconds)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-gray-600">
                    <Gauge className="h-4 w-4" />
                    <span>{trip.average_speed_kmh ? `${Math.round(trip.average_speed_kmh)} km/h` : 'N/A'}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <span className={`font-semibold ${getSafetyColor(trip.safety_score)}`}>
                      {trip.safety_score !== null ? `${trip.safety_score}/100` : 'N/A'}
                    </span>
                    <span className="text-xs text-gray-500">Safety</span>
                  </div>
                </div>

                {/* Driving Events Summary */}
                {(trip.hard_braking_count > 0 || 
                  trip.rapid_acceleration_count > 0 || 
                  trip.speeding_count > 0 || 
                  trip.harsh_turning_count > 0) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {trip.hard_braking_count > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded text-xs">
                        <TrendingDown className="h-3 w-3" />
                        <span>{trip.hard_braking_count} Hard Braking</span>
                      </div>
                    )}
                    {trip.rapid_acceleration_count > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs">
                        <TrendingUp className="h-3 w-3" />
                        <span>{trip.rapid_acceleration_count} Rapid Accel</span>
                      </div>
                    )}
                    {trip.speeding_count > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 rounded text-xs">
                        <Gauge className="h-3 w-3" />
                        <span>{trip.speeding_count} Speeding</span>
                      </div>
                    )}
                    {trip.harsh_turning_count > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{trip.harsh_turning_count} Harsh Turns</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

