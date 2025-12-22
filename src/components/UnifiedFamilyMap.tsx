'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Users, RefreshCw, Settings, Battery, Clock, Navigation } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">Loading map...</div> }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
)

interface CircleMember {
  id: string
  role: string
  location_sharing_enabled: boolean
  is_sharing: boolean
  users: {
    id: string
    email: string
    full_name: string | null
  }
  current_location: {
    latitude: number
    longitude: number
    accuracy?: number
    speed?: number
    heading?: number
    recorded_at: string
    device_name?: string
    device_type?: string
  } | null
  devices: any[]
  device_count: number
  active_device_count: number
}

interface UnifiedFamilyMapProps {
  circleId: string
  circleName: string
  height?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export default function UnifiedFamilyMap({
  circleId,
  circleName,
  height = '600px',
  autoRefresh = true,
  refreshInterval = 10000 // 10 seconds
}: UnifiedFamilyMapProps) {
  const [members, setMembers] = useState<CircleMember[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]) // Default: NYC
  const [mapZoom, setMapZoom] = useState(13)
  const [selectedMember, setSelectedMember] = useState<CircleMember | null>(null)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const supabase = createClientComponentClient()

  // Load Leaflet CSS
  useEffect(() => {
    if (typeof window !== 'undefined' && !document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoGS5s3Vvu8/lj4='
      link.crossOrigin = ''
      document.head.appendChild(link)
      setLeafletLoaded(true)
    } else {
      setLeafletLoaded(true)
    }
  }, [])

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/family/circles/${circleId}/members`)
      if (!response.ok) {
        throw new Error('Failed to fetch members')
      }

      const data = await response.json()
      setMembers(data.members || [])
      setLastUpdate(new Date())

      // Auto-center map on members' locations
      const locationsWithCoords = data.members.filter((m: CircleMember) => m.current_location)
      if (locationsWithCoords.length > 0) {
        const lats = locationsWithCoords.map((m: CircleMember) => m.current_location!.latitude)
        const lngs = locationsWithCoords.map((m: CircleMember) => m.current_location!.longitude)
        const avgLat = lats.reduce((a: number, b: number) => a + b, 0) / lats.length
        const avgLng = lngs.reduce((a: number, b: number) => a + b, 0) / lngs.length
        setMapCenter([avgLat, avgLng])
        setMapZoom(locationsWithCoords.length === 1 ? 15 : 12)
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (circleId) {
      fetchMembers()
    }
  }, [circleId])

  // Set up auto-refresh
  useEffect(() => {
    if (autoRefresh && circleId) {
      refreshIntervalRef.current = setInterval(() => {
        fetchMembers()
      }, refreshInterval)

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
      }
    }
  }, [autoRefresh, circleId, refreshInterval])

  // Real-time subscription for location updates
  useEffect(() => {
    if (!circleId) return

    const channel = supabase
      .channel(`circle_${circleId}_locations`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'location_pings'
        },
        (payload) => {
          // Refresh members when new location ping is received
          fetchMembers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [circleId, supabase])

  const getMemberIcon = (member: CircleMember) => {
    // Different colors for different members
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
    const colorIndex = members.indexOf(member) % colors.length
    const color = colors[colorIndex]

    if (typeof window !== 'undefined' && (window as any).L) {
      return (window as any).L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: ${color};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
          ">
            ${member.users.full_name?.charAt(0).toUpperCase() || member.users.email.charAt(0).toUpperCase()}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
    }
    return null
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

  const sharingMembers = members.filter(m => m.is_sharing)
  const notSharingMembers = members.filter(m => !m.is_sharing)

  if (!leafletLoaded) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{circleName}</h3>
          <p className="text-sm text-gray-600">
            {sharingMembers.length} of {members.length} members sharing location
            {lastUpdate && ` • Updated ${formatTimeAgo(lastUpdate.toISOString())}`}
          </p>
        </div>
        <button
          onClick={fetchMembers}
          disabled={loading}
          className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Map */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ height }}>
        {loading && members.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading family locations...</p>
            </div>
          </div>
        ) : sharingMembers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No members are sharing their location</p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            key={`${mapCenter[0]}-${mapCenter[1]}`}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {sharingMembers.map((member) => {
              if (!member.current_location) return null

              const icon = getMemberIcon(member)
              if (!icon) return null

              return (
                <Marker
                  key={member.id}
                  position={[member.current_location.latitude, member.current_location.longitude]}
                  icon={icon}
                  eventHandlers={{
                    click: () => setSelectedMember(member)
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {member.users.full_name || member.users.email}
                      </h4>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {member.current_location.latitude.toFixed(6)}, {member.current_location.longitude.toFixed(6)}
                        </div>
                        {member.current_location.accuracy && (
                          <div>Accuracy: ±{Math.round(member.current_location.accuracy)}m</div>
                        )}
                        {member.current_location.speed && (
                          <div className="flex items-center">
                            <Navigation className="h-3 w-3 mr-1" />
                            {Math.round(member.current_location.speed)} km/h
                          </div>
                        )}
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTimeAgo(member.current_location.recorded_at)}
                        </div>
                        {member.current_location.device_name && (
                          <div className="text-xs text-gray-500">
                            Device: {member.current_location.device_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                  {member.current_location.accuracy && (
                    <Circle
                      center={[member.current_location.latitude, member.current_location.longitude]}
                      radius={member.current_location.accuracy}
                      pathOptions={{
                        color: '#3B82F6',
                        fillColor: '#3B82F6',
                        fillOpacity: 0.1,
                        weight: 1
                      }}
                    />
                  )}
                </Marker>
              )
            })}
          </MapContainer>
        )}
      </div>

      {/* Member list */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-medium text-gray-900 mb-3">Circle Members</h4>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                member.is_sharing
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                  member.is_sharing ? 'bg-green-500' : 'bg-gray-400'
                }`}>
                  {member.users.full_name?.charAt(0).toUpperCase() || member.users.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {member.users.full_name || member.users.email}
                  </div>
                  <div className="text-xs text-gray-600">
                    {member.is_sharing
                      ? member.current_location
                        ? `Last seen ${formatTimeAgo(member.current_location.recorded_at)}`
                        : 'Sharing location'
                      : 'Not sharing location'}
                    {member.device_count > 0 && ` • ${member.active_device_count}/${member.device_count} devices active`}
                  </div>
                </div>
              </div>
              {member.role === 'admin' && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Admin</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

