'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'

interface PersonalDevice {
  id: string
  device_name: string
  device_type: string
  location_sharing_enabled: boolean
  battery_level: number | null
  last_ping_at: string | null
  metadata?: {
    current_location?: {
      latitude: number
      longitude: number
      accuracy: number
      timestamp: string
    }
  }
}

interface Tag {
  id: string
  tag_id: string
  description: string | null
  is_active: boolean | null
  battery_level: number | null
  last_seen_at: string | null
}

export default function WorkingDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [devices, setDevices] = useState<PersonalDevice[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkUser()
    fetchData()
    
    // Set up real-time updates
    const interval = setInterval(() => {
      fetchData()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (!user) {
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Auth error:', error)
      window.location.href = '/login'
    }
  }

  const fetchData = async () => {
    try {
      setRefreshing(true)
      await Promise.all([fetchDevices(), fetchTags()])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('personal_devices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDevices(data || [])
    } catch (error) {
      console.error('Error fetching devices:', error)
    }
  }

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.log('Tags table not found, continuing without tags')
        return
      }
      setTags(data || [])
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  }

  const sendTestLocation = async (deviceId: string) => {
    try {
      // Send test location (NYC coordinates)
      const testLocation = {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        timestamp: new Date().toISOString()
      }

      const response = await fetch('/api/ping/simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: deviceId,
          location: testLocation
        }),
      })

      if (response.ok) {
        alert('✅ Test location sent successfully!')
        fetchData() // Refresh data
      } else {
        const error = await response.text()
        alert(`❌ Error sending location: ${error}`)
      }
    } catch (error) {
      console.error('Error sending test location:', error)
      alert('❌ Network error sending location')
    }
  }

  const requestRealLocation = async (deviceId: string) => {
    if (!navigator.geolocation) {
      alert('❌ Geolocation is not supported by this browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          }

          const response = await fetch('/api/ping/simple', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              device_id: deviceId,
              location: location
            }),
          })

          if (response.ok) {
            alert('✅ Real location sent successfully!')
            fetchData()
          } else {
            const error = await response.text()
            alert(`❌ Error sending location: ${error}`)
          }
        } catch (error) {
          console.error('Error sending real location:', error)
          alert('❌ Network error sending location')
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        alert('❌ Could not get your location. Please check permissions.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const isDeviceActive = (device: PersonalDevice) => {
    if (!device.last_ping_at) return false
    const lastSeen = new Date(device.last_ping_at)
    const now = new Date()
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
    return diffMinutes <= 10 && device.location_sharing_enabled
  }

  const isTagActive = (tag: Tag) => {
    if (!tag.last_seen_at) return false
    const lastSeen = new Date(tag.last_seen_at)
    const now = new Date()
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
    return diffMinutes <= 10 && tag.is_active
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading working dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Checking authentication and fetching your devices</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access your dashboard</p>
          <Link
            href="/login"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  const activeDevices = devices.filter(isDeviceActive)
  const activeTags = tags.filter(isTagActive)
  const totalDevices = devices.length + tags.length
  const totalActive = activeDevices.length + activeTags.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <span className="text-2xl">📍</span>
              <span className="ml-2 text-xl font-bold text-gray-900">TagsTrackr Pro</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${refreshing ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {refreshing ? 'Updating...' : 'Live Updates'}
                </span>
              </div>
              
              <button
                onClick={() => fetchData()}
                disabled={refreshing}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <span className={`text-lg ${refreshing ? 'animate-spin' : ''}`}>🔄</span>
              </button>
              
              <span className="text-sm text-gray-600">👤 {user?.email}</span>
              
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
              >
                <span className="text-sm">🚪 Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Working Dashboard</h1>
          <p className="text-gray-600 mt-2">Reliable monitoring and management for your tracked devices</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <span className="text-2xl">📱</span>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Devices</p>
                <p className="text-2xl font-bold text-gray-900">{totalDevices}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <span className="text-2xl">✅</span>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{totalActive}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <span className="text-2xl">💻</span>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Personal Devices</p>
                <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <span className="text-2xl">🏷️</span>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">GPS Tags</p>
                <p className="text-2xl font-bold text-gray-900">{tags.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Devices Section */}
        {devices.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">💻 Personal Devices</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {devices.map((device) => (
                  <div key={device.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{device.device_name}</h3>
                        <p className="text-sm text-gray-600">Type: {device.device_type}</p>
                        
                        <div className="mt-2 flex items-center space-x-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isDeviceActive(device)
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isDeviceActive(device) ? 'Active' : 'Offline'}
                          </span>
                          
                          {device.last_ping_at && (
                            <span className="text-sm text-gray-500">
                              • Last seen: {formatTimestamp(device.last_ping_at)}
                            </span>
                          )}
                          
                          {device.battery_level !== null && (
                            <span className="text-sm text-gray-500">
                              • Battery: {device.battery_level}%
                            </span>
                          )}
                        </div>

                        {device.metadata?.current_location && (
                          <div className="mt-2 text-sm text-gray-600">
                            📍 Location: {device.metadata.current_location.latitude.toFixed(4)}, {device.metadata.current_location.longitude.toFixed(4)}
                            {device.metadata.current_location.accuracy && (
                              <span className="text-gray-500"> (±{device.metadata.current_location.accuracy}m)</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => sendTestLocation(device.id)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          📍 Send Test Location
                        </button>
                        
                        <button
                          onClick={() => requestRealLocation(device.id)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          🎯 Send Real Location
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* GPS Tags Section */}
        {tags.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">🏷️ GPS Tags</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {tags.map((tag) => (
                  <div key={tag.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {tag.description || tag.tag_id}
                        </h3>
                        <p className="text-sm text-gray-600">Tag ID: {tag.tag_id}</p>
                        
                        <div className="mt-2 flex items-center space-x-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isTagActive(tag)
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isTagActive(tag) ? 'Active' : 'Offline'}
                          </span>
                          
                          {tag.last_seen_at && (
                            <span className="text-sm text-gray-500">
                              • Last seen: {formatTimestamp(tag.last_seen_at)}
                            </span>
                          )}
                          
                          {tag.battery_level !== null && (
                            <span className="text-sm text-gray-500">
                              • Battery: {tag.battery_level}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {totalDevices === 0 && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-12 text-center">
              <span className="text-6xl">📱</span>
              <h3 className="text-xl font-medium text-gray-900 mt-4">No devices found</h3>
              <p className="text-gray-600 mt-2">Get started by registering your first device</p>
              <div className="mt-6 space-x-4">
                <Link
                  href="/register-device"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📱 Register Personal Device
                </Link>
                <Link
                  href="/register-tag"
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  🏷️ Register GPS Tag
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">🚀 Quick Actions</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/dashboard-simple"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="text-center">
                  <span className="text-2xl">📊</span>
                  <h3 className="text-lg font-medium text-gray-900 mt-2">Simple Dashboard</h3>
                  <p className="text-sm text-gray-600">Basic view with core functionality</p>
                </div>
              </Link>
              
              <Link
                href="/dashboard-enhanced"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="text-center">
                  <span className="text-2xl">🗺️</span>
                  <h3 className="text-lg font-medium text-gray-900 mt-2">Enhanced Dashboard</h3>
                  <p className="text-sm text-gray-600">Advanced features with map integration</p>
                </div>
              </Link>
              
              <Link
                href="/test-dashboard"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="text-center">
                  <span className="text-2xl">🧪</span>
                  <h3 className="text-lg font-medium text-gray-900 mt-2">Test Dashboard</h3>
                  <p className="text-sm text-gray-600">Development and testing interface</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 