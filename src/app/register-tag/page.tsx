'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QrCode, Package, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function RegisterTag() {
  const [formData, setFormData] = useState({
    tag_id: '',
    name: '',
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Check if tag ID already exists
      const { data: existingTag } = await supabase
        .from('tags')
        .select('tag_id')
        .eq('tag_id', formData.tag_id)
        .single()

      if (existingTag) {
        setError('This tag ID is already registered')
        return
      }

      // Register the tag
      const { error: insertError } = await supabase
        .from('tags')
        .insert([{
          tag_id: formData.tag_id,
          user_id: user.id,
          name: formData.name,
          description: formData.description,
          status: 'active',
          is_active: true
        }])

      if (insertError) throw insertError

      setSuccess(true)
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (err: any) {
      setError(err.message || 'Failed to register tag')
    } finally {
      setLoading(false)
    }
  }

  const generateRandomTagId = () => {
    const prefix = 'TT'
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    const numbers = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    setFormData({
      ...formData,
      tag_id: `${prefix}${random}${numbers}`
    })
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tag Registered Successfully!</h1>
          <p className="text-gray-600 mb-4">
            Your tag {formData.tag_id} has been added to your account.
          </p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-6 px-4">
        <Link href="/dashboard" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Register New Tag</h1>
        
        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="tag_id" className="block text-sm font-medium text-gray-700 mb-2">
                Tag ID *
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  id="tag_id"
                  name="tag_id"
                  required
                  value={formData.tag_id}
                  onChange={handleInputChange}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="TT12345ABC"
                />
                <button
                  type="button"
                  onClick={generateRandomTagId}
                  className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md text-sm"
                >
                  Generate
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Enter the unique ID from your GPS tracking device
              </p>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Tag Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Main Luggage"
              />
              <p className="text-sm text-gray-500 mt-1">
                Give your tag a memorable name
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Black suitcase with red ribbon"
              />
              <p className="text-sm text-gray-500 mt-1">
                Optional description to help identify your item
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:bg-gray-400"
              >
                {loading ? 'Registering...' : 'Register Tag'}
              </button>
              <Link
                href="/dashboard"
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Quick Guide */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h2 className="text-lg font-medium text-blue-900 mb-4">How to get started</h2>
          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-medium">
                1
              </div>
              <p>Register your GPS tag using the form above</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-medium">
                2
              </div>
              <p>Use the admin panel to simulate GPS pings and test tracking</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-medium">
                3
              </div>
              <p>Attach the physical GPS device and start tracking!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 