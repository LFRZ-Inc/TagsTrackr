'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Battery, Signal, Clock } from 'lucide-react'

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false, loading: () => <div>Loading map...</div> }
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
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
)
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
)

interface MapLocation {
  latitude: number
  longitude: number
  timestamp?: string
  battery_level?: number | null
  signal_strength?: number | null
  accuracy?: number | null
}

interface Tag {
  id: string
  tag_id: string
  name?: string
  type: string
  device_type: string
  description: string | null
  is_active: boolean | null
  battery_level: number | null
  last_seen_at: string | null
  group_name: string | null
  location_sharing_active?: boolean
  current_location?: MapLocation
}

interface Geofence {
  id: string
  name: string
  type: string
  center: [number, number]
  radius: number
  color: string
}

interface InteractiveMapProps {
  tags: Tag[]
  selectedTag?: Tag | null
  locationHistory?: MapLocation[]
  geofences?: Geofence[]
  height?: string
  onTagClick?: (tag: Tag) => void
  showRoute?: boolean
  autoCenter?: boolean
  realTimeUpdates?: boolean
}

export default function InteractiveMap({
  tags,
  selectedTag,
  locationHistory = [],
  geofences = [],
  height = '400px',
  onTagClick,
  showRoute = false,
  autoCenter = true,
  realTimeUpdates = false
}: InteractiveMapProps) {
  const [map, setMap] = useState<any>(null)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [customIcon, setCustomIcon] = useState<any>(null)
  const [selectedIcon, setSelectedIcon] = useState<any>(null)
  const mapRef = useRef<any>(null)

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        setLeafletLoaded(true)
        
        // Fix default icon paths
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: '/leaflet/marker-icon-2x.png',
          iconUrl: '/leaflet/marker-icon.png',
          shadowUrl: '/leaflet/marker-shadow.png',
        })

        // Create custom icons
        const defaultIcon = L.divIcon({
          html: `
            <div class="relative">
              <div class="w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
            </div>
          `,
          className: 'custom-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        })

        const selectedTagIcon = L.divIcon({
          html: `
            <div class="relative">
              <div class="w-10 h-10 bg-red-500 rounded-full border-3 border-white shadow-xl flex items-center justify-center animate-pulse">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <div class="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full border border-white animate-ping"></div>
            </div>
          `,
          className: 'selected-marker',
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40]
        })

        setCustomIcon(defaultIcon)
        setSelectedIcon(selectedTagIcon)
      })
    }
  }, [])

  // Auto-center map when tags change
  useEffect(() => {
    if (map && autoCenter && tags.length > 0 && leafletLoaded) {
      const validLocations = tags
        .filter(tag => tag.current_location?.latitude && tag.current_location?.longitude)
        .map(tag => [tag.current_location!.latitude, tag.current_location!.longitude])

      if (validLocations.length > 0) {
        if (validLocations.length === 1) {
          map.setView(validLocations[0], 15)
        } else {
          map.fitBounds(validLocations, { padding: [20, 20] })
        }
      }
    }
  }, [map, tags, autoCenter, leafletLoaded])

  // Focus on selected tag
  useEffect(() => {
    if (map && selectedTag?.current_location && leafletLoaded) {
      const { latitude, longitude } = selectedTag.current_location
      map.setView([latitude, longitude], 16, { animate: true })
    }
  }, [map, selectedTag, leafletLoaded])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  if (!leafletLoaded) {
    return (
      <div 
        className="bg-gray-200 rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  // Default center (somewhere in the US if no tags)
  const defaultCenter: [number, number] = [39.8283, -98.5795]
  const mapCenter = selectedTag?.current_location 
    ? [selectedTag.current_location.latitude, selectedTag.current_location.longitude] as [number, number]
    : tags.find(t => t.current_location)?.current_location
    ? [tags.find(t => t.current_location)!.current_location!.latitude, tags.find(t => t.current_location)!.current_location!.longitude] as [number, number]
    : defaultCenter

  return (
    <div className="relative">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      
      <MapContainer
        center={mapCenter}
        zoom={selectedTag ? 16 : 10}
        style={{ height, width: '100%' }}
        className="rounded-lg z-0"
        ref={mapRef}
        whenReady={() => setMap(mapRef.current)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Geofences */}
        {geofences.map((geofence) => (
          <Circle
            key={geofence.id}
            center={geofence.center}
            radius={geofence.radius}
            pathOptions={{
              color: geofence.color,
              fillColor: geofence.color,
              fillOpacity: 0.1,
              weight: 2
            }}
          >
            <Popup>
              <div className="text-sm">
                <h3 className="font-semibold">{geofence.name}</h3>
                <p className="text-gray-600">Type: {geofence.type}</p>
                <p className="text-gray-600">Radius: {geofence.radius}m</p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Location History Route */}
        {showRoute && locationHistory.length > 1 && (
          <Polyline
            positions={locationHistory.map(loc => [loc.latitude, loc.longitude])}
            pathOptions={{
              color: '#3B82F6',
              weight: 3,
              opacity: 0.8,
              dashArray: '5, 5'
            }}
          />
        )}

        {/* Tag Markers */}
        {tags.map((tag) => {
          if (!tag.current_location?.latitude || !tag.current_location?.longitude) return null

          const isSelected = selectedTag?.id === tag.id
          const markerIcon = isSelected ? selectedIcon : customIcon

          return (
            <Marker
              key={tag.id}
              position={[tag.current_location.latitude, tag.current_location.longitude]}
              icon={markerIcon}
              eventHandlers={{
                click: () => onTagClick?.(tag)
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{tag.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tag.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {tag.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-gray-700">
                        {tag.current_location.latitude.toFixed(6)}, {tag.current_location.longitude.toFixed(6)}
                      </span>
                    </div>
                    
                    {tag.current_location.battery_level !== null && (
                      <div className="flex items-center">
                        <Battery className="h-4 w-4 mr-2 text-gray-500" />
                        <span className={`font-medium ${
                          (tag.current_location.battery_level ?? 0) > 20 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {tag.current_location.battery_level}%
                        </span>
                      </div>
                    )}
                    
                    {tag.current_location.signal_strength && (
                      <div className="flex items-center">
                        <Signal className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-700">{tag.current_location.signal_strength} dBm</span>
                      </div>
                    )}
                    
                    {tag.current_location.timestamp && (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-700">{formatTimestamp(tag.current_location.timestamp)}</span>
                      </div>
                    )}
                    
                    {tag.current_location.accuracy && (
                      <div className="text-xs text-gray-500">
                        Accuracy: ±{tag.current_location.accuracy}m
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 pt-2 border-t">
                    <button
                      onClick={() => onTagClick?.(tag)}
                      className="w-full bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Historical Location Markers */}
        {showRoute && locationHistory.slice(1).map((location, index) => (
          <Marker
            key={`history-${index}`}
            position={[location.latitude, location.longitude]}
            icon={customIcon}
            opacity={0.6}
          >
            <Popup>
              <div className="text-sm">
                <h4 className="font-semibold">Historical Location</h4>
                <p className="text-gray-600">
                  {location.timestamp ? formatTimestamp(location.timestamp) : 'Unknown time'}
                </p>
                {location.battery_level && (
                  <p className="text-gray-600">Battery: {location.battery_level}%</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Controls */}
      <div className="absolute top-2 right-2 z-[1000] space-y-2">
        {realTimeUpdates && (
          <div className="bg-white rounded-lg shadow-lg p-2 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
            <span className="text-xs font-medium text-gray-700">Live</span>
          </div>
        )}
        
        {selectedTag && (
          <div className="bg-white rounded-lg shadow-lg p-2">
            <div className="text-xs font-medium text-gray-700">{selectedTag.name}</div>
            <div className="text-xs text-gray-500">
              Battery: {selectedTag.current_location?.battery_level ?? '--'}%
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {tags.length > 1 && (
        <div className="absolute bottom-2 left-2 z-[1000] bg-white rounded-lg shadow-lg p-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Legend</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span>Active Tag</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span>Selected Tag</span>
            </div>
            {showRoute && (
              <div className="flex items-center">
                <div className="w-4 h-1 bg-blue-500 mr-2" style={{ borderStyle: 'dashed' }}></div>
                <span>Route History</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 