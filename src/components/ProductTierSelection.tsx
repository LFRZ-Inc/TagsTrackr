'use client';

import { useState } from 'react';
import { Package, RefreshCw, Shield, Truck, Recycle, Battery } from 'lucide-react';

interface ProductTierProps {
  onSelectTier: (tier: 'standard' | 'returnable', adhesive?: boolean) => void;
  className?: string;
}

export default function ProductTierSelection({ onSelectTier, className = '' }: ProductTierProps) {
  const [selectedTier, setSelectedTier] = useState<'standard' | 'returnable' | null>(null);
  const [adhesiveOption, setAdhesiveOption] = useState(false);

  const handleTierSelect = (tier: 'standard' | 'returnable') => {
    setSelectedTier(tier);
    if (tier === 'returnable') {
      onSelectTier(tier);
    }
  };

  const handleStandardSelect = () => {
    if (selectedTier === 'standard') {
      onSelectTier('standard', adhesiveOption);
    }
  };

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your TagsTrackr Device</h2>
        <p className="text-lg text-gray-600">
          Select the perfect tracking solution for your needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Standard Tag */}
        <div 
          className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
            selectedTier === 'standard' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => handleTierSelect('standard')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Standard Tag</h3>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">$10</div>
              <div className="text-sm text-gray-500">One-time purchase</div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center text-sm text-gray-600">
              <Shield className="h-4 w-4 mr-2 text-green-500" />
              Lifetime ownership
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Battery className="h-4 w-4 mr-2 text-green-500" />
              Rechargeable battery (USB-C or wireless)
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Truck className="h-4 w-4 mr-2 text-green-500" />
              Includes 500MB 1NCE cellular GPS data
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <RefreshCw className="h-4 w-4 mr-2 text-green-500" />
              Unlimited ownership duration
            </div>
          </div>

          {selectedTier === 'standard' && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Choose Form Factor:</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="adhesive"
                    checked={!adhesiveOption}
                    onChange={() => setAdhesiveOption(false)}
                    className="mr-2"
                  />
                  <span className="text-sm">Non-adhesive (portable)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="adhesive"
                    checked={adhesiveOption}
                    onChange={() => setAdhesiveOption(true)}
                    className="mr-2"
                  />
                  <span className="text-sm">Adhesive mount (permanent)</span>
                </label>
              </div>
              <button
                onClick={handleStandardSelect}
                className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Select Standard Tag - $10
              </button>
            </div>
          )}
        </div>

        {/* Returnable Tag */}
        <div 
          className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
            selectedTier === 'returnable' 
              ? 'border-orange-500 bg-orange-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => handleTierSelect('returnable')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Recycle className="h-8 w-8 text-orange-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Returnable Tag</h3>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">$15</div>
              <div className="text-sm text-gray-500">$5 refund when returned</div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center text-sm text-gray-600">
              <RefreshCw className="h-4 w-4 mr-2 text-green-500" />
              Rental-style device
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Battery className="h-4 w-4 mr-2 text-green-500" />
              Rechargeable or swappable battery
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Truck className="h-4 w-4 mr-2 text-green-500" />
              Includes 500MB 1NCE GPS data
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Recycle className="h-4 w-4 mr-2 text-green-500" />
              Can be recycled/repaired/reflashed
            </div>
          </div>

          <div className="bg-orange-100 rounded-md p-3 mb-4">
            <h4 className="font-medium text-orange-800 mb-1">How it works:</h4>
            <ul className="text-xs text-orange-700 space-y-1">
              <li>• Pay $15 upfront</li>
              <li>• Use the device as needed</li>
              <li>• Return for $5 refund when done</li>
              <li>• Or subscribe for continued usage</li>
            </ul>
          </div>

          {selectedTier === 'returnable' && (
            <button
              onClick={() => onSelectTier('returnable')}
              className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors"
            >
              Select Returnable Tag - $15
            </button>
          )}
        </div>
      </div>

      {/* Data Usage Info */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">📡 About Data Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-800">500MB includes:</h4>
            <ul className="mt-1 space-y-1">
              <li>• ~10,000 location pings</li>
              <li>• 6-12 months typical usage</li>
              <li>• Emergency GPS activation</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800">When data runs low:</h4>
            <ul className="mt-1 space-y-1">
              <li>• Get notified at 10% remaining</li>
              <li>• Subscribe for unlimited data</li>
              <li>• Or purchase 500MB refill ($5)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Subscription Benefits Preview */}
      <div className="mt-6 p-6 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-3">🚀 Premium Features ($5/month)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium">Real-time Tracking</h4>
            <p>Live location updates & alerts</p>
          </div>
          <div>
            <h4 className="font-medium">Family Sharing</h4>
            <p>Share with up to 5 people</p>
          </div>
          <div>
            <h4 className="font-medium">Advanced Features</h4>
            <p>Geofencing, theft detection</p>
          </div>
        </div>
      </div>
    </div>
  );
} 