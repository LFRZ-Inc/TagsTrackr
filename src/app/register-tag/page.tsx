'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, QrCode, Hash, ArrowLeft } from 'lucide-react'

export default function RegisterTag() {
  const [tagId, setTagId] = useState('')
  const [registrationMethod, setRegistrationMethod] = useState<'manual' | 'qr'>('manual')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagId.trim()) return

    setLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
    }, 2000)
  }

  const generateRandomTag = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = 'TT'
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setTagId(result)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tag Registered!</h2>
          <p className="text-gray-600 mb-6">
            Your tag <strong>{tagId}</strong> has been successfully registered and is now active.
          </p>
          <div className="space-y-3">
            <Link 
              href="/dashboard" 
              className="block w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700"
            >
              View Dashboard
            </Link>
            <button 
              onClick={() => {
                setSuccess(false)
                setTagId('')
              }}
              className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300"
            >
              Register Another Tag
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <MapPin className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900">Register New Tag</h1>
              <p className="text-gray-600 mt-2">
                Add a new GPS tag to your account to start tracking.
              </p>
            </div>

            <div className="mb-6">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setRegistrationMethod('manual')}
                  className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    registrationMethod === 'manual'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Hash className="h-4 w-4 mr-2" />
                  Manual Entry
                </button>
                <button
                  onClick={() => setRegistrationMethod('qr')}
                  className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    registrationMethod === 'qr'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Code Scan
                </button>
              </div>
            </div>

            {registrationMethod === 'manual' ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="tagId" className="block text-sm font-medium text-gray-700 mb-2">
                    Tag ID
                  </label>
                  <div className="flex space-x-2">
                    <input
                      id="tagId"
                      type="text"
                      value={tagId}
                      onChange={(e) => setTagId(e.target.value.toUpperCase())}
                      placeholder="Enter tag ID (e.g., TT12345ABC)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={generateRandomTag}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                    >
                      Generate
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Tag ID should be 10 characters starting with 'TT'
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !tagId.trim()}
                  className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Registering Tag...
                    </div>
                  ) : (
                    'Register Tag'
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center py-12">
                <QrCode className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">QR Code Scanner</h3>
                <p className="text-gray-600 mb-6">
                  Scan the QR code on your TagsTrackr device to automatically register it.
                </p>
                <button className="bg-primary-600 text-white py-2 px-6 rounded-lg hover:bg-primary-700">
                  Open Camera
                </button>
                <p className="text-xs text-gray-500 mt-4">
                  QR scanning feature coming soon. Please use manual entry for now.
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary-600 text-xs font-bold">!</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Important</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Make sure your tag is powered on and has cellular/GPS signal before registering. 
                  You'll receive a $5 credit when you return any found luggage to its owner.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 