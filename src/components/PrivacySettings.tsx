'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Clock, 
  MapPin, 
  Users, 
  Database, 
  Save,
  AlertCircle,
  Info,
  CheckCircle,
  Settings,
  Trash2,
  Download
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PrivacySettings {
  id: string;
  user_id: string;
  location_sharing_default: boolean;
  data_retention_days: number;
  share_location_with_family: boolean;
  allow_found_reports: boolean;
  hide_precise_location: boolean;
  location_history_enabled: boolean;
  analytics_opt_in: boolean;
  marketing_emails: boolean;
  security_alerts: boolean;
  created_at: string;
  updated_at: string;
}

interface DataExport {
  devices: any[];
  location_history: any[];
  privacy_settings: any;
  family_shares: any[];
  alerts: any[];
}

export default function PrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formData, setFormData] = useState({
    location_sharing_default: false,
    data_retention_days: 90,
    share_location_with_family: true,
    allow_found_reports: true,
    hide_precise_location: false,
    location_history_enabled: true,
    analytics_opt_in: true,
    marketing_emails: false,
    security_alerts: true
  });

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Please log in to access privacy settings');
        return;
      }

      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
        setFormData({
          location_sharing_default: data.location_sharing_default,
          data_retention_days: data.data_retention_days,
          share_location_with_family: data.share_location_with_family,
          allow_found_reports: data.allow_found_reports,
          hide_precise_location: data.hide_precise_location,
          location_history_enabled: data.location_history_enabled,
          analytics_opt_in: data.analytics_opt_in,
          marketing_emails: data.marketing_emails,
          security_alerts: data.security_alerts
        });
      } else {
        // Create default settings if none exist
        await createDefaultSettings(user.id);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
      setError('Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('privacy_settings')
        .insert({
          user_id: userId,
          location_sharing_default: false,
          data_retention_days: 90,
          share_location_with_family: true,
          allow_found_reports: true,
          hide_precise_location: false,
          location_history_enabled: true,
          analytics_opt_in: true,
          marketing_emails: false,
          security_alerts: true
        })
        .select()
        .single();

      if (error) throw error;
      
      setSettings(data);
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('privacy_settings')
        .upsert({
          user_id: user.id,
          ...formData,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSuccess('Privacy settings saved successfully!');
      await loadPrivacySettings();
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      setError('Failed to save privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    try {
      setExportLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch all user data
      const [devicesResult, locationsResult, sharesResult, alertsResult] = await Promise.all([
        supabase.from('personal_devices').select('*').eq('user_id', user.id),
        supabase.from('location_pings').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1000),
        supabase.from('tag_shares').select('*').eq('owner_id', user.id),
        supabase.from('alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)
      ]);

      const exportData: DataExport = {
        devices: devicesResult.data || [],
        location_history: locationsResult.data || [],
        privacy_settings: settings,
        family_shares: sharesResult.data || [],
        alerts: alertsResult.data || []
      };

      // Download as JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tagstrackr-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  const deleteAllData = async () => {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL your TagsTrackr data including devices, location history, shares, and settings. This action cannot be undone.\n\nType "DELETE" to confirm:')) {
      return;
    }

    const confirmation = prompt('Please type "DELETE" to confirm permanent data deletion:');
    if (confirmation !== 'DELETE') {
      alert('Data deletion cancelled. Please type "DELETE" exactly to confirm.');
      return;
    }

    try {
      setDeleteLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete all user data in correct order (respecting foreign keys)
      await Promise.all([
        supabase.from('location_pings').delete().eq('user_id', user.id),
        supabase.from('alerts').delete().eq('user_id', user.id),
        supabase.from('geofences').delete().eq('user_id', user.id),
        supabase.from('tag_shares').delete().eq('owner_id', user.id),
        supabase.from('tag_shares').delete().eq('shared_with_user_id', user.id)
      ]);

      await supabase.from('personal_devices').delete().eq('user_id', user.id);
      await supabase.from('privacy_settings').delete().eq('user_id', user.id);

      // Update user profile to remove personal info but keep account
      await supabase.from('users').update({
        full_name: null,
        phone: null,
        is_premium: false,
        device_limit: 1,
        current_devices: 0
      }).eq('id', user.id);

      alert('✅ All your TagsTrackr data has been permanently deleted. Your account remains active but all tracking data has been removed.');
      
      // Reload the page to reset state
      window.location.reload();
    } catch (error) {
      console.error('Error deleting data:', error);
      setError('Failed to delete data. Please contact support.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-blue-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Privacy Settings</h3>
            <p className="text-sm text-gray-600">Control how your data is used and shared</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-sm text-green-800">{success}</span>
            </div>
          </div>
        )}

        {/* Location Privacy */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Location Privacy
          </h4>

          <div className="space-y-3 ml-7">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.location_sharing_default}
                onChange={(e) => setFormData({ ...formData, location_sharing_default: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Enable location sharing by default for new devices
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.hide_precise_location}
                onChange={(e) => setFormData({ ...formData, hide_precise_location: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Hide precise location (show approximate area only)
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.location_history_enabled}
                onChange={(e) => setFormData({ ...formData, location_history_enabled: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Keep location history for tracking and analytics
              </span>
            </label>
          </div>
        </div>

        {/* Family Sharing */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Family Sharing
          </h4>

          <div className="space-y-3 ml-7">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.share_location_with_family}
                onChange={(e) => setFormData({ ...formData, share_location_with_family: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Allow family members to see shared device locations
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.allow_found_reports}
                onChange={(e) => setFormData({ ...formData, allow_found_reports: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Allow others to report found devices to help recovery
              </span>
            </label>
          </div>
        </div>

        {/* Data Retention */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Data Retention
          </h4>

          <div className="ml-7">
            <label className="block text-sm text-gray-700 mb-2">
              Keep location history for:
            </label>
            <select
              value={formData.data_retention_days}
              onChange={(e) => setFormData({ ...formData, data_retention_days: parseInt(e.target.value) })}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value={30}>30 days</option>
              <option value={90}>90 days (recommended)</option>
              <option value={180}>6 months</option>
              <option value={365}>1 year</option>
              <option value={-1}>Forever</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Older location data will be automatically deleted
            </p>
          </div>
        </div>

        {/* Communications */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Communications & Analytics
          </h4>

          <div className="space-y-3 ml-7">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.analytics_opt_in}
                onChange={(e) => setFormData({ ...formData, analytics_opt_in: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Help improve TagsTrackr with anonymous usage analytics
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.security_alerts}
                onChange={(e) => setFormData({ ...formData, security_alerts: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Receive security alerts and important account notifications
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.marketing_emails}
                onChange={(e) => setFormData({ ...formData, marketing_emails: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Receive promotional emails about new features and offers
              </span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Data Management */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="font-medium text-gray-900 mb-4">Data Management</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <h5 className="font-medium text-blue-900">Export Your Data</h5>
                <p className="text-sm text-blue-700">Download all your TagsTrackr data in JSON format</p>
              </div>
              <button
                onClick={exportData}
                disabled={exportLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {exportLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {exportLoading ? 'Exporting...' : 'Export Data'}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <h5 className="font-medium text-red-900">Delete All Data</h5>
                <p className="text-sm text-red-700">Permanently remove all your TagsTrackr data</p>
              </div>
              <button
                onClick={deleteAllData}
                disabled={deleteLoading}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {deleteLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {deleteLoading ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">Your Privacy Matters</p>
              <p>
                TagsTrackr is committed to protecting your privacy. We only collect data necessary for 
                the service to function, never sell your information, and give you full control over 
                your data. Read our <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a> for details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 