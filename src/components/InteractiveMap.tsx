'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Battery, Signal, Clock, Map, Satellite, Mountain, RefreshCw, Target, Ruler } from 'lucide-react'

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
  onRefresh?: () => void
  showAccuracyCircles?: boolean
  enableGeocoding?: boolean
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
  realTimeUpdates = false,
  onRefresh,
  showAccuracyCircles = true,
  enableGeocoding = true
}: InteractiveMapProps) {
  const [map, setMap] = useState<any>(null)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [customIcon, setCustomIcon] = useState<any>(null)
  const [selectedIcon, setSelectedIcon] = useState<any>(null)
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite' | 'terrain'>('street')
  const [showControls, setShowControls] = useState(true)
  const [deviceAddresses, setDeviceAddresses] = useState<Record<string, string>>({})
  const [refreshing, setRefreshing] = useState(false)
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

  // Geocoding function to get address from coordinates
  const getAddressFromCoordinates = async (lat: number, lng: number, deviceId: string) => {
    if (!enableGeocoding) return
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      )
      const data = await response.json()
      
      if (data.display_name) {
        setDeviceAddresses(prev => ({
          ...prev,
          [deviceId]: data.display_name
        }))
      }
    } catch (error) {
      console.error('Geocoding error:', error)
    }
  }

  // Update addresses when devices change
  useEffect(() => {
    if (enableGeocoding) {
      devices.forEach(device => {
        if (device.current_location?.latitude && device.current_location?.longitude) {
          if (!deviceAddresses[device.id]) {
            getAddressFromCoordinates(
              device.current_location.latitude,
              device.current_location.longitude,
              device.id
            )
          }
        }
      })
    }
  }, [devices, enableGeocoding])

  // Handle refresh
  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
      }
    }
  }

  // Get tile layer URL based on map style
  const getTileLayerUrl = () => {
    switch (mapStyle) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      case 'terrain':
        return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    }
  }

  // Get tile layer attribution based on map style
  const getTileLayerAttribution = () => {
    switch (mapStyle) {
      case 'satellite':
        return '&copy; <a href="https://www.esri.com/">Esri</a>'
      case 'terrain':
        return '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors'
      default:
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
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
    <div className="w-full h-full rounded-lg overflow-hidden shadow-lg relative" style={{ height }}>
      {/* Map Controls */}
      {showControls && (
        <div className="absolute top-4 left-4 z-[1000] space-y-2">
          {/* Map Style Switcher */}
          <div className="bg-white rounded-lg shadow-lg p-2">
            <div className="flex space-x-1">
              <button
                onClick={() => setMapStyle('street')}
                className={`p-2 rounded ${mapStyle === 'street' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Street Map"
              >
                <Map className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMapStyle('satellite')}
                className={`p-2 rounded ${mapStyle === 'satellite' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Satellite View"
              >
                <Satellite className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMapStyle('terrain')}
                className={`p-2 rounded ${mapStyle === 'terrain' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Terrain Map"
              >
                <Mountain className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <div className="bg-white rounded-lg shadow-lg p-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                title="Refresh Device Locations"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Real-time Updates Indicator */}
      {realTimeUpdates && (
        <div className="absolute top-4 right-4 z-[1000]">
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Live Updates
          </div>
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={devices.length > 0 ? 13 : 4}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        whenReady={() => setMap(mapRef.current)}
      >
        <TileLayer
          url={getTileLayerUrl()}
          attribution={getTileLayerAttribution()}
        />

        {/* Render device markers */}
        {(devices || []).map((device) => {
          if (!device.current_location?.latitude || !device.current_location?.longitude) return null
          
          const isSelected = selectedDevice?.id === device.id
          const icon = customIcon ? customIcon(device.device_type, isSelected) : undefined
          const position: [number, number] = [device.current_location.latitude, device.current_location.longitude]
          const accuracy = device.current_location.accuracy || 0

          return (
            <div key={device.id}>
              {/* Accuracy Circle */}
              {showAccuracyCircles && accuracy > 0 && (
                <Circle
                  center={position}
                  radius={accuracy}
                  color="#3b82f6"
                  fillColor="#3b82f6"
                  fillOpacity={0.1}
                  weight={1}
                />
              )}

              {/* Device Marker */}
            <Marker
                position={position}
              icon={icon}
              eventHandlers={{
                  click: () => onDeviceSelect?.(device)
              }}
            >
              <Popup>
                  <div className="p-3 min-w-[250px]">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {device.device_name}
                    </h3>
                      <div className={`w-3 h-3 rounded-full ${device.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">Type:</span>
                        <span className="capitalize text-gray-600">{device.device_type.replace('_', ' ')}</span>
                      </div>
                      
                      {device.battery_level !== null && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">Battery:</span>
                          <div className="flex items-center gap-1 text-gray-600">
                        <Battery className="h-3 w-3" />
                            <span>{device.battery_level}%</span>
                          </div>
                      </div>
                    )}
                    
                      {device.last_seen_at && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">Last Seen:</span>
                          <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="h-3 w-3" />
                            <span>{formatTimestamp(device.last_seen_at)}</span>
                          </div>
                        </div>
                      )}

                      {accuracy > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">Accuracy:</span>
                          <span className="text-gray-600">±{Math.round(accuracy)}m</span>
                      </div>
                    )}
                    
                      <div className="border-t pt-2 mt-3">
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>Coordinates: {device.current_location.latitude.toFixed(6)}, {device.current_location.longitude.toFixed(6)}</div>
                          {deviceAddresses[device.id] && (
                            <div className="mt-2">
                              <span className="font-medium text-gray-700">Address:</span>
                              <div className="text-gray-600 mt-1">{deviceAddresses[device.id]}</div>
                            </div>
                          )}
                        </div>
                      </div>
                  </div>
                </div>
              </Popup>
            </Marker>
            </div>
          )
        })}

        {/* Render route if enabled */}
        {showRoute && locationHistory.length > 1 && (
          <Polyline
            positions={(locationHistory || []).map(loc => [loc.latitude, loc.longitude])}
            color="blue"
            weight={3}
            opacity={0.7}
          />
        )}

        {/* Render geofences */}
        {(geofences || []).map((geofence) => (
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