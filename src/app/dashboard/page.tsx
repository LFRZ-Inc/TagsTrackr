'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  MapPin, 
  Plus, 
  Battery, 
  Clock, 
  Eye, 
  Filter,
  Search,
  User,
  Settings,
  RefreshCw,
  BarChart3,
  AlertTriangle,
  Signal,
  Folder,
  Map,
  LogOut
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import AdBanner from '@/components/ads/AdBanner'

interface Tag {
  id: string
  tag_id: string
  name: string
  description: string | null
  is_active: boolean | null
  battery_level: number | null
  last_seen_at: string | null
  group_name: string | null
  current_location?: {
    latitude: number
    longitude: number
  }
}

interface DashboardStats {
  totalTags: number
  activeTags: number
  lowBatteryTags: number
  offlineTags: number
}

export default function Dashboard() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [filteredTags, setFilteredTags] = useState<Tag[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalTags: 0,
    activeTags: 0,
    lowBatteryTags: 0,
    offlineTags: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'low_battery'>('all')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [groupingTag, setGroupingTag] = useState<string | null>(null)
  const [realTimeEnabled, setRealTimeEnabled] = useState(true)

  const router = useRouter()
  const { userTags: storeTags } = useAppStore()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchTags()
      
      // Setup real-time subscription
      if (realTimeEnabled) {
        const subscription = supabase
          .channel('dashboard_updates')
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'tags',
              filter: `user_id=eq.${user.id}`
            }, 
            (payload) => {
              console.log('Tag update received:', payload)
              fetchTags() // Refresh tags on any change
            }
          )
          .on('postgres_changes', 
            { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'gps_pings'
            }, 
            (payload) => {
              console.log('New ping received:', payload)
              // Update specific tag with new location
              handleNewPing(payload.new as any)
            }
          )
          .subscribe()

        return () => {
          subscription.unsubscribe()
        }
      }
    }
  }, [user, realTimeEnabled])

  useEffect(() => {
    // Filter tags based on search term, status filter, and group
    let filtered = tags

    if (searchTerm) {
      filtered = filtered.filter(tag => 
        tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tag.tag_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tag.description && tag.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(tag => {
        switch (filterStatus) {
          case 'active':
            return tag.is_active === true
          case 'inactive':
            return tag.is_active === false
          case 'low_battery':
            return (tag.battery_level ?? 100) < 20
          default:
            return true
        }
      })
    }

    if (selectedGroup !== 'all') {
      filtered = filtered.filter(tag => tag.group_name === selectedGroup)
    }

    setFilteredTags(filtered)
  }, [tags, searchTerm, filterStatus, selectedGroup])

  const handleNewPing = (ping: any) => {
    setTags(prevTags => 
      prevTags.map(tag => {
        if (tag.id === ping.tag_id) {
          return {
            ...tag,
            current_location: {
              latitude: ping.latitude,
              longitude: ping.longitude
            },
            battery_level: ping.battery_level || tag.battery_level,
            last_seen_at: ping.timestamp || ping.created_at
          }
        }
        return tag
      })
    )
  }

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/login')
    }
  }

  async function fetchTags() {
    if (!user) return
    
    try {
      setRefreshing(true)
      
      // Fetch tags with latest location data
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select(`
          *,
          latest_location:gps_pings!gps_pings_tag_id_fkey(
            latitude,
            longitude,
            timestamp
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (tagsError) throw tagsError

      // Process tags to include current location
      const processedTags = tagsData?.map(tag => ({
        ...tag,
        current_location: tag.latest_location?.[0] ? {
          latitude: tag.latest_location[0].latitude,
          longitude: tag.latest_location[0].longitude
        } : undefined
      })) || []

      setTags(processedTags)
      
      // Calculate stats
      const totalTags = processedTags.length
      const activeTags = processedTags.filter(tag => tag.is_active).length
      const lowBatteryTags = processedTags.filter(tag => (tag.battery_level ?? 100) < 20).length
      const offlineTags = processedTags.filter(tag => !tag.is_active).length

      setStats({
        totalTags,
        activeTags,
        lowBatteryTags,
        offlineTags
      })
    } catch (error) {
      console.error('Error fetching tags:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchTags()
  }

  const handleGroupTag = async (tagId: string, groupName: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .update({ group_name: groupName })
        .eq('id', tagId)

      if (error) throw error

      // Update local state
      setTags(prevTags =>
        prevTags.map(tag =>
          tag.id === tagId ? { ...tag, group_name: groupName } : tag
        )
      )

      setShowGroupModal(false)
      setNewGroupName('')
      setGroupingTag(null)
    } catch (error) {
      console.error('Error updating group:', error)
      alert('Failed to update tag group')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getUniqueGroups = () => {
    const groups = tags
      .map(tag => tag.group_name)
      .filter((group, index, array) => group && array.indexOf(group) === index)
    return groups as string[]
  }

  const getBatteryColor = (level: number | null) => {
    if (!level) return 'text-gray-500'
    if (level > 50) return 'text-green-600'
    if (level > 20) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getBatteryIcon = (level: number | null) => {
    if (!level || level > 75) return '🔋'
    if (level > 50) return '🔋'
    if (level > 25) return '🪫'
    return '🪫'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading your tags...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-primary-600">
                TagsTrackr
              </Link>
              {realTimeEnabled && (
                <div className="ml-4 flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-sm font-medium hidden sm:inline">Live Updates</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-700">
                <User className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">{user?.email}</span>
              </div>
              <button
                onClick={() => setRealTimeEnabled(!realTimeEnabled)}
                className={`p-2 rounded-md ${realTimeEnabled ? 'text-green-600' : 'text-gray-400'}`}
                title="Toggle real-time updates"
              >
                <Signal className="h-5 w-5" />
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-900"
                title="Refresh data"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/account"
                className="p-2 text-gray-600 hover:text-gray-900"
                title="Account settings"
              >
                <User className="h-5 w-5" />
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-5 w-5 mr-1" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Monitor and manage your GPS tags</p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-2">
              <Link
                href="/register-tag"
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tag
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-full">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Total Tags</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTags}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-full">
                <Signal className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeTags}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Battery className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Low Battery</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.lowBatteryTags}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Offline</p>
                <p className="text-2xl font-bold text-red-600">{stats.offlineTags}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ad Banner */}
        <AdBanner pageContext="dashboard" className="mb-6" />

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 w-full sm:w-64"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                  <option value="low_battery">Low Battery</option>
                </select>

                {/* Group Filter */}
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Groups</option>
                  {getUniqueGroups().map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
                >
                  <Map className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tags Display */}
        {filteredTags.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {tags.length === 0 ? 'No tags registered yet' : 'No tags match your filters'}
            </h3>
            <p className="text-gray-600 mb-6">
              {tags.length === 0 
                ? 'Get started by registering your first GPS tag.' 
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
            {tags.length === 0 && (
              <Link
                href="/register-tag"
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Register First Tag
              </Link>
            )}
          </div>
        ) : (
          <div className={`grid gap-4 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {filteredTags.map((tag) => (
              <div key={tag.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-medium text-gray-900 truncate">{tag.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tag.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {tag.is_active ? 'Active' : 'Offline'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{tag.description || 'No description'}</p>
                      <p className="text-xs text-gray-500 mt-1">ID: {tag.tag_id}</p>
                      {tag.group_name && (
                        <div className="flex items-center mt-1">
                          <Folder className="h-3 w-3 text-gray-400 mr-1" />
                          <span className="text-xs text-gray-500">{tag.group_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <div className="flex items-center text-sm">
                        <Battery className={`h-4 w-4 mr-1 ${getBatteryColor(tag.battery_level)}`} />
                        <span className={getBatteryColor(tag.battery_level)}>
                          {tag.battery_level ?? '--'}%
                        </span>
                      </div>
                      {tag.current_location && (
                        <div className="flex items-center text-xs text-gray-500">
                          <MapPin className="h-3 w-3 mr-1" />
                          Location: Yes
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {tag.last_seen_at ? formatTimestamp(tag.last_seen_at) : 'Never seen'}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Link
                      href={`/track/${tag.tag_id}`}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Track
                    </Link>
                    <button
                      onClick={() => {
                        setGroupingTag(tag.id)
                        setShowGroupModal(true)
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                    >
                      <Folder className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assign to Group</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Existing Groups</label>
                <div className="space-y-2">
                  {getUniqueGroups().map(group => (
                    <button
                      key={group}
                      onClick={() => handleGroupTag(groupingTag!, group)}
                      className="w-full text-left px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Create New Group</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Group name"
                  />
                  <button
                    onClick={() => handleGroupTag(groupingTag!, newGroupName)}
                    disabled={!newGroupName.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowGroupModal(false)
                  setNewGroupName('')
                  setGroupingTag(null)
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleGroupTag(groupingTag!, '')}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Remove from Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 