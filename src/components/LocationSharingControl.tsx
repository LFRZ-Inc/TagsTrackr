'use client';

import { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Tablet, 
  Watch, 
  Laptop, 
  MapPin, 
  MapPinOff, 
  AlertCircle, 
  Info,
  Activity,
  Clock
} from 'lucide-react';

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
  location_sharing_enabled?: boolean;
  hardware_fingerprint?: string;
  is_current_device?: boolean;
  current_location?: {
    latitude: number;
    longitude: number;
  };
}

interface LocationSharingControlProps {
  devices: Device[];
  onDeviceUpdate: () => void;
}

// Generate the same hardware fingerprint as in DeviceTypeSelector
const generateHardwareFingerprint = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  
  // Use hardware/system identifiers that are consistent across browsers
  const hardwareIdentifiers = [
    // Screen resolution (consistent across browsers)
    `${screen.width}x${screen.height}`,
    `${screen.availWidth}x${screen.availHeight}`,
    
    // Hardware concurrency (CPU cores)
    navigator.hardwareConcurrency || 'unknown',
    
    // Platform (OS)
    navigator.platform,
    
    // Timezone (consistent on same machine)
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    
    // Language (usually consistent)
    navigator.language,
    
    // Memory (if available)
    (navigator as any).deviceMemory || 'unknown'
  ].join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < hardwareIdentifiers.length; i++) {
    const char = hardwareIdentifiers.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
};

const getDeviceIcon = (deviceType: string) => {
  switch (deviceType) {
    case 'phone': return Smartphone;
    case 'tablet': return Tablet;
    case 'watch': return Watch;
    case 'laptop': return Laptop;
    default: return Smartphone;
  }
};

