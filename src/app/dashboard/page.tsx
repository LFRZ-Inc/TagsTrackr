'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Battery, Plus, LogOut, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface Tag {
  id: string
  tag_id: string
  name: string
  description: string | null
  is_active: boolean | null
  battery_level: number | null
  created_at: string | null
  latest_ping?: {
    latitude: number
    longitude: number
    battery_level: number | null
    timestamp: string | null
  }
  last_ping_time: string
}

export default function Dashboard() {
  const [tags, setTags] = useState<Tag[]>([])
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      await fetchTags(user.id)
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  async function fetchTags(userId: string) {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select(`
          *,
          gps_pings!inner(
            latitude,
            longitude,
            battery_level,
            timestamp
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Process tags with latest ping data
      const processedTags: Tag[] = (data || []).map(tag => {
        const latestPing = tag.gps_pings?.[0]
        return {
          ...tag,
          latest_ping: latestPing,
          last_ping_time: latestPing && latestPing.timestamp ? 
            new Date(latestPing.timestamp).toLocaleString() : 'No pings yet'
        }
      })

      setTags(processedTags)
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const activeTags = tags.filter(tag => tag.is_active)
  const onlineTags = tags.filter(tag => tag.latest_ping && 
    tag.latest_ping.timestamp &&
    new Date(tag.latest_ping.timestamp) > new Date(Date.now() - 30 * 60 * 1000)) // Last 30 minutes
  const lowBatteryTags = tags.filter(tag => 
    tag.latest_ping?.battery_level && tag.latest_ping.battery_level < 20)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-primary-600">
                TagsTrackr
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-700">
                <User className="h-5 w-5 mr-2" />
                {user?.email}
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-5 w-5 mr-1" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <Link 
              href="/register-tag"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Tag
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Total Tags</h3>
              <p className="text-3xl font-bold text-primary-600">{activeTags.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Online</h3>
              <p className="text-3xl font-bold text-green-600">{onlineTags.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Low Battery</h3>
              <p className="text-3xl font-bold text-yellow-600">{lowBatteryTags.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Offline</h3>
              <p className="text-3xl font-bold text-red-600">{activeTags.length - onlineTags.length}</p>
            </div>
          </div>

          {/* Tags List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Your Tags</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {tags.length === 0 ? (
                <div className="p-6 text-center">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tags yet</h3>
                  <p className="text-gray-500 mb-4">
                    Get started by registering your first GPS tag
                  </p>
                  <Link 
                    href="/register-tag"
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    Register Your First Tag
                  </Link>
                </div>
              ) : (
                tags.map((tag) => (
                  <div key={tag.id} className="p-6 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <MapPin className="h-8 w-8 text-primary-600" />
                      <div>
                        <h3 className="font-medium">{tag.name || tag.tag_id}</h3>
                        <p className="text-sm text-gray-500">
                          {tag.description || 'No description'}
                        </p>
                        <p className="text-xs text-gray-400">
                          Last ping: {tag.last_ping_time}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex items-center text-sm text-gray-500">
                          <Battery className="h-4 w-4 mr-1" />
                          {tag.battery_level || tag.latest_ping?.battery_level || 'Unknown'}%
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          tag.latest_ping && tag.latest_ping.timestamp &&
                          new Date(tag.latest_ping.timestamp) > new Date(Date.now() - 30 * 60 * 1000)
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {tag.latest_ping && tag.latest_ping.timestamp &&
                          new Date(tag.latest_ping.timestamp) > new Date(Date.now() - 30 * 60 * 1000)
                            ? 'Online'
                            : 'Offline'}
                        </div>
                      </div>
                      <Link
                        href={`/track/${tag.tag_id}`}
                        className="bg-primary-600 text-white px-3 py-1 rounded text-sm hover:bg-primary-700"
                      >
                        Track
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href="/register-tag"
                  className="block w-full bg-primary-600 text-white text-center py-2 rounded hover:bg-primary-700"
                >
                  Register New Tag
                </Link>
                <Link
                  href="/admin"
                  className="block w-full bg-gray-600 text-white text-center py-2 rounded hover:bg-gray-700"
                >
                  Admin Panel
                </Link>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Getting Started</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Register your GPS tags</li>
                <li>• Monitor real-time locations</li>
                <li>• Set up geofence alerts</li>
                <li>• Track battery levels</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 