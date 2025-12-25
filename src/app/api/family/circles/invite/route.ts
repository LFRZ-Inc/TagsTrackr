import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

function createSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // The `set` method was called from a Server Component.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // The `delete` method was called from a Server Component.
          }
        },
      },
    }
  )
}

// POST - Create an invitation
export async function POST(request: NextRequest) {
  try {
    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization')
    
    // Create supabase client
    const supabase = createSupabaseClient()
    
    let targetUserId: string | null = null
    
    // If we have an auth token, use it directly
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { createClient } = require('@supabase/supabase-js')
      const tempClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: { user }, error: authError } = await tempClient.auth.getUser(token)
      
      if (!authError && user) {
        targetUserId = user.id
        console.log('✅ [API] POST invite - User from token:', targetUserId)
        
        // Set session on main client for RLS
        await supabase.auth.setSession({
          access_token: token,
          refresh_token: ''
        }).catch(() => {
          // Ignore session set errors
        })
      }
    }
    
    // If token didn't work, try getUser (works with cookies)
    if (!targetUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      targetUserId = user?.id || null
      
      if (!targetUserId) {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        targetUserId = session?.user?.id || null
        
        if (!targetUserId) {
          console.error('❌ [API] POST invite: No user ID available. Auth error:', authError?.message, 'Session error:', sessionError?.message)
          return NextResponse.json({ 
            error: 'Unauthorized', 
            details: 'Please log in to generate invite codes' 
          }, { status: 401 })
        }
      }
    }

    const user = { id: targetUserId } // Create user object for compatibility

    const body = await request.json()
    const { circleId } = body

    if (!circleId) {
      return NextResponse.json(
        { error: 'Circle ID is required' },
        { status: 400 }
      )
    }

    // Use admin client to check membership (avoids RLS recursion)
    const { createClient } = require('@supabase/supabase-js')
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if user is admin or creator of this circle
    const { data: circle } = await adminClient
      .from('family_circles')
      .select('created_by')
      .eq('id', circleId)
      .eq('is_active', true)
      .single()

    if (!circle) {
      return NextResponse.json(
        { error: 'Circle not found' },
        { status: 404 }
      )
    }

    const isCreator = circle.created_by === user.id

    let isAdmin = false
    if (!isCreator) {
      const { data: membership } = await adminClient
        .from('circle_members')
        .select('role')
        .eq('circle_id', circleId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      isAdmin = membership?.role === 'admin'
    }

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'You must be the creator or an admin to generate invite codes' },
        { status: 403 }
      )
    }

    // Generate a unique 6-character alphanumeric code
    const generateCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars like 0, O, I, 1
      let code = ''
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return code
    }

    // Generate unique code (check for collisions)
    let code = generateCode()
    let attempts = 0
    let codeExists = true

    while (codeExists && attempts < 10) {
      const { data: existing } = await adminClient
        .from('circle_invitations')
        .select('id')
        .eq('token', code)
        .eq('status', 'pending')
        .single()

      if (!existing) {
        codeExists = false
      } else {
        code = generateCode()
        attempts++
      }
    }

    if (codeExists) {
      return NextResponse.json(
        { error: 'Failed to generate unique code. Please try again.' },
        { status: 500 }
      )
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // Expires in 30 days

    // Create invitation with code (no email required)
    const { data: invitation, error: inviteError } = await adminClient
      .from('circle_invitations')
      .insert({
        circle_id: circleId,
        invited_by: user.id,
        invitee_email: '', // Empty for code-based invites
        invitee_user_id: null,
        token: code, // Use code as token
        expires_at: expiresAt.toISOString(),
        message: null
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return NextResponse.json(
        { error: 'Failed to create invitation code' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      invitation: {
        ...invitation,
        code: code // Return the code
      },
      message: 'Invitation code generated successfully!'
    })
  } catch (error) {
    console.error('Create invitation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get invitations (pending, accepted, etc.)
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const circleId = searchParams.get('circleId')
    const status = searchParams.get('status')

    let query = supabase
      .from('circle_invitations')
      .select(`
        *,
        circle:circle_id(id, name),
        inviter:invited_by(email, full_name)
      `)

    if (circleId) {
      query = query.eq('circle_id', circleId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    // Get invitations for circles user is admin of, or invitations sent to user
    const { data: invitations, error: inviteError } = await query
      .or(`invitee_email.eq.${user.email},invitee_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (inviteError) {
      console.error('Error fetching invitations:', inviteError)
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      invitations: invitations || []
    })
  } catch (error) {
    console.error('Get invitations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Accept or decline invitation
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { invitationId, action } = body // 'accept' or 'decline'

    if (!invitationId || !action) {
      return NextResponse.json(
        { error: 'Invitation ID and action are required' },
        { status: 400 }
      )
    }

    // Get the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('circle_invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Verify this invitation is for the current user
    const userEmail = user.email
    if (invitation.invitee_email !== userEmail && invitation.invitee_user_id !== user.id) {
      return NextResponse.json(
        { error: 'This invitation is not for you' },
        { status: 403 }
      )
    }

    // Check if invitation is expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('circle_invitations')
        .update({ status: 'expired' })
        .eq('id', invitationId)

      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    if (action === 'accept') {
      // Add user to circle
      const { error: memberError } = await supabase
        .from('circle_members')
        .insert({
          circle_id: invitation.circle_id,
          user_id: user.id,
          role: 'member',
          location_sharing_enabled: true
        })

      if (memberError) {
        console.error('Error adding member:', memberError)
        return NextResponse.json(
          { error: 'Failed to join circle' },
          { status: 500 }
        )
      }

      // Update invitation status
      await supabase
        .from('circle_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          invitee_user_id: user.id
        })
        .eq('id', invitationId)

      return NextResponse.json({
        success: true,
        message: 'Successfully joined the circle!'
      })
    } else if (action === 'decline') {
      // Update invitation status
      await supabase
        .from('circle_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId)

      return NextResponse.json({
        success: true,
        message: 'Invitation declined'
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "decline"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Update invitation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

