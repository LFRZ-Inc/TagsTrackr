'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Activity, 
  Route,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Zap,
  Target,
  Timer
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MovementSession {
  id: string;
  device_id: string;
  start_time: string;
  end_time: string | null;
  total_distance_km: number;
  max_speed_kmh: number;
  avg_speed_kmh: number;
  duration_minutes: number;
  start_location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  end_location: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null;
  movement_type: 'walking' | 'driving' | 'transit' | 'stationary' | 'unknown';
  ping_count: number;
}

interface LocationInsight {
  location_name: string;
  latitude: number;
  longitude: number;
  visit_count: number;
  total_duration_hours: number;
  avg_visit_duration_minutes: number;
  last_visit: string;
  is_frequent_location: boolean;
}

interface MovementStats {
  total_distance_km: number;
  total_active_time_hours: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  total_sessions: number;
  most_active_day: string;
  most_active_hour: number;
  movement_types: {
    walking: number;
    driving: number;
    transit: number;
    stationary: number;
  };
}

interface DailyActivity {
  date: string;
  distance_km: number;
  active_time_hours: number;
  session_count: number;
  avg_speed_kmh: number;
}

export default function MovementAnalytics() {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [movementStats, setMovementStats] = useState<MovementStats | null>(null);
  const [movementSessions, setMovementSessions] = useState<MovementSession[]>([]);
  const [locationInsights, setLocationInsights] = useState<LocationInsight[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'locations' | 'patterns'>('overview');

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      loadAnalytics();
    }
  }, [selectedDevice, timeRange]);

  const loadDevices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('personal_devices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setDevices(data || []);
      if (data && data.length > 0 && !selectedDevice) {
        setSelectedDevice(data[0].id);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      setRefreshing(true);
      
      const response = await fetch(`/api/analytics?deviceId=${selectedDevice}&timeRange=${timeRange}`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const data = await response.json();
      
      setMovementStats(data.stats);
      setMovementSessions(data.sessions || []);
      setLocationInsights(data.locations || []);
      setDailyActivity(data.dailyActivity || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const exportAnalytics = async () => {
    try {
      const exportData = {
        device: devices.find(d => d.id === selectedDevice),
        timeRange,
        exportDate: new Date().toISOString(),
        stats: movementStats,
        sessions: movementSessions,
        locations: locationInsights,
        dailyActivity
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `movement-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting analytics:', error);
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatDistance = (km: number): string => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const getMovementTypeColor = (type: string): string => {
    switch (type) {
      case 'walking': return 'bg-green-100 text-green-800';
      case 'driving': return 'bg-blue-100 text-blue-800';
      case 'transit': return 'bg-purple-100 text-purple-800';
      case 'stationary': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getTimeRangeLabel = (range: string): string => {
    switch (range) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 3 months';
      case '1y': return 'Last year';
      default: return 'Last 30 days';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No devices found</p>
        <p className="text-sm text-gray-400">Add a device to view movement analytics</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BarChart3 className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Movement Analytics</h3>
              <p className="text-sm text-gray-600">Track and analyze device movement patterns</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportAnalytics}
              className="text-gray-600 hover:text-gray-800"
              title="Export analytics"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={loadAnalytics}
              disabled={refreshing}
              className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Device</label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.device_name} ({device.device_type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 3 months</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'sessions', label: 'Movement Sessions', icon: Route },
            { id: 'locations', label: 'Location Insights', icon: MapPin },
            { id: 'patterns', label: 'Daily Patterns', icon: Calendar }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && movementStats && (
          <div className="space-y-6">
            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Route className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-900">Total Distance</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatDistance(movementStats.total_distance_km)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Timer className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-900">Active Time</p>
                    <p className="text-2xl font-bold text-green-600">
                      {Math.round(movementStats.total_active_time_hours)}h
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Zap className="h-8 w-8 text-orange-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-orange-900">Avg Speed</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {movementStats.avg_speed_kmh.toFixed(1)} km/h
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Target className="h-8 w-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-900">Sessions</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {movementStats.total_sessions}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Movement Types */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4">Movement Types</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(movementStats.movement_types).map(([type, count]) => (
                  <div key={type} className="text-center">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getMovementTypeColor(type)}`}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
                    <p className="text-sm text-gray-600">sessions</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Peak Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-2">Most Active Day</h4>
                <p className="text-lg text-gray-600">{movementStats.most_active_day}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-2">Peak Hour</h4>
                <p className="text-lg text-gray-600">{movementStats.most_active_hour}:00</p>
              </div>
            </div>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            {movementSessions.length === 0 ? (
              <div className="text-center py-8">
                <Route className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No movement sessions found</p>
                <p className="text-sm text-gray-400">Movement sessions will appear here as your device moves</p>
              </div>
            ) : (
              <div className="space-y-3">
                {movementSessions.map((session) => (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getMovementTypeColor(session.movement_type)}`}>
                          {session.movement_type}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatDistance(session.total_distance_km)} • {formatDuration(session.duration_minutes)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Avg: {session.avg_speed_kmh.toFixed(1)} km/h • Max: {session.max_speed_kmh.toFixed(1)} km/h
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {new Date(session.start_time).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(session.start_time).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Locations Tab */}
        {activeTab === 'locations' && (
          <div className="space-y-4">
            {locationInsights.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No location insights available</p>
                <p className="text-sm text-gray-400">Location patterns will appear here over time</p>
              </div>
            ) : (
              <div className="space-y-3">
                {locationInsights.map((location, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h5 className="font-medium text-gray-900">{location.location_name}</h5>
                          {location.is_frequent_location && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              Frequent
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {location.visit_count} visits • Avg stay: {formatDuration(location.avg_visit_duration_minutes)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Total time: {Math.round(location.total_duration_hours)}h • Last visit: {new Date(location.last_visit).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Patterns Tab */}
        {activeTab === 'patterns' && (
          <div className="space-y-4">
            {dailyActivity.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No daily activity data available</p>
                <p className="text-sm text-gray-400">Daily patterns will appear here over time</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dailyActivity.map((day) => (
                  <div key={day.date} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-900">
                          {new Date(day.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </h5>
                        <p className="text-sm text-gray-600">
                          {day.session_count} sessions • {formatDistance(day.distance_km)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {Math.round(day.active_time_hours)}h active
                        </p>
                        <p className="text-sm text-gray-500">
                          Avg: {day.avg_speed_kmh.toFixed(1)} km/h
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 