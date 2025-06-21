import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Force dynamic rendering for this API route
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
    const { 
      device_type, 
      device_name, 
      device_model, 
      device_os,
      hardware_fingerprint,
      is_current_device = false
    } = body

    // Validate device type
    const validTypes = ['phone', 'tablet', 'watch', 'laptop']
    if (!validTypes.includes(device_type)) {
      return NextResponse.json({ error: 'Invalid device type' }, { status: 400 })
    }

    // Check if device with this hardware fingerprint already exists for this user
    if (hardware_fingerprint) {
      const { data: existingDevice } = await supabase
        .from('devices')
        .select('id, tag_id, device_type, device_model, device_os')
        .eq('owner_id', user.id)
        .eq('hardware_fingerprint', hardware_fingerprint)
        .single()

      if (existingDevice) {
        return NextResponse.json({
          success: true,
          device_id: existingDevice.id,
          message: `This ${existingDevice.device_type} (${existingDevice.tag_id}) is already registered for this hardware`,
          existing: true,
          device_info: existingDevice
        })
      }
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

    // Update the device with hardware fingerprint if provided
    if (hardware_fingerprint && data) {
      const { error: updateError } = await supabase
        .from('devices')
        .update({ 
          hardware_fingerprint,
          is_current_device: is_current_device
        })
        .eq('id', data)
        .eq('owner_id', user.id)

      if (updateError) {
        console.error('Error updating device fingerprint:', updateError)
      }
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

    const url = new URL(request.url)
    const currentOnly = url.searchParams.get('current_only') === 'true'
    const hardwareFingerprint = url.searchParams.get('hardware_fingerprint')

    let query = supabase
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
        created_at,
        hardware_fingerprint,
        is_current_device
      `)
      .eq('owner_id', user.id)
      .in('device_type', ['phone', 'tablet', 'watch', 'laptop'])

    // Filter for current device only if requested
    if (currentOnly && hardwareFingerprint) {
      query = query.eq('hardware_fingerprint', hardwareFingerprint)
    }

    const { data: devices, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      devices: devices || [],
      current_device: currentOnly ? (devices?.[0] || null) : null
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

    // Verify user owns this device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('owner_id')
      .eq('id', device_id)
      .single()

    if (deviceError || device?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Device not found or access denied' }, { status: 403 })
    }

    // Toggle location sharing using stored function
    const { data, error } = await supabase.rpc('toggle_location_sharing', {
      p_device_id: device_id,
      p_enabled: location_sharing_enabled
    })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data
    })

  } catch (error) {
    console.error('Error updating device sharing:', error)
    return NextResponse.json(
      { error: 'Failed to update device' },
      { status: 500 }
    )
  }
} 