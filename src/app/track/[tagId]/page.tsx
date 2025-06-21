'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, Battery, ArrowLeft, Clock, Signal, AlertTriangle, RefreshCw, Share2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import AdBanner from '@/components/ads/AdBanner'

interface TagData {
  id: string
  tag_id: string
  name: string
  description: string | null
  is_active: boolean | null
  battery_level: number | null
  last_seen_at: string | null
  status: string
  last_location?: {
    latitude: number
    longitude: number
  }
}

interface GPSPing {
  id: string
  latitude: number
  longitude: number
  accuracy: number | null
  battery_level: number | null
  signal_strength: number | null
  timestamp: string | null
  created_at: string
}

interface ReportData {
  type: string
  description: string
  contact_info: string
  reward_amount: number
}

export default function TrackTag({ params }: { params: { tagId: string } }) {
  const [tagData, setTagData] = useState<TagData | null>(null)
  const [recentPings, setRecentPings] = useState<GPSPing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [realTimeEnabled, setRealTimeEnabled] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportData, setReportData] = useState<ReportData>({
    type: 'lost',
    description: '',
    contact_info: '',
    reward_amount: 5
  })
  const [submittingReport, setSubmittingReport] = useState(false)

  useEffect(() => {
    fetchTagData()
    
    // Setup real-time subscription
    const subscription = supabase
      .channel(`tag_${params.tagId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'gps_pings' 
        }, 
        (payload) => {
          console.log('New ping received:', payload)
          if (payload.new) {
            handleNewPing(payload.new as GPSPing)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [params.tagId])

  const handleNewPing = (newPing: GPSPing) => {
    setRecentPings(prev => [newPing, ...prev.slice(0, 9)])
    
    // Update tag location
    if (tagData) {
      setTagData(prev => ({
        ...prev!,
        last_location: {
          latitude: newPing.latitude,
          longitude: newPing.longitude
        },
        battery_level: newPing.battery_level || prev!.battery_level,
        last_seen_at: newPing.timestamp || newPing.created_at
      }))
    }
  }

  async function fetchTagData() {
    try {
      setRefreshing(true)
      
      // Fetch tag information
      const { data: tag, error: tagError } = await supabase
        .from('tags')
        .select('*')
        .eq('tag_id', params.tagId)
        .single()

      if (tagError) throw tagError

      // Fetch recent GPS pings
      const { data: pings, error: pingsError } = await supabase
        .from('gps_pings')
        .select('*')
        .eq('tag_id', tag.id)
        .order('timestamp', { ascending: false })
        .limit(10)

      if (pingsError) throw pingsError

      setTagData({
        ...tag,
        last_location: pings[0] ? {
          latitude: pings[0].latitude,
          longitude: pings[0].longitude
        } : undefined
      })
      setRecentPings(pings || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load tag data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchTagData()
  }

  const handleReportLost = async () => {
    setSubmittingReport(true)
    
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          tag_id: tagData!.id,
          type: reportData.type,
          title: `${reportData.type} - ${tagData!.name}`,
          description: reportData.description,
          contact_info: { contact: reportData.contact_info },
          reward_amount: reportData.reward_amount,
          status: 'open'
        })

      if (error) throw error

      setShowReportModal(false)
      alert('Report submitted successfully! We will notify you of any updates.')
    } catch (err: any) {
      alert('Failed to submit report: ' + err.message)
    } finally {
      setSubmittingReport(false)
    }
  }

  const shareLocation = () => {
    if (tagData?.last_location) {
      const url = `${window.location.origin}/track/${params.tagId}`
      navigator.clipboard.writeText(url)
      alert('Tracking link copied to clipboard!')
    }
  }

  const getMapUrl = () => {
    if (!tagData?.last_location) return null
    const { latitude, longitude } = tagData.last_location
    return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.01},${latitude-0.01},${longitude+0.01},${latitude+0.01}&layer=mapnik&marker=${latitude},${longitude}`
  }

  const getBatteryColor = (level: number | null) => {
    if (!level) return 'text-gray-500'
    if (level > 50) return 'text-green-600'
    if (level > 20) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSignalColor = (strength: number | null) => {
    if (!strength) return 'text-gray-500'
    if (strength > -60) return 'text-green-600'
    if (strength > -80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading tag data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <MapPin className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tag Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/dashboard" className="text-primary-600 hover:text-primary-500">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={shareLocation}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        {/* Tag Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{tagData?.name || params.tagId}</h1>
              <p className="text-gray-600">{tagData?.description || 'GPS Tracking Device'}</p>
              <p className="text-sm text-gray-500">ID: {tagData?.tag_id}</p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-2">
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Report Lost
              </button>
            </div>
          </div>
        </div>
        
        {/* Status Cards - Mobile Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className={`p-2 rounded-full ${tagData?.is_active ? 'bg-green-100' : 'bg-red-100'}`}>
                <MapPin className={`h-5 w-5 ${tagData?.is_active ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Status</p>
                <p className={`text-lg font-bold ${tagData?.is_active ? 'text-green-600' : 'text-red-600'}`}>
                  {tagData?.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-full">
                                 <Battery className={`h-5 w-5 ${getBatteryColor(tagData?.battery_level ?? null)}`} />
               </div>
               <div className="ml-3">
                 <p className="text-sm font-medium text-gray-700">Battery</p>
                 <p className={`text-lg font-bold ${getBatteryColor(tagData?.battery_level ?? null)}`}>
                  {tagData?.battery_level ?? '--'}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-full">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Last Seen</p>
                <p className="text-lg font-bold text-gray-900">
                  {tagData?.last_seen_at ? formatTimestamp(tagData.last_seen_at) : 'Never'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-full">
                <Signal className={`h-5 w-5 ${getSignalColor(recentPings[0]?.signal_strength)}`} />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Signal</p>
                <p className={`text-lg font-bold ${getSignalColor(recentPings[0]?.signal_strength)}`}>
                  {recentPings[0]?.signal_strength || '--'} dBm
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ad Banner */}
        <AdBanner pageContext="track" className="mb-6" />
        
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Map */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Current Location</h2>
                {realTimeEnabled && (
                  <div className="flex items-center text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    <span className="text-sm font-medium">Live</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4">
              {tagData?.last_location ? (
                <div className="space-y-4">
                  <iframe
                    src={getMapUrl() || ''}
                    width="100%"
                    height="300"
                    className="rounded-lg border"
                    title="Tag Location"
                  />
                  <div className="text-sm text-gray-600 text-center space-y-1">
                    <div className="flex items-center justify-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {tagData.last_location.latitude.toFixed(6)}, {tagData.last_location.longitude.toFixed(6)}
                    </div>
                    {recentPings[0]?.accuracy && (
                      <div className="text-xs text-gray-500">
                        Accuracy: ±{recentPings[0].accuracy}m
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No location data available</p>
                    <p className="text-sm text-gray-500">Waiting for GPS signal...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Recent Pings */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Recent Location Updates</h2>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {recentPings.length === 0 ? (
                <div className="p-6 text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No location updates yet</p>
                  <p className="text-sm text-gray-500">GPS data will appear here as it's received</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {recentPings.map((ping, index) => (
                    <div key={ping.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {ping.latitude.toFixed(6)}, {ping.longitude.toFixed(6)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {ping.timestamp ? formatTimestamp(ping.timestamp) : formatTimestamp(ping.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {ping.battery_level && (
                            <p className={`text-xs font-medium ${getBatteryColor(ping.battery_level)}`}>
                              {ping.battery_level}%
                            </p>
                          )}
                          {ping.accuracy && (
                            <p className="text-xs text-gray-500">±{ping.accuracy}m</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report Lost Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Report Lost Item</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                <select
                  value={reportData.type}
                  onChange={(e) => setReportData({ ...reportData, type: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="lost">Lost</option>
                  <option value="theft">Theft</option>
                  <option value="damage">Damage</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={reportData.description}
                  onChange={(e) => setReportData({ ...reportData, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="Describe what happened and when you last saw the item..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Information</label>
                <input
                  type="text"
                  value={reportData.contact_info}
                  onChange={(e) => setReportData({ ...reportData, contact_info: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Phone number or email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Finder Reward ($)</label>
                <input
                  type="number"
                  value={reportData.reward_amount}
                  onChange={(e) => setReportData({ ...reportData, reward_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  min="0"
                  step="1"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleReportLost}
                disabled={submittingReport}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {submittingReport ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 