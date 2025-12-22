'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin, Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [configStatus, setConfigStatus] = useState<string | null>(null)
  const router = useRouter()

  // Check Supabase configuration on mount
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const response = await fetch('/api/test-supabase-connection')
        const data = await response.json()
        
        if (!data.configured) {
          setConfigStatus('not-configured')
          setError('Supabase is not configured. Please check your .env file and restart the dev server.')
        } else if (!data.urlMatches) {
          setConfigStatus('wrong-project')
          setError('Supabase URL does not match the new project. Please update your .env file.')
        } else {
          setConfigStatus('configured')
        }
      } catch (err) {
        console.error('Config check error:', err)
      }
    }
    
    checkConfig()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Full name is required')
      return false
    }
    if (!formData.email) {
      setError('Email is required')
      return false
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    return true
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🚀 Signup form submitted')
    setLoading(true)
    setError('')

    if (!validateForm()) {
      console.log('❌ Form validation failed')
      setLoading(false)
      return
    }

    console.log('✅ Form validated, starting signup process...')

    try {
      // Test connection first
      try {
        const testResponse = await fetch('/api/test-supabase-connection')
        const testData = await testResponse.json()
        
        if (!testData.configured) {
          setError('Supabase is not configured. Please check your .env file and restart the dev server.')
          console.error('Supabase config test:', testData)
          setLoading(false)
          return
        }
      } catch (testError) {
        console.error('Connection test failed:', testError)
        // Continue anyway, might be a network issue
      }

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName
          },
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`
        }
      })

      if (error) {
        console.error('Signup error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        
        // Provide more helpful error messages
        let errorMessage = error.message || 'Failed to create account'
        
        if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
          errorMessage = `Connection error: ${error.message}. Please ensure:
1. Your .env file has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
2. You've restarted the dev server after updating .env
3. Check browser console (F12) for more details`
        } else if (error.message?.includes('email')) {
          errorMessage = error.message
        } else if (error.message?.includes('password')) {
          errorMessage = error.message
        } else if (error.message?.includes('User already registered')) {
          errorMessage = 'This email is already registered. Please sign in instead.'
        }
        
        setError(errorMessage)
        setLoading(false)
        return
      }

      if (data.user) {
        console.log('✅ User created successfully:', data.user.id)
        
        // Insert user profile - set unlimited devices for testing
        // The database trigger will auto-set is_premium and device_limit, but we set it explicitly too
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: formData.email,
            full_name: formData.fullName,
            is_premium: true, // Free for testing
            device_limit: 999, // Unlimited for testing
            current_devices: 0,
            owned_tags: 0
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          // If user already exists (e.g., from OAuth), just update
          const { error: updateError } = await supabase
            .from('users')
            .update({
              full_name: formData.fullName,
              is_premium: true,
              device_limit: 999
            })
            .eq('id', data.user.id)
          
          if (updateError) {
            console.error('Profile update error:', updateError)
            // Don't fail signup if profile update fails - user can still log in
          }
        }

        setLoading(false)
        setSuccess(true)
        
        // If user is confirmed immediately, redirect to dashboard
        if (data.user.email_confirmed_at) {
          setTimeout(() => {
            router.push('/dashboard')
          }, 1000)
        }
      } else {
        setError('Account creation failed. Please try again.')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Signup exception:', err)
      console.error('Exception details:', err)
      console.error('Error stack:', err?.stack)
      
      let errorMessage = 'Failed to create account. '
      
      if (err?.message?.includes('fetch') || err?.name === 'TypeError' || err?.message?.includes('Failed to fetch')) {
        errorMessage = `Network error: ${err.message || 'Connection failed'}. 

Please check:
1. Your .env file is in the root directory
2. Environment variables are set correctly (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)
3. You've restarted the dev server (npm run dev)
4. Check browser console (F12) for detailed errors
5. Visit /api/test-supabase-connection to verify configuration`
      } else {
        errorMessage += err?.message || 'Please check your connection and try again.'
      }
      
      setError(errorMessage)
      setLoading(false)
    }
  }


  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="bg-white py-8 px-6 shadow-xl rounded-lg">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Check your email!</h2>
            <p className="text-gray-600 mb-6">
              We've sent a confirmation link to <strong>{formData.email}</strong>. 
              Click the link to activate your account.
            </p>
            <Link 
              href="/login"
              className="text-primary-600 hover:text-primary-500 font-medium"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link href="/" className="flex items-center justify-center">
            <MapPin className="h-12 w-12 text-primary-600" />
            <span className="ml-3 text-2xl font-bold text-gray-900">TagsTrackr</span>
          </Link>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-lg">
          <form className="space-y-6" onSubmit={handleSignup}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 pr-10 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Create a password"
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 pr-10 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                I agree to the{' '}
                <Link href="/terms" className="text-primary-600 hover:text-primary-500">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary-600 hover:text-primary-500">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Creating account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
} 