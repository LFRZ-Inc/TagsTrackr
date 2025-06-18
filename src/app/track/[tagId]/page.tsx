'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, Battery, ArrowLeft, Clock, Signal } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface TagData {
  id: string
  tag_id: string
  name: string
  description: string
  status: string
  battery_level: number
  last_seen_at: string
  last_location?: {
    latitude: number
    longitude: number
  }
}

interface GPSPing {
  id: string
  latitude: number
  longitude: number
  accuracy: number
  battery_level: number
  signal_strength: number
  timestamp: string
}

export default function TrackTag({ params }: { params: { tagId: string } }) {
  const [tagData, setTagData] = useState<TagData | null>(null)
  const [recentPings, setRecentPings] = useState<GPSPing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTagData()
  }, [params.tagId])

  async function fetchTagData() {
    try {
      // Fetch tag information
      const { data: tag, error: tagError } = await supabase
        .from('tags')
        .select('*')
        .eq('tag_id', params.tagId)
        .single()

      if (tagError) throw tagError

      // Fetch recent GPS pings
      const { data: pings, error: pingsError } = await supabase
        .from('gps_pings')
        .select('*')
        .eq('tag_id', tag.id)
        .order('timestamp', { ascending: false })
        .limit(10)

      if (pingsError) throw pingsError

      setTagData({
        ...tag,
        last_location: pings[0] ? {
          latitude: parseFloat(pings[0].latitude),
          longitude: parseFloat(pings[0].longitude)
        } : undefined
      })
      setRecentPings(pings || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load tag data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading tag data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tag Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/dashboard" className="text-primary-600 hover:text-primary-500">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const mapUrl = tagData?.last_location 
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${tagData.last_location.longitude-0.01},${tagData.last_location.latitude-0.01},${tagData.last_location.longitude+0.01},${tagData.last_location.latitude+0.01}&layer=mapnik&marker=${tagData.last_location.latitude},${tagData.last_location.longitude}`
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4">
        <Link href="/dashboard" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{tagData?.name || params.tagId}</h1>
          <p className="text-gray-600">{tagData?.description || 'GPS Tracking Device'}</p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Map */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Current Location</h2>
            {tagData?.last_location ? (
              <div className="space-y-4">
                <iframe
                  src={mapUrl || ''}
                  width="100%"
                  height="300"
                  className="rounded-lg border"
                  title="Tag Location"
                />
                <div className="text-sm text-gray-600 text-center">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  {tagData.last_location.latitude.toFixed(6)}, {tagData.last_location.longitude.toFixed(6)}
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No location data available</p>
                  <p className="text-sm text-gray-500">Waiting for GPS signal...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Tag Status</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  tagData?.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {tagData?.status || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Battery</span>
                <div className="flex items-center">
                  <Battery className={`h-4 w-4 mr-1 ${
                    (tagData?.battery_level ?? 0) > 20 ? 'text-green-500' : 'text-yellow-500'
                  }`} />
                  <span>{tagData?.battery_level ?? '--'}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Last Update</span>
                <div className="flex items-center text-gray-600">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{tagData?.last_seen_at ? new Date(tagData.last_seen_at).toLocaleString() : 'Never'}</span>
                </div>
              </div>
              {recentPings[0] && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Signal Strength</span>
                  <div className="flex items-center text-gray-600">
                    <Signal className="h-4 w-4 mr-1" />
                    <span>{recentPings[0].signal_strength || '--'} dBm</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Pings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium">Recent Location Updates</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentPings.length === 0 ? (
              <div className="p-6 text-center">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No location data</h3>
                <p className="text-gray-500">
                  This tag hasn't sent any GPS pings yet. Try using the admin panel to simulate some data.
                </p>
              </div>
            ) : (
              recentPings.map((ping, index) => (
                <div key={ping.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`h-3 w-3 rounded-full ${
                        index === 0 ? 'bg-green-400' : 'bg-gray-300'
                      }`} />
                    </div>
                    <div>
                                             <p className="text-sm font-medium text-gray-900">
                         {parseFloat(ping.latitude.toString()).toFixed(6)}, {parseFloat(ping.longitude.toString()).toFixed(6)}
                       </p>
                      <p className="text-sm text-gray-500">
                        {new Date(ping.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Battery className="h-4 w-4 mr-1" />
                      {ping.battery_level}%
                    </div>
                    <div>±{ping.accuracy}m</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex space-x-4">
          <Link 
            href="/admin"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Test GPS Simulator
          </Link>
          <Link 
            href="/dashboard"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            View All Tags
          </Link>
        </div>
      </div>
    </div>
  )
} 