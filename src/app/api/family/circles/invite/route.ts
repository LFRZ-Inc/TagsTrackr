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
    const supabase = createSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { circleId, inviteeEmail, message } = body

    if (!circleId || !inviteeEmail) {
      return NextResponse.json(
        { error: 'Circle ID and invitee email are required' },
        { status: 400 }
      )
    }

    // Check if user is admin of this circle
    const { data: membership } = await supabase
      .from('circle_members')
      .select('role')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'You must be an admin to invite members' },
        { status: 403 }
      )
    }

    // Check if user is already a member
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', inviteeEmail)
      .single()

    if (existingUser) {
      const { data: existingMember } = await supabase
        .from('circle_members')
        .select('id')
        .eq('circle_id', circleId)
        .eq('user_id', existingUser.id)
        .eq('is_active', true)
        .single()

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this circle' },
          { status: 409 }
        )
      }
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('circle_invitations')
      .select('id')
      .eq('circle_id', circleId)
      .eq('invitee_email', inviteeEmail)
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invitation is already pending for this email' },
        { status: 409 }
      )
    }

    // Generate unique token
    const token = uuidv4()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('circle_invitations')
      .insert({
        circle_id: circleId,
        invited_by: user.id,
        invitee_email: inviteeEmail,
        invitee_user_id: existingUser?.id || null,
        token,
        expires_at: expiresAt.toISOString(),
        message: message?.trim() || null
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      )
    }

    // TODO: Send email notification here
    // For now, return the invitation with a link
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`

    return NextResponse.json({
      success: true,
      invitation: {
        ...invitation,
        invite_link: inviteLink
      },
      message: 'Invitation created successfully!'
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

