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
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Please log in to add devices' }, { status: 401 })
    }

    const body = await request.json()
    const { device_type, device_name, device_model, device_os } = body

    // Validate device type
    const validTypes = ['phone', 'tablet', 'watch', 'laptop']
    if (!validTypes.includes(device_type)) {
      return NextResponse.json({ error: 'Invalid device type' }, { status: 400 })
    }

    // Register personal device using stored function
    const { data, error } = await supabase.rpc('register_personal_device', {
      p_device_type: device_type,
      p_device_name: device_name,
      p_device_model: device_model,
      p_device_os: device_os
    })

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      device_id: data,
      message: `${device_type} registered successfully`
    })

  } catch (error) {
    console.error('Error registering personal device:', error)
    return NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all personal devices for user
    const { data: devices, error } = await supabase
      .from('devices')
      .select(`
        id,
        tag_id,
        type,
        device_type,
        device_model,
        device_os,
        sharing_enabled,
        location_sharing_active,
        is_active,
        battery_level,
        last_ping_at,
        created_at
      `)
      .eq('owner_id', user.id)
      .in('device_type', ['phone', 'tablet', 'watch', 'laptop'])
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      devices: devices || []
    })

  } catch (error) {
    console.error('Error fetching personal devices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { device_id, location_sharing_enabled } = body

    // Toggle location sharing using stored function
    const { data, error } = await supabase.rpc('toggle_location_sharing', {
      p_device_id: device_id,
      p_enabled: location_sharing_enabled
    })

    if (error) throw error

    return NextResponse.json(data)

  } catch (error) {
    console.error('Error updating device sharing:', error)
    return NextResponse.json(
      { error: 'Failed to update device' },
      { status: 500 }
    )
  }
} 