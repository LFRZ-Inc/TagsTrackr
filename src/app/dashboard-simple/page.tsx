'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface PersonalDevice {
  id: string
  device_name: string
  device_type: string
  location_sharing_active: boolean
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

export default function SimpleDashboard() {
  const supabase = createSupabaseClient()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [devices, setDevices] = useState<PersonalDevice[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchDevices()
    }
  }, [user])

  async function checkUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/login')
        return
      }
      setUser(user)
    } catch (error) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  async function fetchDevices() {
    try {
      const { data, error } = await supabase
        .from('personal_devices')
        .select('*')
        .eq('user_id', user?.id)

      if (error) throw error
      setDevices(data || [])
    } catch (error) {
      console.error('Error fetching devices:', error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sendTestLocation = async (deviceId: string) => {
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) return

      const response = await fetch('/api/ping/simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`
        },
        body: JSON.stringify({
          device_id: deviceId,
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10
        })
      })

      if (response.ok) {
        alert('✅ Test location sent successfully!')
        fetchDevices()
      } else {
        alert('❌ Failed to send location')
      }
    } catch (error) {
      console.error('Error sending location:', error)
      alert('❌ Error sending location')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <span className="text-2xl">📍</span>
                <span className="ml-2 text-xl font-bold text-gray-900">TagsTrackr Simple</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">👤 {user?.email}</span>
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
          <h1 className="text-3xl font-bold text-gray-900">Simple Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor and manage your tracked devices (Simplified Version)</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">📱</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Devices</p>
                <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {devices.filter(d => d.location_sharing_active).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Device List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Devices</h2>
          </div>
          
          <div className="p-6">
            {devices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No devices found</p>
                <Link
                  href="/register-tag"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ➕ Add Your First Device
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {devices.map((device) => (
                  <div key={device.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {device.device_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Type: {device.device_type.replace('_', ' ')}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <div className={`w-2 h-2 rounded-full ${device.location_sharing_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <span className="text-sm text-gray-600">
                            {device.location_sharing_active ? 'Active' : 'Inactive'}
                          </span>
                          {device.last_ping_at && (
                            <span className="text-sm text-gray-500">
                              • Last seen: {new Date(device.last_ping_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <button
                          onClick={() => sendTestLocation(device.id)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          📍 Send Test Location
                        </button>
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
  )
} 