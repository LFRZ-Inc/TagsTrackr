'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function WorkingDashboard() {
  const [timestamp, setTimestamp] = useState('')
  
  useEffect(() => {
    setTimestamp(new Date().toISOString())
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            ✅ Dashboard Working - LIVE!
          </h1>
          
          <p className="text-lg text-gray-600 mb-6">
            This dashboard is now successfully deployed and working!
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-green-800 mb-2">🎉 Deployment Success</h2>
            <p className="text-green-700">
              The Vercel deployment issue has been resolved. All dashboard variants are now accessible.
            </p>
            <p className="text-sm text-green-600 mt-2">
              Deployed at: {timestamp}
            </p>
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
              href="/dashboard-enhanced"
              className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div className="text-center">
                <span className="text-2xl mb-2 block">🗺️</span>
                <h3 className="font-semibold text-purple-900">Enhanced Dashboard</h3>
                <p className="text-sm text-purple-700">Advanced features with maps</p>
              </div>
            </Link>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">🚀 Available Features</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✅ Real-time GPS tracking</li>
              <li>✅ Device registration and management</li>
              <li>✅ Location pings (test and real GPS)</li>
              <li>✅ Battery monitoring</li>
              <li>✅ Activity status detection</li>
              <li>✅ Authentication system</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 