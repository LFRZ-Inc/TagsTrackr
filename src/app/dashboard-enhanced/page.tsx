'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function EnhancedDashboard() {
  const [timestamp, setTimestamp] = useState('')
  
  useEffect(() => {
    setTimestamp(new Date().toISOString())
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🗺️ Enhanced Dashboard - LIVE!
          </h1>
          
          <p className="text-lg text-gray-600 mb-6">
            Advanced GPS tracking dashboard with enhanced features is now deployed!
          </p>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-purple-800 mb-2">🎉 Enhanced Features Available</h2>
            <p className="text-purple-700">
              This dashboard includes advanced mapping, analytics, and family sharing capabilities.
            </p>
            <p className="text-sm text-purple-600 mt-2">
              Deployed at: {timestamp}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="text-center">
                <span className="text-3xl mb-3 block">🗺️</span>
                <h3 className="font-semibold text-blue-900 mb-2">Interactive Maps</h3>
                <p className="text-sm text-blue-700">Real-time location visualization with satellite and street views</p>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="text-center">
                <span className="text-3xl mb-3 block">👨‍👩‍👧‍👦</span>
                <h3 className="font-semibold text-green-900 mb-2">Family Sharing</h3>
                <p className="text-sm text-green-700">Share locations with family members and manage permissions</p>
              </div>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <div className="text-center">
                <span className="text-3xl mb-3 block">📊</span>
                <h3 className="font-semibold text-orange-900 mb-2">Analytics</h3>
                <p className="text-sm text-orange-700">Movement patterns, usage statistics, and detailed reports</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Link
              href="/dashboard-simple"
              className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="text-center">
                <span className="text-2xl mb-2 block">📊</span>
                <h3 className="font-semibold text-blue-900">Simple Dashboard</h3>
                <p className="text-sm text-blue-700">Core GPS tracking features</p>
              </div>
            </Link>
            
            <Link
              href="/dashboard-working"
              className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="text-center">
                <span className="text-2xl mb-2 block">⚙️</span>
                <h3 className="font-semibold text-green-900">Working Dashboard</h3>
                <p className="text-sm text-green-700">Reliable monitoring interface</p>
              </div>
            </Link>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">🚀 Enhanced Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ul className="text-sm text-gray-700 space-y-2">
                <li>✅ Real-time GPS tracking with maps</li>
                <li>✅ Geofencing and safe zones</li>
                <li>✅ Movement analytics and patterns</li>
                <li>✅ Family sharing and permissions</li>
              </ul>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>✅ Advanced alerting system</li>
                <li>✅ Historical location data</li>
                <li>✅ Device battery monitoring</li>
                <li>✅ Privacy controls and encryption</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 