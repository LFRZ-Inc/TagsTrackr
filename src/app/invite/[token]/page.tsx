'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users, Check, X, Mail, Clock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

export default function InviteAcceptancePage() {
  const params = useParams()
  const router = useRouter()
  const token = params?.token as string
  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkUser()
    if (token) {
      fetchInvitation()
    }
  }, [token])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchInvitation = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/family/circles/invite?token=${token}`)
      
      if (response.ok) {
        const data = await response.json()
        setInvitation(data.invitation)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Invitation not found')
      }
    } catch (error) {
      console.error('Error fetching invitation:', error)
      toast.error('Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!user) {
      toast.error('Please log in to accept the invitation')
      router.push(`/login?redirect=/invite/${token}`)
      return
    }

    if (!invitation) return

    setProcessing(true)
    try {
      const response = await fetch('/api/family/circles/invite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationId: invitation.id,
          action: 'accept'
        })
      })

      if (response.ok) {
        toast.success('Successfully joined the circle!')
        router.push('/family')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to accept invitation')
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      toast.error('Failed to accept invitation')
    } finally {
      setProcessing(false)
    }
  }

  const handleDecline = async () => {
    if (!invitation) return

    setProcessing(true)
    try {
      const response = await fetch('/api/family/circles/invite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationId: invitation.id,
          action: 'decline'
        })
      })

      if (response.ok) {
        toast.success('Invitation declined')
        router.push('/')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to decline invitation')
      }
    } catch (error) {
      console.error('Error declining invitation:', error)
      toast.error('Failed to decline invitation')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <X className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Not Found</h1>
          <p className="text-gray-600 mb-6">
            This invitation link is invalid or has expired.
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  const isExpired = invitation.expires_at && new Date(invitation.expires_at) < new Date()
  const isAccepted = invitation.status === 'accepted'
  const isDeclined = invitation.status === 'declined'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Family Circle Invitation</h1>
          {invitation.circle && (
            <p className="text-lg text-gray-600">Join <span className="font-semibold">{invitation.circle.name}</span></p>
          )}
        </div>

        {isExpired && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800">
              <Clock className="h-5 w-5" />
              <p className="font-medium">This invitation has expired</p>
            </div>
          </div>
        )}

        {isAccepted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-green-800">
              <Check className="h-5 w-5" />
              <p className="font-medium">You've already accepted this invitation</p>
            </div>
            <Link
              href="/family"
              className="mt-3 inline-block text-green-700 hover:text-green-800 underline text-sm"
            >
              Go to Family Circles
            </Link>
          </div>
        )}

        {isDeclined && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-gray-800">
              <X className="h-5 w-5" />
              <p className="font-medium">You've declined this invitation</p>
            </div>
          </div>
        )}

        {invitation.message && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Message:</span> {invitation.message}
            </p>
          </div>
        )}

        {!user && !isAccepted && !isDeclined && !isExpired && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800 mb-3">
              You need to log in to accept this invitation.
            </p>
            <Link
              href={`/login?redirect=/invite/${token}`}
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Log In
            </Link>
          </div>
        )}

        {user && invitation.invitee_email !== user.email && !isAccepted && !isDeclined && !isExpired && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">
              This invitation is for <strong>{invitation.invitee_email}</strong>, but you're logged in as <strong>{user.email}</strong>.
            </p>
            <p className="text-sm text-red-700 mt-2">
              Please log out and log in with the correct account, or ask the circle admin to send a new invitation.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {!isAccepted && !isDeclined && !isExpired && user && invitation.invitee_email === user.email && (
            <>
              <button
                onClick={handleAccept}
                disabled={processing}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check className="h-5 w-5" />
                {processing ? 'Processing...' : 'Accept Invitation'}
              </button>
              <button
                onClick={handleDecline}
                disabled={processing}
                className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <X className="h-5 w-5" />
                Decline
              </button>
            </>
          )}

          <Link
            href="/"
            className="block w-full text-center text-gray-600 hover:text-gray-800 py-2 text-sm"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

