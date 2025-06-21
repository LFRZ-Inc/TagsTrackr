'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  MapPin, 
  Battery, 
  Shield, 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  X,
  Plus,
  Settings,
  Eye,
  Trash2,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Alert {
  id: string;
  tag_id: string;
  user_id: string;
  alert_type: 'movement' | 'geofence_exit' | 'theft' | 'low_battery' | 'data_low';
  triggered_at: string;
  viewed_at: string | null;
  resolved_at: string | null;
  metadata: any;
  is_active: boolean;
  personal_devices?: {
    device_name: string;
    device_type: string;
  };
}

interface Geofence {
  id: string;
  tag_id: string;
  user_id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
}

interface AlertSettings {
  movement_enabled: boolean;
  geofence_enabled: boolean;
  battery_enabled: boolean;
  theft_enabled: boolean;
  notification_email: boolean;
  notification_push: boolean;
}

export default function AlertsManager() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'alerts' | 'geofences' | 'settings'>('alerts');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'movement' | 'geofence_exit' | 'theft' | 'low_battery'>('all');
  const [showCreateGeofence, setShowCreateGeofence] = useState(false);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    movement_enabled: true,
    geofence_enabled: true,
    battery_enabled: true,
    theft_enabled: true,
    notification_email: true,
    notification_push: false
  });

  const [newGeofence, setNewGeofence] = useState({
    name: '',
    tag_id: '',
    center_lat: 0,
    center_lng: 0,
    radius_meters: 100
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadAlerts(),
        loadGeofences(),
        loadDevices(),
        loadAlertSettings()
      ]);
    } catch (error) {
      console.error('Error loading alerts data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          personal_devices (
            device_name,
            device_type
          )
        `)
        .eq('user_id', user.id)
        .order('triggered_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const loadGeofences = async () => {
    try {
      const { data, error } = await supabase
        .from('geofences')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGeofences(data || []);
    } catch (error) {
      console.error('Error loading geofences:', error);
    }
  };

  const loadDevices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('personal_devices')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const loadAlertSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setAlertSettings({
          movement_enabled: data.movement_alerts_enabled ?? true,
          geofence_enabled: data.geofence_alerts_enabled ?? true,
          battery_enabled: data.battery_alerts_enabled ?? true,
          theft_enabled: data.theft_alerts_enabled ?? true,
          notification_email: data.email_notifications ?? true,
          notification_push: data.push_notifications ?? false
        });
      }
    } catch (error) {
      console.error('Error loading alert settings:', error);
    }
  };

  const markAsViewed = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;
      await loadAlerts();
    } catch (error) {
      console.error('Error marking alert as viewed:', error);
    }
  };

  const markAsResolved = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;
      await loadAlerts();
    } catch (error) {
      console.error('Error marking alert as resolved:', error);
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;
      await loadAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const createGeofence = async () => {
    if (!newGeofence.name || !newGeofence.tag_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('geofences')
        .insert({
          ...newGeofence,
          user_id: user.id
        });

      if (error) throw error;

      setNewGeofence({
        name: '',
        tag_id: '',
        center_lat: 0,
        center_lng: 0,
        radius_meters: 100
      });
      setShowCreateGeofence(false);
      await loadGeofences();
    } catch (error) {
      console.error('Error creating geofence:', error);
      alert('Failed to create geofence');
    }
  };

  const deleteGeofence = async (geofenceId: string) => {
    if (!confirm('Are you sure you want to delete this geofence?')) return;

    try {
      const { error } = await supabase
        .from('geofences')
        .delete()
        .eq('id', geofenceId);

      if (error) throw error;
      await loadGeofences();
    } catch (error) {
      console.error('Error deleting geofence:', error);
    }
  };

  const saveAlertSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('privacy_settings')
        .upsert({
          user_id: user.id,
          movement_alerts_enabled: alertSettings.movement_enabled,
          geofence_alerts_enabled: alertSettings.geofence_enabled,
          battery_alerts_enabled: alertSettings.battery_enabled,
          theft_alerts_enabled: alertSettings.theft_enabled,
          email_notifications: alertSettings.notification_email,
          push_notifications: alertSettings.notification_push,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      alert('Alert settings saved successfully!');
    } catch (error) {
      console.error('Error saving alert settings:', error);
      alert('Failed to save alert settings');
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'movement': return <Activity className="h-5 w-5" />;
      case 'geofence_exit': return <MapPin className="h-5 w-5" />;
      case 'theft': return <Shield className="h-5 w-5" />;
      case 'low_battery': return <Battery className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'movement': return 'text-blue-600 bg-blue-100';
      case 'geofence_exit': return 'text-orange-600 bg-orange-100';
      case 'theft': return 'text-red-600 bg-red-100';
      case 'low_battery': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertTitle = (type: string) => {
    switch (type) {
      case 'movement': return 'Movement Detected';
      case 'geofence_exit': return 'Left Safe Zone';
      case 'theft': return 'Theft Alert';
      case 'low_battery': return 'Low Battery';
      case 'data_low': return 'Low Data';
      default: return 'Alert';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !alert.viewed_at;
    return alert.alert_type === filterType;
  });

  const unreadCount = alerts.filter(alert => !alert.viewed_at).length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
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
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Bell className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Alerts & Notifications</h3>
              <p className="text-sm text-gray-600">
                Manage your device alerts and safety notifications
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'alerts', label: 'Recent Alerts', count: alerts.length },
            { id: 'geofences', label: 'Safe Zones', count: geofences.length },
            { id: 'settings', label: 'Settings' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center space-x-4">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Alerts</option>
                <option value="unread">Unread</option>
                <option value="movement">Movement</option>
                <option value="geofence_exit">Geofence Exit</option>
                <option value="theft">Theft</option>
                <option value="low_battery">Low Battery</option>
              </select>
            </div>

            {/* Alerts List */}
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No alerts found</p>
                <p className="text-sm text-gray-400">Your device alerts will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`border rounded-lg p-4 ${
                      !alert.viewed_at ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${getAlertColor(alert.alert_type)}`}>
                          {getAlertIcon(alert.alert_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">
                              {getAlertTitle(alert.alert_type)}
                            </h4>
                            {!alert.viewed_at && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                New
                              </span>
                            )}
                            {alert.resolved_at && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                Resolved
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {alert.personal_devices?.device_name} ({alert.personal_devices?.device_type})
                          </p>
                          <div className="flex items-center text-xs text-gray-500 mt-2">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(alert.triggered_at).toLocaleString()}
                          </div>
                          {alert.metadata && (
                            <p className="text-sm text-gray-600 mt-2">
                              {JSON.stringify(alert.metadata)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!alert.viewed_at && (
                          <button
                            onClick={() => markAsViewed(alert.id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Mark as viewed"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        {!alert.resolved_at && (
                          <button
                            onClick={() => markAsResolved(alert.id)}
                            className="text-green-600 hover:text-green-800"
                            title="Mark as resolved"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteAlert(alert.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete alert"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Geofences Tab */}
        {activeTab === 'geofences' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Safe Zones (Geofences)</h4>
              <button
                onClick={() => setShowCreateGeofence(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Safe Zone
              </button>
            </div>

            {/* Create Geofence Form */}
            {showCreateGeofence && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h5 className="font-medium text-gray-900 mb-3">Create New Safe Zone</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zone Name
                    </label>
                    <input
                      type="text"
                      value={newGeofence.name}
                      onChange={(e) => setNewGeofence({ ...newGeofence, name: e.target.value })}
                      placeholder="e.g., Home, Office, School"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Device
                    </label>
                    <select
                      value={newGeofence.tag_id}
                      onChange={(e) => setNewGeofence({ ...newGeofence, tag_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select device</option>
                      {devices.map((device) => (
                        <option key={device.id} value={device.id}>
                          {device.device_name} ({device.device_type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={newGeofence.center_lat}
                      onChange={(e) => setNewGeofence({ ...newGeofence, center_lat: parseFloat(e.target.value) })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={newGeofence.center_lng}
                      onChange={(e) => setNewGeofence({ ...newGeofence, center_lng: parseFloat(e.target.value) })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Radius (meters)
                    </label>
                    <input
                      type="number"
                      value={newGeofence.radius_meters}
                      onChange={(e) => setNewGeofence({ ...newGeofence, radius_meters: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={() => setShowCreateGeofence(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createGeofence}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Safe Zone
                  </button>
                </div>
              </div>
            )}

            {/* Geofences List */}
            {geofences.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No safe zones configured</p>
                <p className="text-sm text-gray-400">Create geofences to get alerts when devices leave safe areas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {geofences.map((geofence) => (
                  <div key={geofence.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-900">{geofence.name}</h5>
                        <p className="text-sm text-gray-600">
                          Center: {geofence.center_lat.toFixed(6)}, {geofence.center_lng.toFixed(6)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Radius: {geofence.radius_meters}m
                        </p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          Created {new Date(geofence.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          geofence.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {geofence.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => deleteGeofence(geofence.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete geofence"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h4 className="font-medium text-gray-900">Alert Preferences</h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium text-gray-900">Movement Alerts</h5>
                  <p className="text-sm text-gray-600">Get notified when devices move unexpectedly</p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={alertSettings.movement_enabled}
                    onChange={(e) => setAlertSettings({ ...alertSettings, movement_enabled: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium text-gray-900">Geofence Alerts</h5>
                  <p className="text-sm text-gray-600">Get notified when devices leave safe zones</p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={alertSettings.geofence_enabled}
                    onChange={(e) => setAlertSettings({ ...alertSettings, geofence_enabled: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium text-gray-900">Battery Alerts</h5>
                  <p className="text-sm text-gray-600">Get notified when device battery is low</p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={alertSettings.battery_enabled}
                    onChange={(e) => setAlertSettings({ ...alertSettings, battery_enabled: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium text-gray-900">Theft Detection</h5>
                  <p className="text-sm text-gray-600">Advanced movement patterns suggesting theft</p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={alertSettings.theft_enabled}
                    onChange={(e) => setAlertSettings({ ...alertSettings, theft_enabled: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="font-medium text-gray-900 mb-4">Notification Methods</h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-900">Email Notifications</h5>
                    <p className="text-sm text-gray-600">Receive alerts via email</p>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={alertSettings.notification_email}
                      onChange={(e) => setAlertSettings({ ...alertSettings, notification_email: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-900">Push Notifications</h5>
                    <p className="text-sm text-gray-600">Receive instant browser notifications</p>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={alertSettings.notification_push}
                      onChange={(e) => setAlertSettings({ ...alertSettings, notification_push: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={saveAlertSettings}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 flex items-center"
              >
                <Settings className="h-4 w-4 mr-2" />
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 