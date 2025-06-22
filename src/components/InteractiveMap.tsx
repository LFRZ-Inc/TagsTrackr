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
  devices: Device[]
  selectedDevice?: Device | null
  locationHistory?: MapLocation[]
  geofences?: Geofence[]
  height?: string
  onDeviceSelect?: (device: Device) => void
  showRoute?: boolean
  autoCenter?: boolean
  realTimeUpdates?: boolean
}

export default function InteractiveMap({
  devices,
  selectedDevice,
  locationHistory = [],
  geofences = [],
  height = '400px',
  onDeviceSelect,
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
        
        // Create custom div icons (no need for external image files)
        const getDeviceIcon = (deviceType: string, isSelected: boolean = false) => {
          const size = isSelected ? 40 : 32
          const bgColor = isSelected ? 'bg-red-500' : getDeviceColor(deviceType)
          const pulseClass = isSelected ? 'animate-pulse' : ''
          
          return L.divIcon({
            html: `
              <div class="relative">
                <div class="w-${size/4} h-${size/4} ${bgColor} rounded-full border-2 border-white shadow-lg flex items-center justify-center ${pulseClass}">
                  ${getDeviceIconSvg(deviceType)}
                </div>
                ${isSelected ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white animate-ping"></div>' : ''}
              </div>
            `,
            className: 'custom-marker',
            iconSize: [size, size],
            iconAnchor: [size/2, size],
            popupAnchor: [0, -size]
          })
        }

        const getDeviceColor = (deviceType: string) => {
          switch (deviceType) {
            case 'gps_tag': return 'bg-blue-500'
            case 'phone': return 'bg-green-500'
            case 'tablet': return 'bg-purple-500'
            case 'watch': return 'bg-orange-500'
            case 'laptop': return 'bg-gray-600'
            default: return 'bg-blue-500'
          }
        }

        const getDeviceIconSvg = (deviceType: string) => {
          const iconClass = "w-4 h-4 fill-white"
          switch (deviceType) {
            case 'phone':
              return `<svg class="${iconClass}" viewBox="0 0 24 24"><path d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H7V6h10v10z"/></svg>`
            case 'tablet':
              return `<svg class="${iconClass}" viewBox="0 0 24 24"><path d="M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 12H3V6h18v10z"/></svg>`
            case 'watch':
              return `<svg class="${iconClass}" viewBox="0 0 24 24"><path d="M20 12c0-2.54-1.19-4.81-3.04-6.27L16 0H8l-.95 5.73C5.19 7.19 4 9.46 4 12s1.19 4.81 3.05 6.27L8 24h8l.96-5.73C18.81 16.81 20 14.54 20 12zM6 12c0-3.31 2.69-6 6-6s6 2.69 6 6-2.69 6-6 6-6-2.69-6-6z"/></svg>`
            case 'laptop':
              return `<svg class="${iconClass}" viewBox="0 0 24 24"><path d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></svg>`
            default: // gps_tag
              return `<svg class="${iconClass}" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`
          }
        }

        setCustomIcon(getDeviceIcon)
        setSelectedIcon(getDeviceIcon)
      })
    }
  }, [])

  // Auto-center map when devices change
  useEffect(() => {
    if (map && autoCenter && devices.length > 0 && leafletLoaded) {
      const validLocations = devices
        .filter(device => device.current_location?.latitude && device.current_location?.longitude)
        .map(device => [device.current_location!.latitude, device.current_location!.longitude])

      if (validLocations.length > 0) {
        if (validLocations.length === 1) {
          map.setView(validLocations[0], 15)
        } else {
          map.fitBounds(validLocations, { padding: [20, 20] })
        }
      }
    }
  }, [map, devices, autoCenter, leafletLoaded])

  // Focus on selected device
  useEffect(() => {
    if (map && selectedDevice?.current_location && leafletLoaded) {
      const { latitude, longitude } = selectedDevice.current_location
      map.setView([latitude, longitude], 16, { animate: true })
    }
  }, [map, selectedDevice, leafletLoaded])

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

  // Default center (somewhere in the US if no devices)
  const defaultCenter: [number, number] = [39.8283, -98.5795]
  const mapCenter = selectedDevice?.current_location 
    ? [selectedDevice.current_location.latitude, selectedDevice.current_location.longitude] as [number, number]
    : devices.find(d => d.current_location)?.current_location
    ? [devices.find(d => d.current_location)!.current_location!.latitude, devices.find(d => d.current_location)!.current_location!.longitude] as [number, number]
    : defaultCenter

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-lg" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={devices.length > 0 ? 13 : 4}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        whenReady={() => setMap(mapRef.current)}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Render device markers */}
        {devices.map((device) => {
          if (!device.current_location?.latitude || !device.current_location?.longitude) return null
          
          const isSelected = selectedDevice?.id === device.id
          const icon = customIcon ? customIcon(device.device_type, isSelected) : undefined

          return (
            <Marker
              key={device.id}
              position={[device.current_location.latitude, device.current_location.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onDeviceSelect?.(device)
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">
                      {device.device_name}
                    </h3>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Type:</span>
                      <span className="capitalize">{device.device_type.replace('_', ' ')}</span>
                    </div>
                    
                    {device.battery_level && (
                      <div className="flex items-center gap-1">
                        <Battery className="h-3 w-3" />
                        <span>{device.battery_level}%</span>
                      </div>
                    )}
                    
                    {device.last_seen_at && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimestamp(device.last_seen_at)}</span>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-2">
                      <div>Lat: {device.current_location.latitude.toFixed(6)}</div>
                      <div>Lng: {device.current_location.longitude.toFixed(6)}</div>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Render route if enabled */}
        {showRoute && locationHistory.length > 1 && (
          <Polyline
            positions={locationHistory.map(loc => [loc.latitude, loc.longitude])}
            color="blue"
            weight={3}
            opacity={0.7}
          />
        )}

        {/* Render geofences */}
        {geofences.map((geofence) => (
          <Circle
            key={geofence.id}
            center={geofence.center}
            radius={geofence.radius}
            color={geofence.color}
            fillColor={geofence.color}
            fillOpacity={0.2}
          />
        ))}
      </MapContainer>
    </div>
  )
} 