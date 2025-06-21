'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  User, 
  Mail, 
  Lock, 
  ArrowLeft, 
  Save, 
  Trash2, 
  MapPin,
  CreditCard,
  Eye,
  EyeOff
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  created_at: string
}

interface UserStats {
  totalTags: number
  activeTags: number
  totalPings: number
  lastPing: string | null
}

export default function AccountPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('profile')
  const [showNewPassword, setShowNewPassword] = useState(false)
  
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: ''
  })
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  })

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
      await Promise.all([
        fetchUserProfile(user.id),
        fetchUserStats(user.id)
      ])
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  async function fetchUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setProfile(data)
        setProfileData({
          full_name: data.full_name || '',
          phone: data.phone || ''
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  async function fetchUserStats(userId: string) {
    try {
      const { data: tags, error: tagsError } = await supabase
        .from('tags')
        .select('id, is_active')
        .eq('user_id', userId)

      if (tagsError) throw tagsError

      const tagIds = tags?.map(t => t.id) || []
      let totalPings = 0
      let lastPing = null

      if (tagIds.length > 0) {
        const { count, error: countError } = await supabase
          .from('gps_pings')
          .select('*', { count: 'exact', head: true })
          .in('tag_id', tagIds)

        if (!countError) totalPings = count || 0

        const { data: recentPing, error: pingError } = await supabase
          .from('gps_pings')
          .select('created_at')
          .in('tag_id', tagIds)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!pingError && recentPing) lastPing = recentPing.created_at
      }

      setStats({
        totalTags: tags?.length || 0,
        activeTags: tags?.filter(t => t.is_active).length || 0,
        totalPings,
        lastPing
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats({
        totalTags: 0,
        activeTags: 0,
        totalPings: 0,
        lastPing: null
      })
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user?.id,
          email: user?.email,
          full_name: profileData.full_name,
          phone: profileData.phone,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setSuccess('Profile updated successfully!')
      await fetchUserProfile(user!.id)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match')
      setSaving(false)
      return
    }

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      setSuccess('Password updated successfully!')
      setPasswordData({
        newPassword: '',
        confirmPassword: ''
      })
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    if (!confirm('This will permanently delete all your tags and location history. Continue?')) {
      return
    }

    try {
      setSaving(true)
      
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Failed to delete account')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading account settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/dashboard" className="inline-flex items-center text-primary-600 hover:text-primary-500 mb-4">
                <ArrowLeft className="h-5 w-5 mr-1" />
                Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
              <p className="mt-2 text-gray-600">Manage your profile, security, and subscription settings</p>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">TagsTrackr</span>
            </div>
          </div>
        </div>

        {/* Account Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Tags</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalTags}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <div className="h-6 w-6 bg-green-600 rounded-full" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Tags</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeTags}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Signal className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">GPS Pings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Last Activity</p>
                  <p className="text-sm font-bold text-gray-900">
                    {stats.lastPing ? new Date(stats.lastPing).toLocaleDateString() : 'No activity'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-white shadow rounded-lg">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'profile', name: 'Profile', icon: User },
                { id: 'security', name: 'Security', icon: Lock },
                { id: 'subscription', name: 'Subscription', icon: CreditCard }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm">
                {success}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="full_name"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                      New Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        id="newPassword"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      minLength={6}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Lock className="h-4 w-4 mr-2" />
                      )}
                      Update Password
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription</h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">Free Plan</h4>
                      <p className="text-gray-600">Basic GPS tracking for up to 3 tags</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">$0</p>
                      <p className="text-gray-500">per month</p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h5 className="font-medium text-gray-900 mb-2">Plan Features:</h5>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Up to 3 GPS tags</li>
                      <li>• Real-time location tracking</li>
                      <li>• 30-day location history</li>
                      <li>• Email notifications</li>
                      <li>• Basic support</li>
                    </ul>
                  </div>
                  
                  <div className="mt-6">
                    <button className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                      Upgrade to Pro
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="p-6">
            <h3 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h3>
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-red-800">Delete Account</h4>
                  <p className="text-sm text-red-600 mt-1">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={handleDeleteAccount}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}