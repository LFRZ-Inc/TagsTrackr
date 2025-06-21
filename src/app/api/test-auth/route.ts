import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
            // Ignore
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Ignore
          }
        },
      },
    }
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    
    // Get all available cookies
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    
    // Try to get user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Try to get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    return NextResponse.json({
      debug: true,
      user: user ? {
        id: user.id,
        email: user.email,
        aud: user.aud,
        created_at: user.created_at
      } : null,
      userError: userError?.message,
      session: session ? {
        access_token: session.access_token ? 'present' : 'missing',
        refresh_token: session.refresh_token ? 'present' : 'missing',
        expires_at: session.expires_at,
        user_id: session.user?.id
      } : null,
      sessionError: sessionError?.message,
      cookies: allCookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value.substring(0, 20) + '...',
        hasValue: !!cookie.value
      })),
      cookieCount: allCookies.length,
      env: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing'
      }
    })

  } catch (error) {
    console.error('Auth test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 