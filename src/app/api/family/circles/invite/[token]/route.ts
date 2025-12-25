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

    // Get invitation by token (code)
    const { data: invitation, error: inviteError } = await adminClient
      .from('circle_invitations')
      .select(`
        *,
        circle:circle_id(id, name, description, color)
      `)
      .eq('token', token.toUpperCase())
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from('circle_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      return NextResponse.json({
        invitation: {
          ...invitation,
          status: 'expired'
        }
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

