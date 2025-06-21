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
  ToggleRight,
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import AdBanner from '@/components/ads/AdBanner'
import ProductTierSelection from '@/components/ProductTierSelection'

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

interface UserData {
  is_premium: boolean;
  device_limit: number;
  current_devices: number;
  owned_tags: number;
}

interface Subscription {
  id: string;
  plan_type: string;
  devices_covered: number;
  price_monthly: number;
  renewal_date: string;
  is_active: boolean;
}

interface AdCredit {
  balance: number;
  total_earned: number;
  total_redeemed: number;
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
  const [activeTab, setActiveTab] = useState('overview')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showAds, setShowAds] = useState(true)
  const [redemptionLoading, setRedemptionLoading] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [devices, setDevices] = useState<any[]>([])
  const [showDevicePurchase, setShowDevicePurchase] = useState(false)
  
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

  const handleDevicePurchase = async (tier: 'standard' | 'returnable', adhesive?: boolean) => {
    // In a real app, integrate with Stripe here
    alert(`Device purchase simulation: ${tier} tag ${adhesive ? '(adhesive)' : '(non-adhesive)'}\nPrice: $${tier === 'standard' ? '10' : '15'}\n\nIn production, this would redirect to Stripe checkout.`)
    setShowDevicePurchase(false)
  }

  const redeemCredits = async (amount: number, type: string) => {
    try {
      const response = await fetch('/api/ads/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, redemption_type: type })
      })

      const data = await response.json()
      if (response.ok) {
        alert(data.message)
        await loadAccountData()
      } else {
        alert(data.error || 'Failed to redeem credits')
      }
    } catch (error) {
      console.error('Error redeeming credits:', error)
      alert('Failed to redeem credits')
    }
  }

  const upgradeToSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          planType: 'basic',
          devicesCount: 5,
          stripeSubscriptionId: 'simulated_sub_' + Date.now()
        })
      })

      const data = await response.json()
      if (response.ok) {
        alert(data.message)
        await loadAccountData()
      } else {
        alert(data.error || 'Failed to create subscription')
      }
    } catch (error) {
      console.error('Error creating subscription:', error)
      alert('Failed to create subscription')
    }
  }

  const loadAccountData = async () => {
    try {
      setLoading(true)

      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      // Load user data and subscription
      const [userResponse, devicesResponse, subscriptionResponse, creditsResponse] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        fetch('/api/device/register'),
        fetch('/api/subscription/manage'),
        supabase.from('ad_credits').select('balance').eq('user_id', user.id).single()
      ])

      if (userResponse.data) {
        setUserData(userResponse.data)
      }

      if (devicesResponse.ok) {
        const devicesData = await devicesResponse.json()
        setDevices([...(devicesData.ownedDevices || []), ...(devicesData.sharedDevices || [])])
      }

      if (subscriptionResponse.ok) {
        const subData = await subscriptionResponse.json()
        setSubscription(subData.subscription)
        setUserData(prev => prev ? { ...prev, ...subData.user } : subData.user)
      }

      if (creditsResponse.data) {
        setAdCredits(prev => ({ ...prev, balance: creditsResponse.data.balance || 0 }))
      }

    } catch (error) {
      console.error('Error loading account data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading account...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: User },
    { id: 'devices', name: 'My Devices', icon: CreditCard },
    { id: 'subscription', name: 'Subscription', icon: CreditCard },
    { id: 'credits', name: 'Ad Credits', icon: Gift },
    { id: 'sharing', name: 'Family Sharing', icon: User },
    { id: 'settings', name: 'Settings', icon: MapPin }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Show ads for non-premium users */}
      {!userData?.is_premium && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <AdBanner context="account" />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-2">Manage your TagsTrackr account and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Overview</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <CreditCard className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">{userData?.current_devices || 0}</div>
                      <div className="text-sm text-gray-600">Active Devices</div>
                    </div>
                    
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Star className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">
                        {userData?.is_premium ? 'Premium' : 'Free'}
                      </div>
                      <div className="text-sm text-gray-600">Account Type</div>
                    </div>
                    
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900">${adCredits?.credit_balance.toFixed(2) || '0.00'}</div>
                      <div className="text-sm text-gray-600">Ad Credits</div>
                    </div>
                  </div>

                  {!userData?.is_premium && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-semibold text-blue-900 mb-2">Upgrade to Premium</h3>
                      <p className="text-blue-800 text-sm mb-3">
                        Get unlimited devices, real-time alerts, family sharing, and no ads for just $5/month.
                      </p>
                      <button
                        onClick={upgradeToSubscription}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                      >
                        Upgrade Now
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setShowDevicePurchase(true)}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                    >
                      <CreditCard className="h-6 w-6 text-blue-600 mb-2" />
                      <div className="font-medium text-gray-900">Purchase Device</div>
                      <div className="text-sm text-gray-600">Add a new TagsTrackr device</div>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('sharing')}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                    >
                      <User className="h-6 w-6 text-green-600 mb-2" />
                      <div className="font-medium text-gray-900">Share Device</div>
                      <div className="text-sm text-gray-600">Give family access to your tags</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Devices Tab */}
            {activeTab === 'devices' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">My Devices</h2>
                    <button
                      onClick={() => setShowDevicePurchase(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Add Device
                    </button>
                  </div>

                  {devices.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No devices yet</h3>
                      <p className="text-gray-600 mb-4">Get started by purchasing your first TagsTrackr device.</p>
                      <button
                        onClick={() => setShowDevicePurchase(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                      >
                        Purchase Device
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {devices.map((device) => (
                        <div key={device.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-gray-900">{device.tag_id}</h3>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              device.type === 'standard' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {device.type}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div>Status: {device.is_active ? 'Active' : 'Inactive'}</div>
                            <div>Data: {device.data_remaining_mb || 0} MB remaining</div>
                            {device.battery_level && (
                              <div>Battery: {device.battery_level}%</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription</h2>
                  
                  {subscription ? (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 capitalize">
                            {subscription.plan_type} Plan
                          </h3>
                          <p className="text-gray-600">
                            ${subscription.price_monthly}/month • {subscription.devices_covered} devices covered
                          </p>
                        </div>
                        <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Current Benefits</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• No advertisements</li>
                            <li>• Real-time location tracking</li>
                            <li>• Geofence alerts</li>
                            <li>• Family sharing</li>
                            <li>• Movement detection</li>
                            <li>• Unlimited location history</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Billing Details</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>Next billing: {new Date(subscription.renewal_date).toLocaleDateString()}</div>
                            <div>Devices used: {userData?.current_devices || 0} / {subscription.devices_covered}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Subscription</h3>
                      <p className="text-gray-600 mb-6">
                        Upgrade to Premium for advanced features and unlimited devices.
                      </p>
                      
                      <div className="bg-blue-50 rounded-lg p-6 mb-6">
                        <h4 className="font-semibold text-blue-900 mb-3">Premium Features ($5/month)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                          <ul className="space-y-1">
                            <li>• No advertisements</li>
                            <li>• Up to 5 devices</li>
                            <li>• Real-time alerts</li>
                          </ul>
                          <ul className="space-y-1">
                            <li>• Family sharing</li>
                            <li>• Geofence tracking</li>
                            <li>• Unlimited history</li>
                          </ul>
                        </div>
                      </div>
                      
                      <button
                        onClick={upgradeToSubscription}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                      >
                        Start Premium - $5/month
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ad Credits Tab */}
            {activeTab === 'credits' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Ad Credits</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">${adCredits?.credit_balance.toFixed(2)}</div>
                      <div className="text-sm text-gray-600">Available Balance</div>
                    </div>
                    
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">${adCredits?.total_earned.toFixed(2)}</div>
                      <div className="text-sm text-gray-600">Total Earned</div>
                    </div>
                    
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">${adCredits?.total_redeemed.toFixed(2)}</div>
                      <div className="text-sm text-gray-600">Total Redeemed</div>
                    </div>
                  </div>

                  {adCredits?.credit_balance >= 5 ? (
                    <div className="bg-green-50 rounded-lg p-6">
                      <h3 className="font-semibold text-green-900 mb-3">Redeem Your Credits</h3>
                      <p className="text-green-800 text-sm mb-4">
                        You have enough credits to redeem! Choose how you'd like to use them:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          onClick={() => redeemCredits(5, 'tag_discount')}
                          className="p-4 border border-green-200 rounded-lg hover:bg-green-100 text-left"
                        >
                          <div className="font-medium text-green-900">$5 Tag Discount</div>
                          <div className="text-sm text-green-700">Apply to your next device purchase</div>
                        </button>
                        
                        <button
                          onClick={() => redeemCredits(5, 'subscription_credit')}
                          className="p-4 border border-green-200 rounded-lg hover:bg-green-100 text-left"
                        >
                          <div className="font-medium text-green-900">1 Month Premium</div>
                          <div className="text-sm text-green-700">Free month of Premium subscription</div>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="font-medium text-gray-900 mb-2">How to Earn Credits</h3>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• View ads on the dashboard: $0.01 each (limit 5/day)</li>
                        <li>• Participate in surveys: $0.25 each</li>
                        <li>• Refer friends: $1.00 per signup</li>
                        <li>• Report found tags: $5.00 reward</li>
                      </ul>
                      <div className="mt-4 p-3 bg-blue-100 rounded-md">
                        <p className="text-sm text-blue-800">
                          💡 You need $5.00 to redeem credits. Keep viewing ads and you'll get there!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Other tabs would go here */}
            {activeTab === 'sharing' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Family Sharing</h2>
                <p className="text-gray-600">Family sharing component would be integrated here.</p>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Settings</h2>
                <p className="text-gray-600">Account settings would be here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Device Purchase Modal */}
      {showDevicePurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Purchase Device</h2>
              <button
                onClick={() => setShowDevicePurchase(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <ProductTierSelection onSelectTier={handleDevicePurchase} />
          </div>
        </div>
      )}
    </div>
  )
} 