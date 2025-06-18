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
  description: string
  is_active: boolean
  battery_level: number
  created_at: string
  latest_ping?: {
    latitude: number
    longitude: number
    battery_level: number
    timestamp: string
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
          last_ping_time: latestPing ? new Date(latestPing.timestamp).toLocaleString() : 'No pings yet'
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
                      <div className="text-center">
                        <div className="flex items-center">
                                                  <Battery 
                          className={`h-5 w-5 mr-1 ${
                            (tag.latest_ping?.battery_level ?? 0) > 20 ? 'text-green-500' : 'text-yellow-500'
                          }`} 
                        />
                        <span>{tag.latest_ping?.battery_level ?? '--'}%</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          onlineTags.includes(tag) 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {onlineTags.includes(tag) ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      <Link 
                        href={`/track/${tag.tag_id}`}
                        className="bg-primary-100 text-primary-700 px-4 py-2 rounded-lg hover:bg-primary-200"
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
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link 
              href="/admin"
              className="bg-blue-50 p-6 rounded-lg border border-blue-200 hover:bg-blue-100"
            >
              <h3 className="font-medium text-blue-900">Test GPS Simulator</h3>
              <p className="text-sm text-blue-700 mt-2">
                Generate test GPS pings to see your tags in action
              </p>
            </Link>
            <Link 
              href="/register-tag"
              className="bg-green-50 p-6 rounded-lg border border-green-200 hover:bg-green-100"
            >
              <h3 className="font-medium text-green-900">Add New Tag</h3>
              <p className="text-sm text-green-700 mt-2">
                Register a new GPS tracking device
              </p>
            </Link>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-900">Need Help?</h3>
              <p className="text-sm text-gray-700 mt-2">
                Check out our setup guide and documentation
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 