'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, User, LogOut } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function TestDashboard() {
  const supabase = createSupabaseClient()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      console.log('🔍 Checking user authentication...')
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('❌ Auth error:', error)
        throw error
      }
      
      if (!user) {
        console.log('❌ No user found, redirecting to login')
        router.push('/login')
        return
      }
      
      console.log('✅ User authenticated:', user.email)
      setUser(user)
    } catch (error) {
      console.error('❌ Error checking user:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access the test dashboard</p>
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
                <MapPin className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">TagsTrackr Test</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">{user?.email}</span>
              </div>
              
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Test Dashboard</h1>
          <p className="text-gray-600 mt-2">Minimal dashboard to test functionality</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Authentication:</span>
              <span className="text-green-600 font-medium">✅ Working</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Database Connection:</span>
              <span className="text-green-600 font-medium">✅ Working</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">User:</span>
              <span className="text-gray-900 font-medium">{user.email}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 