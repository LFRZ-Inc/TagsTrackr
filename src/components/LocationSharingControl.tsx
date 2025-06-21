'use client';

import { useState, useEffect } from 'react';
import { MapPin, Smartphone, Tablet, Watch, Laptop, ToggleLeft, ToggleRight, AlertCircle, CheckCircle } from 'lucide-react';

interface Device {
  id: string;
  tag_id: string;
  name?: string;
  type: string;
  device_type: string;
  device_model?: string;
  device_os?: string;
  description: string | null;
  is_active: boolean | null;
  battery_level: number | null;
  last_seen_at: string | null;
  last_ping_at?: string | null;
  group_name: string | null;
  sharing_enabled?: boolean;
  location_sharing_active?: boolean;
  current_location?: {
    latitude: number;
    longitude: number;
  };
}

interface LocationSharingControlProps {
  devices: Device[];
  onDeviceUpdate: () => void;
}

const getDeviceIcon = (deviceType: string) => {
  switch (deviceType) {
    case 'phone': return Smartphone;
    case 'tablet': return Tablet;
    case 'watch': return Watch;
    case 'laptop': return Laptop;
    default: return MapPin;
  }
};

export default function LocationSharingControl({ devices, onDeviceUpdate }: LocationSharingControlProps) {
  const [sharingStates, setSharingStates] = useState<Record<string, boolean>>({});
  const [locationWatchers, setLocationWatchers] = useState<Record<string, number>>({});
  const [locationSupported, setLocationSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  const personalDevices = devices.filter(d => ['phone', 'tablet', 'watch', 'laptop'].includes(d.device_type));

  useEffect(() => {
    // Check if geolocation is supported
    setLocationSupported('geolocation' in navigator);
    
    // Check current permission status
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionStatus(result.state);
      });
    }

    // Initialize sharing states
    const states: Record<string, boolean> = {};
    personalDevices.forEach(device => {
      states[device.id] = device.location_sharing_active || false;
    });
    setSharingStates(states);
  }, [devices]);

  const requestLocationPermission = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setPermissionStatus('granted');
          resolve(true);
        },
        (error) => {
          console.error('Location permission denied:', error);
          setPermissionStatus('denied');
          resolve(false);
        },
        { timeout: 10000 }
      );
    });
  };

  const startLocationSharing = async (deviceId: string) => {
    if (!locationSupported) {
      alert('Geolocation is not supported by this browser');
      return;
    }

    // Request permission if needed
    if (permissionStatus !== 'granted') {
      const granted = await requestLocationPermission();
      if (!granted) {
        alert('Location permission is required to share your location');
        return;
      }
    }

    // Start watching position
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
        
        try {
          await fetch('/api/ping/personal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              device_id: deviceId,
              latitude,
              longitude,
              accuracy,
              altitude,
              speed,
              heading,
              source: 'browser_geolocation',
              is_background: false
            })
          });
        } catch (error) {
          console.error('Error sending location ping:', error);
        }
      },
      (error) => {
        console.error('Location error:', error);
        handleToggleSharing(deviceId, false);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000 // 1 minute
      }
    );

    setLocationWatchers(prev => ({ ...prev, [deviceId]: watchId }));
  };

  const stopLocationSharing = (deviceId: string) => {
    const watchId = locationWatchers[deviceId];
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setLocationWatchers(prev => {
        const newWatchers = { ...prev };
        delete newWatchers[deviceId];
        return newWatchers;
      });
    }
  };

  const handleToggleSharing = async (deviceId: string, enabled: boolean) => {
    try {
      // Update server state
      const response = await fetch('/api/device/personal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          location_sharing_enabled: enabled
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Update local state
        setSharingStates(prev => ({ ...prev, [deviceId]: enabled }));
        
        // Start/stop location tracking
        if (enabled) {
          await startLocationSharing(deviceId);
        } else {
          stopLocationSharing(deviceId);
        }
        
        onDeviceUpdate();
      } else {
        alert(data.error || 'Failed to update sharing settings');
      }
    } catch (error) {
      console.error('Error toggling location sharing:', error);
      alert('Failed to update sharing settings');
    }
  };

  const formatLastSeen = (lastPingAt?: string) => {
    if (!lastPingAt) return 'Never';
    const diff = Date.now() - new Date(lastPingAt).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (personalDevices.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Personal Device Tracking</h3>
        {!locationSupported && (
          <div className="flex items-center text-orange-600">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span className="text-sm">Location not supported</span>
          </div>
        )}
      </div>

      {/* Permission Status */}
      {locationSupported && permissionStatus !== 'granted' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Location Permission Required</p>
              <p className="text-xs text-yellow-700">
                Allow location access to enable device tracking from this browser
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {personalDevices.map((device) => {
          const DeviceIcon = getDeviceIcon(device.device_type);
          const isSharing = sharingStates[device.id] || false;
          const isWatching = !!locationWatchers[device.id];

          return (
            <div key={device.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${
                  isSharing ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <DeviceIcon className={`h-5 w-5 ${
                    isSharing ? 'text-green-600' : 'text-gray-600'
                  }`} />
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">{device.tag_id}</h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    {device.device_model && (
                      <span>{device.device_model}</span>
                    )}
                    {device.device_os && (
                      <span>• {device.device_os}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Last seen: {formatLastSeen(device.last_ping_at || device.last_seen_at || undefined)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {isWatching && (
                  <div className="flex items-center text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    <span className="text-xs font-medium">Tracking</span>
                  </div>
                )}
                
                <button
                  onClick={() => handleToggleSharing(device.id, !isSharing)}
                  disabled={!locationSupported || permissionStatus === 'denied'}
                  className="flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSharing ? (
                    <ToggleRight className="h-6 w-6 text-green-600" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-gray-400" />
                  )}
                  <span className={`text-sm font-medium ${
                    isSharing ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {isSharing ? 'Sharing' : 'Off'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-start">
          <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="space-y-1 text-xs">
              <li>• Toggle sharing to start sending your location every few minutes</li>
              <li>• Your location is only shared when you explicitly enable it</li>
              <li>• Works in the background while your browser is open</li>
              <li>• All data is encrypted and private to your account</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 