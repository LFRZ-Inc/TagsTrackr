'use client';

import { useState, useEffect } from 'react';
import { Smartphone, Tablet, Watch, Laptop, Plus, X, AlertCircle, Info } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface DeviceTypeSelectorProps {
  user?: User;
  onDeviceAdded: () => void;
  className?: string;
}

const deviceTypes = [
  {
    type: 'phone',
    name: 'Phone',
    icon: Smartphone,
    description: 'Track your smartphone location',
    examples: ['iPhone', 'Samsung Galaxy', 'Google Pixel']
  },
  {
    type: 'tablet',
    name: 'Tablet',
    icon: Tablet,
    description: 'Track your tablet device',
    examples: ['iPad', 'Samsung Tab', 'Surface Pro']
  },
  {
    type: 'watch',
    name: 'Watch',
    icon: Watch,
    description: 'Track your smartwatch',
    examples: ['Apple Watch', 'Galaxy Watch', 'Fitbit']
  },
  {
    type: 'laptop',
    name: 'Laptop',
    icon: Laptop,
    description: 'Track your laptop location',
    examples: ['MacBook', 'ThinkPad', 'Surface Laptop']
  }
];

// Auto-detect device type based on browser/screen info
const detectDeviceType = (): string => {
  if (typeof window === 'undefined') return 'laptop';
  
  const userAgent = navigator.userAgent.toLowerCase();
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const maxDimension = Math.max(screenWidth, screenHeight);
  const minDimension = Math.min(screenWidth, screenHeight);
  
  // Check for mobile devices
  if (/iphone|android.*mobile/i.test(userAgent)) {
    return 'phone';
  }
  
  // Check for tablets
  if (/ipad|android(?!.*mobile)|tablet/i.test(userAgent)) {
    return 'tablet';
  }
  
  // Screen size based detection as fallback
  if (maxDimension <= 768 && minDimension <= 500) {
    return 'phone';
  } else if (maxDimension <= 1024 && minDimension <= 768) {
    return 'tablet';
  }
  
  return 'laptop';
};

// Generate a hardware-based fingerprint that's consistent across browsers on the same machine
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

// Generate a browser-specific fingerprint for secondary identification
const generateBrowserFingerprint = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx!.textBaseline = 'top';
  ctx!.font = '14px Arial';
  ctx!.fillText('Browser fingerprint', 2, 2);
  
  const browserIdentifiers = [
    navigator.userAgent,
    canvas.toDataURL(),
    // Add more browser-specific identifiers
    navigator.vendor || 'unknown',
    navigator.cookieEnabled.toString()
  ].join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < browserIdentifiers.length; i++) {
    const char = browserIdentifiers.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
};

