import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

function createSupabaseClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  return { supabase, response }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] POST /api/device/personal - Starting request')
    console.log('🍪 [API] Request cookies:', request.cookies.getAll().map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })))
    
    const authHeader = request.headers.get('authorization')
    console.log('🔐 [API] Authorization header:', authHeader ? 'Bearer ' + authHeader.substring(7, 27) + '...' : 'None')
    
    const { supabase, response } = createSupabaseClient(request)
    console.log('🔧 [API] Supabase client created')
    
    // If we have an Authorization header, set the session manually
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: '' // We don't need refresh token for this operation
      })
      console.log('🔑 [API] Set session from Authorization header')
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('🔐 [API] Auth check result:', { 
      hasUser: !!user, 
      userId: user?.id, 
      userEmail: user?.email,
      authError: authError?.message 
    })
    
    if (authError) {
      console.error('❌ [API] Auth error:', authError)
      return NextResponse.json({ error: 'Authentication error: ' + authError.message }, { status: 401 })
    }
    
    if (!user) {
      console.error('❌ [API] No user found in session')
      return NextResponse.json({ error: 'Please log in to add devices' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📥 [API] Request body:', body)
    
    const { 
      device_type, 
      device_name, 
      device_model, 
      device_os,
      hardware_fingerprint
    } = body

    // Validate device type
    const validTypes = ['phone', 'tablet', 'watch', 'laptop']
    if (!validTypes.includes(device_type)) {
      console.error('❌ [API] Invalid device type:', device_type)
      return NextResponse.json({ error: 'Invalid device type' }, { status: 400 })
    }

    if (!hardware_fingerprint) {
      console.error('❌ [API] Missing hardware fingerprint')
      return NextResponse.json({ error: 'Hardware fingerprint is required' }, { status: 400 })
    }

    console.log('📱 [API] Calling register_personal_device function...')
    // Register personal device using stored function
    const { data, error } = await supabase.rpc('register_personal_device', {
      p_device_type: device_type,
      p_device_name: device_name,
      p_hardware_fingerprint: hardware_fingerprint,
      p_device_model: device_model,
      p_device_os: device_os
    })

    console.log('📤 [API] Function result:', { data, error })

    if (error) {
      console.error('❌ [API] Database error:', error)
      throw error
    }

    console.log('✅ [API] Success! Returning response')
    const successResponse = NextResponse.json({
      success: true,
      device_id: data.device_id,
      action: data.action,
      message: `${device_type} ${data.action === 'created_new' ? 'registered' : 'updated'} successfully`
    })
    
    // Copy cookies from the response object to ensure session is maintained
    response.cookies.getAll().forEach(cookie => {
      successResponse.cookies.set(cookie.name, cookie.value)
    })
    
    return successResponse

  } catch (error) {
    console.error('❌ [API] Error registering personal device:', error)
    return NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const { supabase, response } = createSupabaseClient(request)
    
    // If we have an Authorization header, set the session manually
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: ''
      })
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const currentOnly = url.searchParams.get('current_only') === 'true'
    const hardwareFingerprint = url.searchParams.get('hardware_fingerprint')

    let query = supabase
      .from('personal_devices')
      .select(`
        id,
        device_type,
        device_name,
        device_model,
        device_os,
        sharing_enabled,
        location_sharing_active,
        is_active,
        battery_level,
        last_ping_at,
        created_at,
        hardware_fingerprint,
        privacy_mode
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

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
    const authHeader = request.headers.get('authorization')
    const { supabase, response } = createSupabaseClient(request)
    
    // If we have an Authorization header, set the session manually
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: ''
      })
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { device_id, location_sharing_active, privacy_mode } = body

    // Verify user owns this device
    const { data: device, error: deviceError } = await supabase
      .from('personal_devices')
      .select('user_id')
      .eq('id', device_id)
      .single()

    if (deviceError || device?.user_id !== user.id) {
      return NextResponse.json({ error: 'Device not found or access denied' }, { status: 403 })
    }

    // Update device settings
    const updateData: any = {}
    if (location_sharing_active !== undefined) {
      updateData.location_sharing_active = location_sharing_active
    }
    if (privacy_mode !== undefined) {
      updateData.privacy_mode = privacy_mode
    }

    const { data: updatedDevice, error } = await supabase
      .from('personal_devices')
      .update(updateData)
      .eq('id', device_id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      device: updatedDevice
    })

  } catch (error) {
    console.error('Error updating device:', error)
    return NextResponse.json(
      { error: 'Failed to update device' },
      { status: 500 }
    )
  }
} 