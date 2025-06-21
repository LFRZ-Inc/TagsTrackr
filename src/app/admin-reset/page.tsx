'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'

export default function AdminResetPage() {
  const [loading, setLoading] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleReset = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/reset-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'luisdrod750@gmail.com',
          adminKey: 'tagstrackr-admin-reset-2024'
        }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        setError(result.error || 'Reset failed')
        return
      }

      setMessage('✅ User data cleaned up successfully! You can now sign up fresh.')
      
    } catch (err) {
      setError('Failed to reset user data')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmUser = async () => {
    setConfirmLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/confirm-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'luisdrod750@gmail.com',
          adminKey: 'tagstrackr-admin-reset-2024'
        }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        setError(result.error || 'Confirmation failed')
        return
      }

      setMessage('✅ User confirmed and profile created! You can now log in.')
      
    } catch (err) {
      setError('Failed to confirm user')
    } finally {
      setConfirmLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex items-center justify-center">
            <MapPin className="h-12 w-12 text-primary-600" />
            <span className="ml-3 text-2xl font-bold text-gray-900">TagsTrackr</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Reset
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Clean up user data for fresh signup
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-lg">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          {message && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm">
              {message}
            </div>
          )}

          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p><strong>Email:</strong> luisdrod750@gmail.com</p>
              <p><strong>Action:</strong> Delete all user data and allow fresh signup</p>
            </div>

            <button
              onClick={handleReset}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Resetting...
                </div>
              ) : (
                'Reset User Data'
              )}
            </button>

            <button
              onClick={handleConfirmUser}
              disabled={confirmLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Confirming...
                </div>
              ) : (
                'Confirm User & Create Profile'
              )}
            </button>

            {message && (
              <div className="mt-4 space-y-2">
                <a
                  href={message.includes('confirmed') ? "/login" : "/signup"}
                  className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {message.includes('confirmed') ? "Go to Login" : "Go to Signup"}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 