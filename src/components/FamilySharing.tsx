'use client';

import { useState, useEffect } from 'react';
import { Share2, UserPlus, X, Eye, Settings, Clock, Check } from 'lucide-react';

interface FamilySharingProps {
  devices: any[];
  onRefresh: () => void;
}

interface Share {
  id: string;
  permissions: 'read' | 'full';
  shared_at: string;
  expires_at: string | null;
  devices: {
    tag_id: string;
    type: string;
  };
  users: {
    email: string;
    id: string;
  };
}

export default function FamilySharing({ devices, onRefresh }: FamilySharingProps) {
  const [shareEmail, setShareEmail] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [permissions, setPermissions] = useState<'read' | 'full'>('read');
  const [expiresInDays, setExpiresInDays] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [createdShares, setCreatedShares] = useState<Share[]>([]);
  const [receivedShares, setReceivedShares] = useState<Share[]>([]);

  useEffect(() => {
    loadShares();
  }, []);

  const loadShares = async () => {
    try {
      const response = await fetch('/api/family/share');
      if (response.ok) {
        const data = await response.json();
        setCreatedShares(data.createdShares || []);
        setReceivedShares(data.receivedShares || []);
      }
    } catch (error) {
      console.error('Error loading shares:', error);
    }
  };

  const createShare = async () => {
    if (!selectedDevice || !shareEmail) {
      alert('Please select a device and enter an email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/family/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagId: selectedDevice,
          shareWithEmail: shareEmail,
          permissions,
          expiresInDays: expiresInDays || undefined
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(data.message);
        setShareEmail('');
        setSelectedDevice('');
        setExpiresInDays('');
        await loadShares();
        onRefresh();
      } else {
        alert(data.error || 'Failed to create share');
      }
    } catch (error) {
      console.error('Error creating share:', error);
      alert('Failed to create share');
    } finally {
      setLoading(false);
    }
  };

  const revokeShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to revoke this share?')) return;

    try {
      const response = await fetch(`/api/family/share?shareId=${shareId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(data.message);
        await loadShares();
        onRefresh();
      } else {
        alert(data.error || 'Failed to revoke share');
      }
    } catch (error) {
      console.error('Error revoking share:', error);
      alert('Failed to revoke share');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Create New Share */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <UserPlus className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Share a Device</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Device to Share
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a device...</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.tag_id} ({device.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="family@example.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions
            </label>
            <select
              value={permissions}
              onChange={(e) => setPermissions(e.target.value as 'read' | 'full')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="read">Read Only (View location)</option>
              <option value="full">Full Access (View + manage alerts)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expires After (Days)
            </label>
            <input
              type="number"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : '')}
              placeholder="Never (leave blank)"
              min="1"
              max="365"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          onClick={createShare}
          disabled={loading || !selectedDevice || !shareEmail}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sharing...' : 'Share Device'}
        </button>
      </div>

      {/* Shares Created by User */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Share2 className="h-5 w-5 text-green-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Devices You've Shared</h3>
        </div>

        {createdShares.length === 0 ? (
          <p className="text-gray-500 text-center py-4">You haven't shared any devices yet.</p>
        ) : (
          <div className="space-y-3">
            {createdShares.map((share) => (
              <div key={share.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="font-medium text-gray-900">{share.devices.tag_id}</h4>
                      <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {share.devices.type}
                      </span>
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        share.permissions === 'full' 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {share.permissions === 'full' ? 'Full Access' : 'Read Only'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Shared with: {share.users.email}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      Shared {formatDate(share.shared_at)}
                      {share.expires_at && (
                        <span className={`ml-2 ${isExpired(share.expires_at) ? 'text-red-600' : ''}`}>
                          • {isExpired(share.expires_at) ? 'Expired' : 'Expires'} {formatDate(share.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => revokeShare(share.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Revoke access"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shares Received by User */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Eye className="h-5 w-5 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Devices Shared with You</h3>
        </div>

        {receivedShares.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No devices have been shared with you.</p>
        ) : (
          <div className="space-y-3">
            {receivedShares.map((share) => (
              <div key={share.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="font-medium text-gray-900">{share.devices.tag_id}</h4>
                      <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {share.devices.type}
                      </span>
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        share.permissions === 'full' 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {share.permissions === 'full' ? 'Full Access' : 'Read Only'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Shared by: {share.users.email}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      Received {formatDate(share.shared_at)}
                      {share.expires_at && (
                        <span className={`ml-2 ${isExpired(share.expires_at) ? 'text-red-600' : ''}`}>
                          • {isExpired(share.expires_at) ? 'Expired' : 'Expires'} {formatDate(share.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {share.permissions === 'full' && (
                      <div title="Can manage alerts">
                        <Settings className="h-4 w-4 text-orange-600" />
                      </div>
                    )}
                    <div title="Active share">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">About Family Sharing</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Read Only:</strong> Recipients can view device location and history</li>
          <li>• <strong>Full Access:</strong> Recipients can also manage alerts and geofences</li>
          <li>• <strong>Privacy:</strong> Shared users cannot see who else has access</li>
          <li>• <strong>Limits:</strong> Each device can be shared with up to 10 people</li>
          <li>• <strong>Control:</strong> You can revoke access at any time</li>
        </ul>
      </div>
    </div>
  );
} 