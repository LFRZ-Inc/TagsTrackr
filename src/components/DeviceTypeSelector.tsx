'use client';

import { useState } from 'react';
import { Smartphone, Tablet, Watch, Laptop, Plus, X, AlertCircle } from 'lucide-react';

interface DeviceTypeSelectorProps {
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

export default function DeviceTypeSelector({ onDeviceAdded, className = '' }: DeviceTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [deviceName, setDeviceName] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceOS, setDeviceOS] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleAddDevice = async () => {
    if (!selectedType || !deviceName.trim()) {
      setError('Please select a device type and enter a name');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/device/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_type: selectedType,
          device_name: deviceName.trim(),
          device_model: deviceModel.trim() || undefined,
          device_os: deviceOS.trim() || undefined
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Success - close modal and reset form
        setIsOpen(false);
        setSelectedType('');
        setDeviceName('');
        setDeviceModel('');
        setDeviceOS('');
        setError('');
        onDeviceAdded();
        
        // Show success message
        alert(`✅ ${deviceName} has been added successfully!\n\nNote: Location sharing is disabled by default. You can enable it from the dashboard when ready.`);
      } else {
        if (response.status === 401) {
          setError('Please log in to add devices');
        } else {
          setError(data.error || 'Failed to add device. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error adding device:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
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
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${className}`}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Personal Device
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Add Personal Device</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Device Type</h3>
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
                  style={{ color: '#111827' }} // Explicit dark text color
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
                  style={{ color: '#111827' }} // Explicit dark text color
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
                  style={{ color: '#111827' }} // Explicit dark text color
                />
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

              {/* Location Permission Info */}
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <h4 className="font-medium text-amber-900 mb-2">📍 Location Sharing</h4>
                <p className="text-sm text-amber-800">
                  To enable location tracking for this device, you'll need to grant location permission in your browser. 
                  This will be requested when you turn on location sharing from the dashboard.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddDevice}
            disabled={!selectedType || !deviceName.trim() || loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Adding...' : 'Add Device'}
          </button>
        </div>
      </div>
    </div>
  );
} 