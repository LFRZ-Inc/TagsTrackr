'use client'

import { useEffect } from 'react'

export default function Dashboard() {
  useEffect(() => {
    // Temporary redirect to working dashboard while webpack issues are resolved
    window.location.href = '/dashboard-working'
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to working dashboard...</p>
        <p className="text-sm text-gray-500 mt-2">Please wait while we load the optimized interface</p>
      </div>
    </div>
  )
} 