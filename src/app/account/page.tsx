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
  EyeOff,
  DollarSign,
  Star,
  Gift,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  is_premium: boolean
  created_at: string
}

interface AdCredits {
  user_id: string
  credit_balance: number
  total_earned: number
  total_redeemed: number
  daily_views_count: number
  last_view_date: string | null
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
  const [adCredits, setAdCredits] = useState<AdCredits | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('profile')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showAds, setShowAds] = useState(true)
  const [redemptionLoading, setRedemptionLoading] = useState(false)
  
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
        fetchUserStats(user.id),
        fetchAdCredits(user.id)
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

  async function fetchAdCredits(userId: string) {
    try {
      const { data, error } = await supabase
        .from('ad_credits')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setAdCredits(data)
        setShowAds(!data.daily_views_count || data.daily_views_count < 5)
      }
    } catch (error) {
      console.error('Error fetching ad credits:', error)
    }
  }

  const handlePremiumUpgrade = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_premium: true })
        .eq('id', user?.id)

      if (error) throw error

      setSuccess('Successfully upgraded to Premium!')
      await fetchUserProfile(user!.id)
    } catch (err: any) {
      setError(err.message || 'Failed to upgrade to Premium')
    } finally {
      setSaving(false)
    }
  }

  const handleRedeemCredits = async (type: string, amount: number) => {
    if (!user || !adCredits) return

    setRedemptionLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/ads/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          redemptionType: type,
          creditAmount: amount,
          description: `Redeemed ${amount} credits for ${type}`
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Redemption failed')
      }

      setSuccess(`Successfully redeemed $${amount.toFixed(2)} in credits!`)
      await fetchAdCredits(user.id)
    } catch (err: any) {
      setError(err.message || 'Failed to redeem credits')
    } finally {
      setRedemptionLoading(false)
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
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-primary-600">
                TagsTrackr
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600">Manage your account preferences and settings</p>
        </div>

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'profile'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <User className="h-4 w-4 inline mr-2" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'security'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Lock className="h-4 w-4 inline mr-2" />
                Security
              </button>
              <button
                onClick={() => setActiveTab('ads')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'ads'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <DollarSign className="h-4 w-4 inline mr-2" />
                Ads & Credits
              </button>
              <button
                onClick={() => setActiveTab('subscription')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'subscription'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Star className="h-4 w-4 inline mr-2" />
                Premium
              </button>
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
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
                  
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="pl-10 w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={profileData.full_name}
                          onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                          className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Enter your full name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                </div>

                {/* Account Stats */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Account Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{stats?.totalTags || 0}</div>
                      <div className="text-sm text-blue-700">Total Tags</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{stats?.activeTags || 0}</div>
                      <div className="text-sm text-green-700">Active Tags</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{stats?.totalPings || 0}</div>
                      <div className="text-sm text-purple-700">GPS Pings</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {stats?.lastPing ? new Date(stats.lastPing).toLocaleDateString() : 'Never'}
                      </div>
                      <div className="text-sm text-orange-700">Last Activity</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                  
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          className="pl-10 pr-10 w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Enter new password"
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>

                {/* Danger Zone */}
                <div className="border-t pt-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-red-900 mb-2">Danger Zone</h3>
                    <p className="text-sm text-red-700 mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={saving}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Ads & Credits Tab */}
            {activeTab === 'ads' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Ad Credits</h3>
                  
                  {profile?.is_premium ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                      <div className="flex items-center mb-3">
                        <Star className="h-6 w-6 text-yellow-500 mr-2" />
                        <h4 className="text-lg font-semibold text-yellow-900">Premium Member</h4>
                      </div>
                      <p className="text-yellow-800 mb-4">
                        As a premium member, you don't see ads and don't earn ad credits. Enjoy an ad-free experience!
                      </p>
                      <p className="text-sm text-yellow-700">
                        Want to support us further? You can still view sponsored content optionally to earn bonus credits.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Credits Overview */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                            <div>
                              <div className="text-2xl font-bold text-green-900">
                                ${adCredits?.credit_balance.toFixed(2) || '0.00'}
                              </div>
                              <div className="text-sm text-green-700">Current Balance</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <Eye className="h-5 w-5 text-blue-600 mr-2" />
                            <div>
                              <div className="text-2xl font-bold text-blue-900">
                                {adCredits?.daily_views_count || 0}/5
                              </div>
                              <div className="text-sm text-blue-700">Daily Views</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <Gift className="h-5 w-5 text-purple-600 mr-2" />
                            <div>
                              <div className="text-2xl font-bold text-purple-900">
                                ${adCredits?.total_earned.toFixed(2) || '0.00'}
                              </div>
                              <div className="text-sm text-purple-700">Total Earned</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* How it works */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h4 className="font-semibold text-blue-900 mb-3">How Ad Credits Work</h4>
                        <ul className="space-y-2 text-blue-800 text-sm">
                          <li className="flex items-start">
                            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
                            Earn $0.01 for each ad you view (up to 5 per day)
                          </li>
                          <li className="flex items-start">
                            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
                            Redeem $5.00 in credits for tag discounts or Premium trials
                          </li>
                          <li className="flex items-start">
                            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
                            All ads are contextual and non-intrusive
                          </li>
                        </ul>
                      </div>

                      {/* Redemption Options */}
                      {adCredits && adCredits.credit_balance >= 5.0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                          <h4 className="font-semibold text-green-900 mb-4">Redeem Your Credits</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                              onClick={() => handleRedeemCredits('tag_discount', 5.0)}
                              disabled={redemptionLoading}
                              className="flex items-center justify-center p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              <Gift className="h-5 w-5 mr-2" />
                              $5 Tag Discount
                            </button>
                            <button
                              onClick={() => handleRedeemCredits('premium_trial', 5.0)}
                              disabled={redemptionLoading}
                              className="flex items-center justify-center p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                            >
                              <Star className="h-5 w-5 mr-2" />
                              1 Month Premium
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Ad Preferences */}
                      <div className="border-t pt-6">
                        <h4 className="font-semibold text-gray-900 mb-4">Ad Preferences</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium text-gray-700">
                                Show helpful ads
                              </label>
                              <p className="text-xs text-gray-500">
                                Support TagsTrackr by viewing relevant ads and earn credits
                              </p>
                            </div>
                            <button
                              onClick={() => setShowAds(!showAds)}
                              className="relative"
                            >
                              {showAds ? (
                                <ToggleRight className="h-6 w-6 text-green-500" />
                              ) : (
                                <ToggleLeft className="h-6 w-6 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Premium Tab */}
            {activeTab === 'subscription' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Premium Subscription</h3>
                  
                  {profile?.is_premium ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <Star className="h-6 w-6 text-yellow-500 mr-2" />
                        <h4 className="text-xl font-semibold text-yellow-900">Premium Active</h4>
                      </div>
                      <p className="text-yellow-800 mb-4">
                        You're currently enjoying all Premium benefits including ad-free experience, unlimited tags, and priority support.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4">
                          <h5 className="font-semibold text-gray-900 mb-2">Premium Features</h5>
                          <ul className="space-y-1 text-sm text-gray-700">
                            <li>✓ No ads</li>
                            <li>✓ Unlimited GPS tags</li>
                            <li>✓ 1-year location history</li>
                            <li>✓ Priority support</li>
                            <li>✓ Advanced analytics</li>
                          </ul>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <h5 className="font-semibold text-gray-900 mb-2">Billing</h5>
                          <p className="text-sm text-gray-700 mb-2">$5.00/month</p>
                          <p className="text-xs text-gray-500">Next billing: 30 days from activation</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Current Plan */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-semibold text-blue-900">Free Plan</h4>
                            <p className="text-blue-700">Perfect for getting started</p>
                          </div>
                          <div className="text-2xl font-bold text-blue-900">$0/month</div>
                        </div>
                        
                        <ul className="space-y-2 text-blue-800">
                          <li className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            Up to 5 GPS tags
                          </li>
                          <li className="flex items-center">
                            <Eye className="h-4 w-4 mr-2" />
                            See helpful ads (earn credits!)
                          </li>
                          <li className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            Real-time tracking
                          </li>
                          <li className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            30-day location history
                          </li>
                        </ul>
                      </div>

                      {/* Premium Plan */}
                      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-6 relative">
                        <div className="absolute -top-3 left-6">
                          <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">
                            RECOMMENDED
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="flex items-center">
                              <Star className="h-6 w-6 text-yellow-600 mr-2" />
                              <h4 className="text-xl font-semibold text-yellow-900">Premium Plan</h4>
                            </div>
                            <p className="text-yellow-800">For serious travelers and businesses</p>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-yellow-900">$5</div>
                            <div className="text-yellow-700">/month</div>
                          </div>
                        </div>
                        
                        <ul className="space-y-2 text-yellow-800 mb-6">
                          <li className="flex items-center">
                            <span className="w-2 h-2 bg-yellow-600 rounded-full mr-3"></span>
                            No ads - completely ad-free experience
                          </li>
                          <li className="flex items-center">
                            <span className="w-2 h-2 bg-yellow-600 rounded-full mr-3"></span>
                            Unlimited GPS tags
                          </li>
                          <li className="flex items-center">
                            <span className="w-2 h-2 bg-yellow-600 rounded-full mr-3"></span>
                            1-year location history
                          </li>
                          <li className="flex items-center">
                            <span className="w-2 h-2 bg-yellow-600 rounded-full mr-3"></span>
                            Priority customer support
                          </li>
                          <li className="flex items-center">
                            <span className="w-2 h-2 bg-yellow-600 rounded-full mr-3"></span>
                            Advanced analytics & insights
                          </li>
                          <li className="flex items-center">
                            <span className="w-2 h-2 bg-yellow-600 rounded-full mr-3"></span>
                            Custom geofence zones
                          </li>
                        </ul>

                        <button
                          onClick={handlePremiumUpgrade}
                          disabled={saving}
                          className="w-full flex items-center justify-center px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                        >
                          <Star className="h-5 w-5 mr-2" />
                          {saving ? 'Upgrading...' : 'Upgrade to Premium'}
                        </button>
                      </div>

                      {/* Privacy Notice */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h5 className="font-semibold text-gray-900 mb-2">Your Data Is Yours. Your Screen Helps Us Grow.</h5>
                        <p className="text-sm text-gray-700 mb-2">
                          We show helpful, non-targeted ads only to users on the free plan. These are selected based on what you're doing — not who you are.
                        </p>
                        <p className="text-sm text-gray-700">
                          We don't sell your data, track your behavior, or let third parties follow you. We're here to track items, not people.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 