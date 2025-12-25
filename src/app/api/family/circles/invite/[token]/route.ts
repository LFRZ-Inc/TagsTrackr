import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

// GET - Get invitation by token
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createSupabaseClient()
    const { token } = params

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Use admin client to avoid RLS issues
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

    // Get invitation by token (code) - try both uppercase and original case
    const normalizedToken = token.toUpperCase().trim()
    
    console.log('🔍 [API] Looking for invitation with token:', normalizedToken)
    
    // First try with uppercase (as codes are stored)
    let { data: invitation, error: inviteError } = await adminClient
      .from('circle_invitations')
      .select(`
        *,
        circle:circle_id(id, name, description, color)
      `)
      .eq('token', normalizedToken)
      .single()

    // If not found, try with original case (in case stored differently)
    if (inviteError || !invitation) {
      console.log('⚠️ [API] Not found with uppercase, trying original case:', token.trim())
      const result = await adminClient
        .from('circle_invitations')
        .select(`
          *,
          circle:circle_id(id, name, description, color)
        `)
        .eq('token', token.trim())
        .single()
      
      invitation = result.data
      inviteError = result.error
    }

    if (inviteError || !invitation) {
      console.error('❌ [API] Invitation not found. Error:', inviteError)
      // Also check if there are any pending invitations to help debug
      const { data: allPending } = await adminClient
        .from('circle_invitations')
        .select('token, status, expires_at')
        .eq('status', 'pending')
        .limit(5)
      console.log('📋 [API] Sample pending invitations:', allPending?.map((inv: any) => ({ token: inv.token, expires: inv.expires_at })))
      
      return NextResponse.json(
        { error: 'Invitation not found', details: 'The code may be incorrect or the invitation may have expired' },
        { status: 404 }
      )
    }
    
    console.log('✅ [API] Found invitation:', invitation.id, 'Status:', invitation.status)

    // Check if already accepted or declined
    if (invitation.status === 'accepted') {
      return NextResponse.json({
        invitation: {
          ...invitation,
          status: 'accepted'
        },
        message: 'This invitation has already been accepted'
      })
    }
    
    if (invitation.status === 'declined') {
      return NextResponse.json({
        invitation: {
          ...invitation,
          status: 'declined'
        },
        message: 'This invitation has been declined'
      })
    }

    // Check if expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      // Update status to expired using admin client
      await adminClient
        .from('circle_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      return NextResponse.json({
        invitation: {
          ...invitation,
          status: 'expired'
        },
        message: 'This invitation has expired'
      })
    }

    return NextResponse.json({
      invitation
    })
  } catch (error) {
    console.error('Get invitation by token error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

