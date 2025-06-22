'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  Home, 
  ArrowLeft, 
  MapPin, 
  BarChart3, 
  Users, 
  Shield, 
  Bell, 
  Battery, 
  Clock,
  Star,
  Crown,
  CheckCircle2
} from 'lucide-react'

export default function WorkingDashboard() {
  const [timestamp, setTimestamp] = useState('')
  
  useEffect(() => {
    const now = new Date()
    const formattedDate = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    const formattedTime = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      timeZoneName: 'short'
    })
    setTimestamp(`${formattedDate} — ${formattedTime}`)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Navigation */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
            <div className="h-4 w-px bg-gray-300"></div>
            <Link 
              href="/register-tag"
              className="inline-flex items-center px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Device List
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Professional Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Dashboard Working – LIVE!
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Your dashboard is live. Choose one of the options below to continue.
            </p>
            
            {/* Dismissible info box */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5" />
                </div>
                <div className="ml-3 text-left">
                  <h3 className="text-sm font-medium text-green-800">
                    Deployment Success
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    The Vercel deployment issue has been resolved. All dashboard variants are now accessible.
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    Deployed at: {timestamp}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Options - Improved Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Simple Dashboard Card */}
            <Link
              href="/dashboard-simple"
              className="group relative bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 hover:shadow-lg"
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-xl mb-4 group-hover:bg-blue-200 transition-colors">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-blue-900 mb-2">Simple Dashboard</h3>
                <p className="text-sm text-blue-700 mb-4">Perfect for basic tracking needs</p>
                
                {/* Core features list */}
                <div className="text-left">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Core Features:</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Device location tracking</li>
                    <li>• Battery monitoring</li>
                    <li>• Basic activity status</li>
                    <li>• Simple notifications</li>
                  </ul>
                </div>
              </div>
            </Link>

            {/* Enhanced Dashboard Card - Highlighted as Recommended */}
            <Link
              href="/dashboard-enhanced"
              className="group relative bg-purple-50 border-2 border-purple-200 rounded-2xl p-6 hover:bg-purple-100 hover:border-purple-300 transition-all duration-200 hover:shadow-lg"
            >
              {/* Recommended Badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="inline-flex items-center px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">
                  <Crown className="h-3 w-3 mr-1" />
                  Recommended
                </div>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-xl mb-4 group-hover:bg-purple-200 transition-colors">
                  <MapPin className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-purple-900 mb-2">Enhanced Dashboard</h3>
                <p className="text-sm text-purple-700 mb-4">Advanced features with interactive maps</p>
                
                {/* Premium features list */}
                <div className="text-left">
                  <h4 className="text-sm font-medium text-purple-800 mb-2">Premium Features:</h4>
                  <ul className="text-xs text-purple-700 space-y-1">
                    <li>• Interactive maps & satellite view</li>
                    <li>• Geofencing & safe zones</li>
                    <li>• Family sharing & permissions</li>
                    <li>• Advanced analytics & reports</li>
                  </ul>
                </div>
              </div>
            </Link>
          </div>

          {/* Available Features - Properly Formatted */}
          <div className="bg-gray-50 rounded-2xl p-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">🚀 Available Features</h3>
              <p className="text-sm text-gray-600">Everything included in your TagsTrackr account</p>
            </div>
            
            {/* Categorized features with proper alignment */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Tracking Category */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                  Tracking
                </h4>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Real-time GPS tracking
                  </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Location pings (test & real GPS)
                  </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Movement analytics
                  </li>
                </ul>
              </div>

              {/* Notifications Category */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <Bell className="h-4 w-4 mr-2 text-orange-600" />
                  Notifications
                </h4>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Activity status detection
                  </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Battery monitoring
                  </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Smart alerts system
                  </li>
                </ul>
              </div>

              {/* Account Category */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-purple-600" />
                  Account
                </h4>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Device registration & management
                  </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Secure authentication system
                  </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Privacy-first data protection
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Subscription Status Note */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <Star className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm text-blue-800">
                You are currently on the <strong>Free Plan</strong> — unlock maps by upgrading!
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 