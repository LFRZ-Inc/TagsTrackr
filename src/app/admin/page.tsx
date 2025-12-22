'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, Settings, Play, Square, RotateCcw, Database, Zap, TestTube, Shield } from 'lucide-react'
import { simulateRoute } from '@/lib/pingSimulator'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

interface DeviceInventory {
  tag_id: string
  type: string
  is_active: boolean
  is_rented: boolean
  owner_email: string | null
  data_remaining_mb: number
  battery_level: number | null
  last_ping_at: string | null
  created_at: string
}

interface RentalOverview {
  id: string
  tag_id: string
  renter_email: string
  rented_at: string
  returned_at: string | null
  return_approved: boolean
  refund_processed: boolean
  refund_amount: number
  data_remaining_mb: number
}

interface SubscriptionAnalytics {
  plan_type: string
  active_subscriptions: number
  monthly_revenue: number
  avg_devices_per_sub: number
}

// Force dynamic rendering for admin page
export const dynamic = 'force-dynamic'

export default function AdminDashboard() {
  const { user, setUser } = useAppStore()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState('inventory')
  const [inventory, setInventory] = useState<DeviceInventory[]>([])
  const [rentals, setRentals] = useState<RentalOverview[]>([])
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Check if user is admin
      const adminEmails = ['admin@tagstrackr.com', 'contact@tagstrackr.com']
      const userEmail = user.email?.toLowerCase() || ''
      
      if (adminEmails.includes(userEmail) || userEmail.includes('admin')) {
        setIsAdmin(true)
        await loadAdminData()
      } else {
        router.push('/dashboard')
      }
    }

    checkUser()
  }, [router, supabase])

  const loadAdminData = async () => {
    try {
      setLoading(true)
      
      // Load device inventory
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('admin_device_inventory')
        .select('*')
        .order('created_at', { ascending: false })

      if (inventoryError) {
        console.error('Error loading inventory:', inventoryError)
      } else {
        setInventory(inventoryData || [])
      }

      // Load rental overview
      const { data: rentalData, error: rentalError } = await supabase
        .from('admin_rental_overview')
        .select('*')
        .order('rented_at', { ascending: false })

      if (rentalError) {
        console.error('Error loading rentals:', rentalError)
      } else {
        setRentals(rentalData || [])
      }

      // Load subscription analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('admin_subscription_analytics')
        .select('*')

      if (analyticsError) {
        console.error('Error loading analytics:', analyticsError)
      } else {
        setAnalytics(analyticsData || [])
      }

    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const approveReturn = async (rentalId: string) => {
    try {
      const { error } = await supabase
        .from('rental_history')
        .update({ return_approved: true })
        .eq('id', rentalId)

      if (error) {
        console.error('Error approving return:', error)
        alert('Failed to approve return')
      } else {
        alert('Return approved successfully!')
        await loadAdminData()
      }
    } catch (error) {
      console.error('Error approving return:', error)
      alert('Failed to approve return')
    }
  }

  const processRefund = async (rentalId: string) => {
    try {
      const { error } = await supabase
        .from('rental_history')
        .update({ refund_processed: true })
        .eq('id', rentalId)

      if (error) {
        console.error('Error processing refund:', error)
        alert('Failed to process refund')
      } else {
        alert('Refund processed successfully!')
        await loadAdminData()
      }
    } catch (error) {
      console.error('Error processing refund:', error)
      alert('Failed to process refund')
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You do not have admin privileges.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  const totalRevenue = analytics.reduce((sum: number, item: { monthly_revenue: number }) => sum + item.monthly_revenue, 0)
  const totalSubscriptions = analytics.reduce((sum: number, item: { active_subscriptions: number }) => sum + item.active_subscriptions, 0)
  const activeDevices = inventory.filter(device => device.is_active).length
  const pendingReturns = rentals.filter(rental => rental.returned_at && !rental.return_approved).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">TagsTrackr Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage devices, rentals, and subscriptions</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Monthly Revenue</h3>
            <p className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Active Subscriptions</h3>
            <p className="text-2xl font-bold text-blue-600">{totalSubscriptions}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Active Devices</h3>
            <p className="text-2xl font-bold text-purple-600">{activeDevices}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Pending Returns</h3>
            <p className="text-2xl font-bold text-orange-600">{pendingReturns}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'inventory'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Device Inventory
              </button>
              <button
                onClick={() => setActiveTab('rentals')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'rentals'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Rental Management
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'analytics'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Analytics
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Device Inventory Tab */}
            {activeTab === 'inventory' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Inventory</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tag ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Owner
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data Remaining
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Battery
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Ping
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inventory.map((device) => (
                        <tr key={device.tag_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {device.tag_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              device.type === 'standard' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {device.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              device.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {device.is_active ? 'Active' : 'Inactive'}
                            </span>
                            {device.is_rented && (
                              <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Rented
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {device.owner_email || 'Unassigned'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {device.data_remaining_mb} MB
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {device.battery_level ? `${device.battery_level}%` : 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {device.last_ping_at 
                              ? new Date(device.last_ping_at).toLocaleDateString()
                              : 'Never'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Rental Management Tab */}
            {activeTab === 'rentals' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Rental Management</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tag ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Renter
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rented Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Return Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Refund
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rentals.map((rental) => (
                        <tr key={rental.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {rental.tag_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {rental.renter_email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(rental.rented_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {rental.returned_at ? (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                rental.return_approved 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {rental.return_approved ? 'Approved' : 'Pending Review'}
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                In Use
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              rental.refund_processed 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {rental.refund_processed ? 'Processed' : `$${rental.refund_amount} Pending`}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            {rental.returned_at && !rental.return_approved && (
                              <button
                                onClick={() => approveReturn(rental.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Approve Return
                              </button>
                            )}
                            {rental.return_approved && !rental.refund_processed && (
                              <button
                                onClick={() => processRefund(rental.id)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Process Refund
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription Analytics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {analytics.map((item) => (
                    <div key={item.plan_type} className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                        {item.plan_type} Plan
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Active Subscriptions:</span>
                          <span className="font-semibold">{item.active_subscriptions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Monthly Revenue:</span>
                          <span className="font-semibold text-green-600">${item.monthly_revenue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Devices per Sub:</span>
                          <span className="font-semibold">{item.avg_devices_per_sub.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 