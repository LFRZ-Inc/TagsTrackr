'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Settings, Trash2, UserPlus, Map, X, Check, Copy, Key } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import UnifiedFamilyMap from './UnifiedFamilyMap'

interface Circle {
  id: string
  name: string
  description: string | null
  color: string
  created_at: string
  created_by?: string
  members: Array<{
    user_id: string
    role: string
    location_sharing_enabled: boolean
    is_active: boolean
    user?: {
      email: string
      full_name: string | null
    }
  }>
}

interface FamilyCirclesProps {
  onCircleSelect?: (circleId: string) => void
}

export default function FamilyCircles({ onCircleSelect }: FamilyCirclesProps) {
  const router = useRouter()
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [newCircleName, setNewCircleName] = useState('')
  const [newCircleDescription, setNewCircleDescription] = useState('')
  const [newCircleColor, setNewCircleColor] = useState('#3B82F6')

  useEffect(() => {
    // Get current user ID
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    getCurrentUser()
    fetchCircles()
  }, [])

  const fetchCircles = async () => {
    try {
      setLoading(true)
      
      // Get the session token to include in the request
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      // Add authorization header if we have a session
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const response = await fetch('/api/family/circles', {
        method: 'GET',
        headers,
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setCircles(data.circles || [])
        if (data.circles && data.circles.length > 0 && !selectedCircle) {
          setSelectedCircle(data.circles[0].id)
          onCircleSelect?.(data.circles[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching circles:', error)
    } finally {
      setLoading(false)
    }
  }

  const createCircle = async () => {
    if (!newCircleName.trim()) {
      alert('Please enter a circle name')
      return
    }

    try {
      // Get current user to pass user ID
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.error('Error getting user:', userError)
        alert('Please log in to create a circle')
        return
      }
      if (!user) {
        alert('Please log in to create a circle')
        return
      }

      console.log('📤 [Client] Sending circle creation request with userId:', user.id)

      const response = await fetch('/api/family/circles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newCircleName,
          description: newCircleDescription || null,
          color: newCircleColor,
          userId: user.id // Pass user ID from client
        })
      })

      if (response.ok) {
        const data = await response.json()
        await fetchCircles()
        setShowCreateModal(false)
        setNewCircleName('')
        setNewCircleDescription('')
        setNewCircleColor('#3B82F6')
        if (data.circle) {
          setSelectedCircle(data.circle.id)
          onCircleSelect?.(data.circle.id)
        }
      } else {
        const error = await response.json()
        console.error('Create circle error:', error)
        alert(error.details ? `${error.error}: ${error.details}` : error.error || 'Failed to create circle')
      }
    } catch (error) {
      console.error('Error creating circle:', error)
      alert('Failed to create circle')
    }
  }

  const generateInviteCode = async () => {
    if (!selectedCircle) {
      alert('Please select a circle')
      return
    }

    try {
      // Get the session token to include in the request
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/family/circles/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }) // Add token if available
        },
        credentials: 'include',
        body: JSON.stringify({
          circleId: selectedCircle
        })
      })

      if (response.ok) {
        const data = await response.json()
        const code = data.invitation?.code || data.invitation?.token
        if (code) {
          setInviteCode(code)
          // Copy code to clipboard
          navigator.clipboard.writeText(code)
          alert(`Invitation code generated!\n\nCode: ${code}\n\nCode copied to clipboard. Share this code with people you want to invite.`)
        } else {
          alert(data.message || 'Invitation code generated!')
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to generate invitation code')
      }
    } catch (error) {
      console.error('Error generating invite code:', error)
      alert('Failed to generate invitation code')
    }
  }

  const joinByCode = async () => {
    if (!joinCode.trim()) {
      alert('Please enter a code')
      return
    }

    try {
      // First, get the invitation by code
      const response = await fetch(`/api/family/circles/invite/${joinCode.trim().toUpperCase()}`)
      
      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Invalid or expired code')
        return
      }

      const data = await response.json()
      const invitation = data.invitation

      if (!invitation) {
        alert('Invitation not found')
        return
      }

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to join the circle')
        router.push(`/login?redirect=/invite/${joinCode.trim().toUpperCase()}`)
        return
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('circle_members')
        .select('id')
        .eq('circle_id', invitation.circle_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (existingMember) {
        alert('You are already a member of this circle')
        setShowJoinModal(false)
        setJoinCode('')
        await fetchCircles()
        return
      }

      // Accept the invitation
      // Get the session token to include in the request
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const acceptResponse = await fetch('/api/family/circles/invite', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }) // Add token if available
        },
        credentials: 'include',
        body: JSON.stringify({
          invitationId: invitation.id,
          action: 'accept'
        })
      })

      if (acceptResponse.ok) {
        alert('Successfully joined the circle!')
        setShowJoinModal(false)
        setJoinCode('')
        await fetchCircles()
      } else {
        const error = await acceptResponse.json()
        alert(error.error || 'Failed to join circle')
      }
    } catch (error) {
      console.error('Error joining by code:', error)
      alert('Failed to join circle')
    }
  }

  const deleteCircle = async (circleId: string) => {
    if (!confirm('Are you sure you want to delete this circle? This action cannot be undone.')) {
      return
    }

    try {
      // Get the session token to include in the request
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      // Add authorization header if we have a session
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/family/circles?circleId=${circleId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      })

      if (response.ok) {
        await fetchCircles()
        if (selectedCircle === circleId) {
          setSelectedCircle(null)
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete circle')
      }
    } catch (error) {
      console.error('Error deleting circle:', error)
      alert('Failed to delete circle')
    }
  }

  const selectedCircleData = circles.find(c => c.id === selectedCircle)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading circles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Family Circles</h2>
          <p className="text-sm text-gray-600">Share locations with your family</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setJoinCode('')
              setShowJoinModal(true)
            }}
            className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Key className="h-5 w-5 mr-2" />
            Join by Code
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Circle
          </button>
        </div>
      </div>

      {/* Circles List */}
      {circles.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No circles yet</h3>
          <p className="text-sm text-gray-600 mb-4">Create a circle to start sharing locations with family members</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Your First Circle
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {/* Circle Cards */}
          <div className="md:col-span-1 space-y-3">
            {circles.map((circle) => (
              <div
                key={circle.id}
                onClick={() => {
                  setSelectedCircle(circle.id)
                  onCircleSelect?.(circle.id)
                }}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedCircle === circle.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: circle.color }}
                      />
                      <h3 className="font-semibold text-gray-900">{circle.name}</h3>
                    </div>
                    {circle.description && (
                      <p className="text-sm text-gray-600 mb-2">{circle.description}</p>
                    )}
                    <div className="flex items-center text-xs text-gray-500">
                      <Users className="h-3 w-3 mr-1" />
                      {circle.members?.length || 0} members
                    </div>
                  </div>
                  {selectedCircle === circle.id && (() => {
                    // Check if user can delete (creator or admin)
                    const isCreator = circle.created_by === currentUserId
                    const isAdmin = circle.members?.some(
                      (m) => m.user_id === currentUserId && m.role === 'admin' && m.is_active
                    )
                    const canDelete = isCreator || isAdmin
                    
                    return canDelete ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteCircle(circle.id)
                        }}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete circle"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null
                  })()}
                </div>
              </div>
            ))}
          </div>

          {/* Selected Circle View */}
          <div className="md:col-span-2">
            {selectedCircleData ? (
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{selectedCircleData.name}</h3>
                      {selectedCircleData.description && (
                        <p className="text-sm text-gray-600">{selectedCircleData.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Member
                    </button>
                  </div>
                </div>

                {/* Unified Family Map */}
                <UnifiedFamilyMap
                  circleId={selectedCircleData.id}
                  circleName={selectedCircleData.name}
                  height="600px"
                  autoRefresh={true}
                  refreshInterval={10000}
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <Map className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-gray-600">Select a circle to view member locations</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Circle Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New Circle</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Circle Name *
                </label>
                <input
                  type="text"
                  value={newCircleName}
                  onChange={(e) => setNewCircleName(e.target.value)}
                  placeholder="e.g., My Family, Work Team"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newCircleDescription}
                  onChange={(e) => setNewCircleDescription(e.target.value)}
                  placeholder="Describe this circle..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex space-x-2">
                  {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewCircleColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newCircleColor === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={createCircle}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Create Circle
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Generate Invite Code</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteCode(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {inviteCode ? (
                <>
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
                    <p className="text-sm text-gray-600 mb-2">Share this code with people you want to invite:</p>
                    <div className="bg-white border-2 border-blue-500 rounded-lg p-4 mb-4">
                      <p className="text-3xl font-bold text-blue-600 tracking-wider font-mono">{inviteCode}</p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inviteCode)
                        alert('Code copied to clipboard!')
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      Click to copy code
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    This code expires in 30 days. Anyone with this code can join the circle.
                  </p>
                  <button
                    onClick={() => {
                      setShowInviteModal(false)
                      setInviteCode(null)
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Generate a unique 6-character code that people can use to join this circle. Share the code with anyone you want to invite.
                  </p>
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={generateInviteCode}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Generate Code
                    </button>
                    <button
                      onClick={() => {
                        setShowInviteModal(false)
                        setInviteCode(null)
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Join by Code Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Join Circle by Code</h3>
              <button
                onClick={() => {
                  setShowJoinModal(false)
                  setJoinCode('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter Invite Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder="ABC123"
                  maxLength={6}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl font-mono tracking-wider uppercase"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the 6-character code shared with you
                </p>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={joinByCode}
                  disabled={!joinCode.trim() || joinCode.length !== 6}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Join Circle
                </button>
                <button
                  onClick={() => {
                    setShowJoinModal(false)
                    setJoinCode('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

