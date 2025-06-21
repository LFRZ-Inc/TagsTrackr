'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QrCode, Package, ArrowLeft, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ProductTierSelection from '@/components/ProductTierSelection'
import AdBanner from '@/components/ads/AdBanner'

export default function RegisterTag() {
  const [step, setStep] = useState<'purchase' | 'register'>('purchase')
  const [formData, setFormData] = useState({
    tag_id: '',
    name: '',
    description: ''
  })
  const [selectedTier, setSelectedTier] = useState<'standard' | 'returnable' | null>(null)
  const [adhesiveOption, setAdhesiveOption] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [purchaseComplete, setPurchaseComplete] = useState(false)
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleTierSelection = async (tier: 'standard' | 'returnable', adhesive?: boolean) => {
    setSelectedTier(tier)
    setAdhesiveOption(adhesive || false)
    
    try {
      setLoading(true)
      
      // Call the device registration API
      const response = await fetch('/api/device/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagId: formData.tag_id || generateTagId(),
          deviceType: tier,
          adhesive: adhesive || false,
          purchaseAmount: tier === 'standard' ? 10 : 15
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.requiresUpgrade) {
          setError('Device limit reached. Please upgrade to premium or purchase a subscription.')
          return
        }
        throw new Error(result.error || 'Failed to register device')
      }

      setPurchaseComplete(true)
      setStep('register')
      
      // Pre-fill the tag ID from the registration
      if (result.device?.tag_id) {
        setFormData(prev => ({
          ...prev,
          tag_id: result.device.tag_id
        }))
      }

    } catch (err: any) {
      setError(err.message || 'Failed to register device')
    } finally {
      setLoading(false)
    }
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

      // Update the device with name and description
      const { error: updateError } = await supabase
        .from('devices')
        .update({
          name: formData.name,
          description: formData.description
        })
        .eq('tag_id', formData.tag_id)
        .eq('owner_id', user.id)

      if (updateError) throw updateError

      setSuccess(true)
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (err: any) {
      setError(err.message || 'Failed to update device information')
    } finally {
      setLoading(false)
    }
  }

  const generateTagId = () => {
    const prefix = 'TT'
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    const numbers = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `${prefix}${random}${numbers}`
  }

  const generateRandomTagId = () => {
    setFormData({
      ...formData,
      tag_id: generateTagId()
    })
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Device Registered Successfully!</h1>
          <p className="text-gray-600 mb-4">
            Your {selectedTier} device {formData.tag_id} has been added to your account.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Activate your device using the TagsTrackr mobile app</li>
              <li>• Attach it to your item securely</li>
              <li>• Start tracking in real-time from your dashboard</li>
            </ul>
          </div>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Ad Banner for non-premium users */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <AdBanner pageContext="general" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-6 px-4">
        <Link href="/dashboard" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Get Your TagsTrackr Device</h1>
        <p className="text-gray-600 mb-6">Choose your device type and complete registration</p>

        {/* Step Indicator */}
        <div className="flex items-center mb-8">
          <div className={`flex items-center ${step === 'purchase' ? 'text-blue-600' : 'text-green-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
              step === 'purchase' ? 'bg-blue-600' : 'bg-green-600'
            }`}>
              1
            </div>
            <span className="ml-2 font-medium">Choose Device Type</span>
          </div>
          <div className={`flex-1 h-0.5 mx-4 ${purchaseComplete ? 'bg-green-600' : 'bg-gray-300'}`}></div>
          <div className={`flex items-center ${step === 'register' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
              step === 'register' ? 'bg-blue-600' : 'bg-gray-300'
            }`}>
              2
            </div>
            <span className="ml-2 font-medium">Device Information</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {step === 'purchase' && (
          <div className="space-y-6">
            <ProductTierSelection onSelectTier={handleTierSelection} />
            
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">💡 Not sure which device to choose?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <h4 className="font-medium mb-2">Choose Standard if:</h4>
                  <ul className="space-y-1">
                    <li>• You want to own the device permanently</li>
                    <li>• You're tracking valuable items long-term</li>
                    <li>• You prefer one-time payment</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Choose Returnable if:</h4>
                  <ul className="space-y-1">
                    <li>• You're traveling and need temporary tracking</li>
                    <li>• You want to try the service first</li>
                    <li>• You prefer lower upfront cost</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'register' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Device Information</h2>
              <p className="text-gray-600">
                Your {selectedTier} device has been registered. Add some details to help identify it.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="tag_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Device ID
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="tag_id"
                    name="tag_id"
                    value={formData.tag_id}
                    onChange={handleInputChange}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                    placeholder="TT12345ABC"
                    readOnly
                  />
                  {!purchaseComplete && (
                    <button
                      type="button"
                      onClick={generateRandomTagId}
                      className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md text-sm"
                    >
                      Generate
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  This is your unique device identifier
                </p>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Device Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Main Luggage"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Give your device a memorable name
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Completing Setup...' : 'Complete Registration'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('purchase')}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Back to Device Selection
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
} 