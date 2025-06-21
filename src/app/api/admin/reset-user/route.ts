import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email, adminKey } = await request.json()
    
    // Simple admin key check (in production, use proper authentication)
    if (adminKey !== 'tagstrackr-admin-reset-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!email || email !== 'luisdrod750@gmail.com') {
      return NextResponse.json({ error: 'Only specific admin email allowed' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    console.log('Admin reset: Cleaning up user data for:', email)

    // First, try to find and delete any existing user data
    try {
      // Delete from users table
      const { error: usersError } = await supabase
        .from('users')
        .delete()
        .eq('email', email)
      
      if (usersError) {
        console.log('Users table cleanup:', usersError.message)
      }

      // Delete from personal_devices table
      const { error: devicesError } = await supabase
        .from('personal_devices')
        .delete()
        .eq('user_email', email)
      
      if (devicesError) {
        console.log('Devices table cleanup:', devicesError.message)
      }

      // Delete from location_pings table
      const { error: pingsError } = await supabase
        .from('location_pings')
        .delete()
        .eq('user_email', email)
      
      if (pingsError) {
        console.log('Pings table cleanup:', pingsError.message)
      }

    } catch (cleanupErr) {
      console.log('Cleanup completed with some expected errors:', cleanupErr)
    }

    console.log('Admin reset: User data cleaned up successfully')

    return NextResponse.json({ 
      success: true, 
      message: 'User data cleaned up successfully. User can now sign up fresh.',
      email: email
    })

  } catch (err) {
    console.error('Admin reset error:', err)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
} 