export default function LocationSharingControl({ devices, onDeviceUpdate }: LocationSharingControlProps) {
  const [locationSupported, setLocationSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(false);

  // Find current device based on browser fingerprint or localStorage
  useEffect(() => {
    const findCurrentDevice = async () => {
      // Try localStorage first
      const storedDeviceId = localStorage.getItem('tagstrackr_current_device_id');
      const storedFingerprint = localStorage.getItem('tagstrackr_device_fingerprint');
      
      if (storedDeviceId) {
        const device = devices.find(d => d.id === storedDeviceId);
        if (device) {
          setCurrentDevice(device);
          setIsSharing(device.location_sharing_enabled || false);
          return;
        }
      }

      // Try hardware fingerprint
      const hardwareFingerprint = generateHardwareFingerprint();
      const device = devices.find(d => d.hardware_fingerprint === hardwareFingerprint);
      
      if (device) {
        setCurrentDevice(device);
        setIsSharing(device.location_sharing_enabled || false);
        // Store in localStorage for faster lookup next time
        localStorage.setItem('tagstrackr_current_device_id', device.id);
        localStorage.setItem('tagstrackr_device_hardware_fingerprint', hardwareFingerprint);
      } else if (devices.length > 0) {
        // If no exact match, check if there's only one device of the same type
        const browserDeviceType = detectDeviceType();
        const matchingDevices = devices.filter(d => d.device_type === browserDeviceType);
        
        if (matchingDevices.length === 1) {
          setCurrentDevice(matchingDevices[0]);
          setIsSharing(matchingDevices[0].location_sharing_enabled || false);
        }
      }
    };

    findCurrentDevice();
  }, [devices]);

  // Auto-detect device type (same as DeviceTypeSelector)
  const detectDeviceType = (): string => {
    if (typeof window === 'undefined') return 'laptop';
    
    const userAgent = navigator.userAgent.toLowerCase();
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const maxDimension = Math.max(screenWidth, screenHeight);
    const minDimension = Math.min(screenWidth, screenHeight);
    
    if (/iphone|android.*mobile/i.test(userAgent)) {
      return 'phone';
    }
    
    if (/ipad|android(?!.*mobile)|tablet/i.test(userAgent)) {
      return 'tablet';
    }
    
    if (maxDimension <= 768 && minDimension <= 500) {
      return 'phone';
    } else if (maxDimension <= 1024 && minDimension <= 768) {
      return 'tablet';
    }
    
    return 'laptop';
  };

  useEffect(() => {
    // Check if geolocation is supported
    setLocationSupported('geolocation' in navigator);

    // Check permission status
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionStatus(result.state);
        result.addEventListener('change', () => {
          setPermissionStatus(result.state);
        });
      });
    }
  }, []);

  const getLocationErrorMessage = (error: GeolocationPositionError, deviceType?: string): string => {
    const isPhone = deviceType === 'phone';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return isPhone 
          ? 'Location access denied. Please enable location permissions in your browser settings and ensure GPS is enabled in your device settings.'
          : 'Location access denied. Please enable location permissions in your browser settings.';
      case error.POSITION_UNAVAILABLE:
        return isPhone
          ? 'Location information unavailable. Please check your GPS is enabled and try going outdoors for better signal.'
          : 'Location information unavailable. Please check your GPS/WiFi connection.';
      case error.TIMEOUT:
        return isPhone
          ? 'GPS lock timed out. Try going outdoors or wait a bit longer for GPS signal.'
          : 'Location request timed out. Please try again.';
      default:
        return 'An unknown location error occurred. Please try again.';
    }
  };

  const startLocationSharing = async () => {
    if (!currentDevice) {
      setErrorMessage('No current device found. Please register this device first.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;

        try {
          const response = await fetch('/api/ping/personal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              device_id: currentDevice.id,
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

          if (!response.ok) {
            throw new Error('Failed to send location update');
          }

          // Clear any previous errors on successful ping
          setErrorMessage('');
        } catch (error) {
          console.error('Error sending location ping:', error);
          setErrorMessage('Failed to send location update. Please check your connection.');
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
        const message = getLocationErrorMessage(error, currentDevice?.device_type);
        setErrorMessage(message);
        handleToggleSharing(false);
      },
      {
        enableHighAccuracy: true,
        timeout: currentDevice?.device_type === 'phone' ? 20000 : 30000, // Longer timeout for phones (GPS lock)
        maximumAge: currentDevice?.device_type === 'phone' ? 30000 : 60000 // Fresher data for phones
      }
    );

    setLocationWatchId(watchId);
    setIsWatching(true);
  };

  const stopLocationSharing = () => {
    if (locationWatchId) {
      navigator.geolocation.clearWatch(locationWatchId);
      setLocationWatchId(null);
      setIsWatching(false);
    }
  };

  const handleToggleSharing = async (enabled: boolean) => {
    if (!currentDevice) {
      setErrorMessage('No current device found. Please register this device first.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    
    try {
      // Update server state
      const response = await fetch('/api/device/personal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          device_id: currentDevice.id,
          location_sharing_enabled: enabled
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Update local state
        setIsSharing(enabled);
        
        // Start/stop location tracking
        if (enabled) {
          await startLocationSharing();
        } else {
          stopLocationSharing();
        }
        
        onDeviceUpdate();
      } else {
        setErrorMessage(data.error || 'Failed to update sharing settings');
      }
    } catch (error) {
      console.error('Error toggling location sharing:', error);
      setErrorMessage('Failed to update sharing settings. Please check your connection.');
    } finally {
      setLoading(false);
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

  // Don't show if no current device found
  if (!currentDevice) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Location Sharing</h3>
        </div>
        
        <div className="text-center py-8">
          <MapPinOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Current Device Found</h4>
          <p className="text-gray-600 mb-4">
            To enable location sharing, please register this device first.
          </p>
          <p className="text-sm text-gray-500">
            Click "Add This Device" to register the device you're currently using.
          </p>
        </div>
      </div>
    );
  }

  const DeviceIcon = getDeviceIcon(currentDevice.device_type);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Location Sharing</h3>
        {!locationSupported && (
          <div className="flex items-center text-orange-600">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span className="text-sm">Location not supported</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Location Error</p>
              <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
              {permissionStatus === 'denied' && (
                <div className="mt-2 text-xs text-red-600">
                  <p className="font-medium">To enable location sharing:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Click the location icon in your browser's address bar</li>
                    <li>Select "Allow" for location access</li>
                    <li>Refresh the page and try again</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Permission Status */}
      {locationSupported && permissionStatus !== 'granted' && !errorMessage && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Location Permission Required</p>
              <p className="text-sm text-yellow-700 mt-1">
                Allow location access to enable device tracking from this browser. 
                Your browser will ask for permission when you enable sharing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Device Card */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-full ${
              isSharing ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <DeviceIcon className={`h-6 w-6 ${
                isSharing ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">{currentDevice.tag_id}</h4>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                {currentDevice.device_model && (
                  <span>{currentDevice.device_model}</span>
                )}
                {currentDevice.device_os && (
                  <span>• {currentDevice.device_os}</span>
                )}
              </div>
              <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Last seen: {formatLastSeen(currentDevice.last_ping_at || currentDevice.last_seen_at || undefined)}</span>
                </div>
                {isWatching && (
                  <div className="flex items-center text-green-600">
                    <Activity className="h-3 w-3 mr-1" />
                    <span className="font-medium">Live tracking</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex flex-col items-end space-y-2">
            <button
              onClick={() => handleToggleSharing(!isSharing)}
              disabled={loading || !locationSupported}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isSharing ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isSharing ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            
            <div className="text-center">
              {loading ? (
                <div className="flex items-center text-xs text-gray-500">
                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-1"></div>
                  Updating...
                </div>
              ) : (
                <div className="flex items-center text-xs">
                  {isSharing ? (
                    <>
                      <MapPin className="h-3 w-3 text-green-600 mr-1" />
                      <span className="text-green-600 font-medium">Sharing</span>
                    </>
                  ) : (
                    <>
                      <MapPinOff className="h-3 w-3 text-gray-500 mr-1" />
                      <span className="text-gray-500">Off</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Current Device Info */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center text-xs text-blue-600">
            <Info className="h-3 w-3 mr-1" />
            <span>This is the device you're currently using</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      {!isSharing && locationSupported && (
        <div className="mt-4 space-y-3">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">📍 How Location Sharing Works</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Toggle the switch above to start sharing your location</li>
              <li>• Your browser will ask for location permission</li>
              <li>• Location updates will be sent automatically while enabled</li>
              <li>• You can turn off sharing anytime</li>
            </ul>
          </div>
          
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <h4 className="font-medium text-amber-900 mb-2">⚠️ Background Tracking Limitations</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• <strong>Browser Tab Required:</strong> Keep this browser tab open for continuous tracking</li>
              <li>• <strong>Limited Background:</strong> Web browsers restrict background location access</li>
              <li>• <strong>Battery Optimization:</strong> Your device may pause tracking to save battery</li>
              <li>• <strong>For True Background Tracking:</strong> Consider our upcoming mobile app</li>
            </ul>
          </div>
          
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <h4 className="font-medium text-green-900 mb-2">💡 Tips for Better Tracking</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Pin this tab in your browser to prevent accidental closing</li>
              <li>• Add TagsTrackr to your home screen (mobile) for app-like experience</li>
              <li>• Enable notifications to get reminded to check in</li>
              <li>• Use multiple devices for better family/item coverage</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
} 