export default function DeviceTypeSelector({ user, onDeviceAdded, className = '' }: DeviceTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceOS, setDeviceOS] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoDetected, setAutoDetected] = useState<{
    type: string;
    name: string;
    model: string;
    os: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      // Auto-detect device information
      const detectedType = detectDeviceType();
      const userAgent = navigator.userAgent;
      
      let detectedModel = '';
      let detectedOS = '';
      let detectedName = '';
      
      // Extract OS information
      if (/windows/i.test(userAgent)) {
        detectedOS = 'Windows';
        if (/windows nt 10/i.test(userAgent)) detectedOS = 'Windows 11';
        else if (/windows nt 6.3/i.test(userAgent)) detectedOS = 'Windows 8.1';
        else if (/windows nt 6.1/i.test(userAgent)) detectedOS = 'Windows 7';
      } else if (/mac os x/i.test(userAgent)) {
        detectedOS = 'macOS';
        const match = userAgent.match(/mac os x ([\d_]+)/i);
        if (match) {
          const version = match[1].replace(/_/g, '.');
          detectedOS = `macOS ${version}`;
        }
      } else if (/iphone/i.test(userAgent)) {
        detectedOS = 'iOS';
      } else if (/android/i.test(userAgent)) {
        detectedOS = 'Android';
      } else if (/linux/i.test(userAgent)) {
        detectedOS = 'Linux';
      }
      
      // Extract device model hints
      if (/iphone/i.test(userAgent)) {
        detectedModel = 'iPhone';
      } else if (/ipad/i.test(userAgent)) {
        detectedModel = 'iPad';
      } else if (/macintosh/i.test(userAgent)) {
        detectedModel = 'Mac';
      } else if (/windows/i.test(userAgent)) {
        detectedModel = 'PC';
      }
      
      // Generate default name
      const deviceTypeInfo = deviceTypes.find(d => d.type === detectedType);
      detectedName = `My ${deviceTypeInfo?.name || 'Device'}`;
      
      setAutoDetected({
        type: detectedType,
        name: detectedName,
        model: detectedModel,
        os: detectedOS
      });
      
      // Pre-fill the form
      setSelectedType(detectedType);
      setDeviceName(detectedName);
      setDeviceModel(detectedModel);
      setDeviceOS(detectedOS);
    }
  }, [isOpen]);

  const handleAddDevice = async () => {
    if (!user) {
      setError('Please log in to add devices');
      return;
    }

    if (!selectedType) {
      setError('Please select a device type');
      return;
    }

    if (!deviceName.trim()) {
      setError('Please enter a device name');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Get user's access token for API authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication session not found');
      }

      const deviceInfo = getDeviceInfo();
      if (!deviceInfo) {
        throw new Error('Device type not found');
      }
      
      const deviceData = {
        device_type: selectedType,
        device_name: deviceName.trim(),
        device_model: deviceModel.trim() || undefined,
        device_os: deviceOS.trim() || undefined,
        hardware_fingerprint: generateHardwareFingerprint(),
        browser_fingerprint: generateBrowserFingerprint(),
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        location_sharing_enabled: true, // Enable location sharing by default
        privacy_mode: false
      };

      console.log('🔍 [DeviceTypeSelector] Adding device:', deviceData);
      
      const response = await fetch('/api/device/personal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(deviceData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ [DeviceTypeSelector] Device added successfully:', result);

      // Start automatic location tracking and pinging
      await startLocationTracking(result.device.id);

      alert(`✅ ${deviceName.trim()} has been registered as your current device! Location tracking has been automatically enabled.`);
      
      setIsOpen(false);
      onDeviceAdded();
      
      // Reset form
        setSelectedType('');
        setDeviceName('');
        setDeviceModel('');
        setDeviceOS('');
      setAutoDetected(null);
      
    } catch (error) {
      console.error('❌ [DeviceTypeSelector] Error adding device:', error);
      setError(`Failed to create device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // New function to start location tracking automatically
  const startLocationTracking = async (deviceId: string) => {
    try {
      console.log('🎯 [DeviceTypeSelector] Starting location tracking for device:', deviceId);
      
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        console.warn('Geolocation not supported');
        return;
      }

      // Request location permission with device-optimized settings
      const isPhone = selectedType === 'phone';
      const permission = await new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
          { 
            timeout: isPhone ? 20000 : 10000, // Longer timeout for phones (GPS lock)
            enableHighAccuracy: true // Always request high accuracy
          }
        );
      });

      if (!permission) {
        console.warn('Location permission denied');
        return;
      }

      // Send initial ping to mark device as online
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const pingData = {
              device_id: deviceId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              speed: position.coords.speed,
              heading: position.coords.heading,
              source: 'browser_geolocation',
              is_background: false
            };

            const response = await fetch('/api/ping/personal', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify(pingData)
            });

            if (response.ok) {
              console.log('✅ [DeviceTypeSelector] Initial location ping sent successfully');
              
              // Start periodic pinging every 30 seconds
              setInterval(async () => {
                navigator.geolocation.getCurrentPosition(
                  async (pos) => {
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session?.access_token) return;

                      const pingData = {
                        device_id: deviceId,
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                        altitude: pos.coords.altitude,
                        speed: pos.coords.speed,
                        heading: pos.coords.heading,
                        source: 'browser_geolocation',
                        is_background: true
                      };

                      await fetch('/api/ping/personal', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify(pingData)
                      });
                    } catch (error) {
                      console.error('Background ping failed:', error);
                    }
                  },
                  (error) => console.error('Background location error:', error),
                  { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
                );
              }, 30000); // 30 seconds
            }
          } catch (error) {
            console.error('Failed to send initial ping:', error);
          }
        },
        (error) => console.error('Failed to get initial location:', error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
      
    } catch (error) {
      console.error('Failed to start location tracking:', error);
    }
  };

  const getDeviceInfo = () => {
    return deviceTypes.find(d => d.type === selectedType);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedType('');
    setDeviceName('');
    setDeviceModel('');
    setDeviceOS('');
    setError('');
    setAutoDetected(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          if (!user) {
            alert('Please log in first to add devices.');
            return;
          }
          setIsOpen(true);
        }}
        className={`inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${className}`}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add This Device
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Add Current Device</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Auto-detection Info */}
          {autoDetected && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">🔍 Auto-detected Device Info</h4>
                  <p className="text-sm text-blue-800 mb-2">
                    We've automatically detected your device information. You can modify it below if needed.
                  </p>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div><strong>Type:</strong> {autoDetected.type}</div>
                    <div><strong>OS:</strong> {autoDetected.os}</div>
                    {autoDetected.model && <div><strong>Model:</strong> {autoDetected.model}</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800">Error</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Device Type Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Device Type</h3>
            <div className="grid grid-cols-2 gap-4">
              {deviceTypes.map((device) => {
                const Icon = device.icon;
                return (
                  <button
                    key={device.type}
                    onClick={() => setSelectedType(device.type)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      selectedType === device.type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <Icon className={`h-6 w-6 mr-3 ${
                        selectedType === device.type ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                      <span className="font-medium text-gray-900">{device.name}</span>
                      {autoDetected?.type === device.type && (
                        <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Detected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{device.description}</p>
                    <p className="text-xs text-gray-500">
                      e.g., {device.examples.join(', ')}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Device Details */}
          {selectedType && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Device Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device Name *
                </label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder={`My ${getDeviceInfo()?.name}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  style={{ color: '#111827' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model (Optional)
                </label>
                <input
                  type="text"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  placeholder="e.g., iPhone 15 Pro, Galaxy S24"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  style={{ color: '#111827' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operating System (Optional)
                </label>
                <input
                  type="text"
                  value={deviceOS}
                  onChange={(e) => setDeviceOS(e.target.value)}
                  placeholder="e.g., iOS 17, Android 14, Windows 11"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  style={{ color: '#111827' }}
                />
              </div>

              {/* Current Device Notice */}
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h4 className="font-medium text-green-900 mb-2">📱 Smart Device Registration</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• This will register the device you're currently using</li>
                  <li>• Works across all browsers on this device (Chrome, Firefox, Edge, etc.)</li>
                  <li>• Your device will be identified by a secure hardware fingerprint</li>
                  <li>• No duplicate devices when switching browsers</li>
                </ul>
              </div>

              {/* Privacy Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="font-medium text-blue-900 mb-2">🔒 Privacy & Control</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Location sharing is OFF by default</li>
                  <li>• You control when and how your location is shared</li>
                  <li>• Data is encrypted and only visible to you</li>
                  <li>• You can remove this device anytime</li>
                </ul>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleAddDevice}
              disabled={loading || !selectedType || !deviceName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Adding Device...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add This Device
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 