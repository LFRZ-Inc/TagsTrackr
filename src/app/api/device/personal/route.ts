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
    
    const authHeader = request.headers.get('authorization')
    console.log('🔐 [API] Authorization header:', authHeader ? 'Bearer ' + authHeader.substring(7, 27) + '...' : 'None')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ [API] No Authorization header provided')
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }
    
    const { supabase, response } = createSupabaseClient(request)
    console.log('🔧 [API] Supabase client created')
    
    // Set the session from Authorization header
    const token = authHeader.substring(7)
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: '' // We don't need refresh token for this operation
    })
    
    if (sessionError) {
      console.error('❌ [API] Session error:', sessionError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    console.log('🔑 [API] Session set successfully, user:', sessionData.user?.email)
    
    const user = sessionData.user
    if (!user) {
      console.error('❌ [API] No user in session data')
      return NextResponse.json({ error: 'Invalid user session' }, { status: 401 })
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
    
    // Instead of using the stored function, let's do direct database operations
    // First check if device with same hardware fingerprint already exists for this user
    const { data: existingDevice, error: checkError } = await supabase
      .from('personal_devices')
      .select('id, device_name')
      .eq('user_id', user.id)
      .eq('hardware_fingerprint', hardware_fingerprint)
      .eq('is_active', true)
      .single()

    console.log('🔍 [API] Existing device check:', { existingDevice, checkError })

    let deviceResult;
    
    if (existingDevice) {
      // Update existing device
      console.log('📝 [API] Updating existing device:', existingDevice.id)
      const { data: updatedDevice, error: updateError } = await supabase
        .from('personal_devices')
        .update({
          device_name: device_name,
          device_model: device_model,
          device_os: device_os,
          last_ping_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDevice.id)
        .eq('user_id', user.id)
        .select('id')
        .single()

      if (updateError) {
        console.error('❌ [API] Update error:', updateError)
        throw updateError
      }

      deviceResult = {
        device_id: updatedDevice.id,
        action: 'updated_existing'
      }
    } else {
      // Create new device
      console.log('➕ [API] Creating new device')
      const { data: newDevice, error: insertError } = await supabase
        .from('personal_devices')
        .insert({
          user_id: user.id,
          device_type: device_type,
          device_name: device_name,
          hardware_fingerprint: hardware_fingerprint,
          device_model: device_model,
          device_os: device_os,
          last_ping_at: new Date().toISOString(),
          is_active: true,
          location_sharing_active: false,
          sharing_enabled: true,
          privacy_mode: false
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('❌ [API] Insert error:', insertError)
        throw insertError
      }

      // Create default privacy settings if they don't exist
      const { error: privacyError } = await supabase
        .from('privacy_settings')
        .upsert({ user_id: user.id }, { onConflict: 'user_id' })

      if (privacyError) {
        console.log('⚠️ [API] Privacy settings error (non-critical):', privacyError)
      }

      deviceResult = {
        device_id: newDevice.id,
        action: 'created_new'
      }
    }

    console.log('📤 [API] Device operation result:', deviceResult)

    return NextResponse.json({
      success: true,
      device_id: deviceResult.device_id,
      action: deviceResult.action,
      message: `${device_type} ${deviceResult.action === 'created_new' ? 'registered' : 'updated'} successfully`
    })

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