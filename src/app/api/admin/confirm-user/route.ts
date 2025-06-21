import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email, adminKey } = await request.json()
    
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

    console.log('Manual confirmation for:', email)

    // First, let's try to find the user in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers()
    
    console.log('Auth users:', authUser?.users?.length || 0)
    
    const user = authUser?.users?.find(u => u.email === email)
    
    if (!user) {
      return NextResponse.json({ error: 'User not found in auth system' }, { status: 404 })
    }

    console.log('Found user:', user.id, 'confirmed:', user.email_confirmed_at)

    // If not confirmed, confirm the email
    if (!user.email_confirmed_at) {
      const { error: confirmError } = await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true
      })
      
      if (confirmError) {
        console.error('Confirm error:', confirmError)
        return NextResponse.json({ error: confirmError.message }, { status: 400 })
      }
      
      console.log('Email confirmed successfully')
    }

    // Now create the user profile if it doesn't exist
    const { data: existingProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!existingProfile) {
      console.log('Creating user profile...')
      
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: email,
          full_name: user.user_metadata?.full_name || 'Luis Rodriguez',
          role: 'admin'
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        return NextResponse.json({ 
          error: 'Profile creation failed: ' + profileError.message,
          details: profileError
        }, { status: 400 })
      }
      
      console.log('Profile created successfully')
    } else {
      console.log('Profile already exists')
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User confirmed and profile created successfully',
      user: {
        id: user.id,
        email: user.email,
        confirmed: true,
        profile_created: true
      }
    })

  } catch (err) {
    console.error('Manual confirmation error:', err)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
} 