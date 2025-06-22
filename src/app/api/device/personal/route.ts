import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

// Create admin client for database operations (fallback to anon key if service role not available)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Create regular client for auth verification
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] POST /api/device/personal - Starting request')
    
    const authHeader = request.headers.get('authorization')
    console.log('🔐 [API] Authorization header:', authHeader ? 'Bearer ' + authHeader.substring(7, 27) + '...' : 'None')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ [API] No Authorization header provided')
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }
    
    // Verify the JWT token
    const token = authHeader.substring(7)
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token)
    
    if (userError || !userData.user) {
      console.error('❌ [API] Invalid token:', userError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const user = userData.user
    console.log('🔑 [API] Authenticated user:', user.email)

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

    console.log('📱 [API] Processing device registration...')
    
    // Set the session on the admin client to ensure RLS works properly
    await supabaseAdmin.auth.setSession({
      access_token: token,
      refresh_token: ''
    })
    
    // Check for existing device
    const { data: existingDevices, error: checkError } = await supabaseAdmin
      .from('personal_devices')
      .select('id, device_name')
      .eq('user_id', user.id)
      .eq('hardware_fingerprint', hardware_fingerprint)
      .eq('is_active', true)

    console.log('🔍 [API] Existing device check:', { existingDevices, checkError })

    if (checkError) {
      console.error('❌ [API] Check error:', checkError)
      return NextResponse.json({ error: 'Database error during device check' }, { status: 500 })
    }

    const existingDevice = existingDevices && existingDevices.length > 0 ? existingDevices[0] : null
    let deviceResult;
    
    if (existingDevice) {
      // Update existing device
      console.log('📝 [API] Updating existing device:', existingDevice.id)
      const { data: updatedDevice, error: updateError } = await supabaseAdmin
        .from('personal_devices')
        .update({
          device_name: device_name,
          device_model: device_model,
          device_os: device_os,
          last_ping_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDevice.id)
        .select('id')
        .single()

      if (updateError) {
        console.error('❌ [API] Update error:', updateError)
        return NextResponse.json({ error: 'Failed to update device' }, { status: 500 })
      }

      deviceResult = {
        device_id: updatedDevice.id,
        action: 'updated_existing'
      }
    } else {
      // Create new device
      console.log('➕ [API] Creating new device')
      const { data: newDevice, error: insertError } = await supabaseAdmin
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
        return NextResponse.json({ error: 'Failed to create device' }, { status: 500 })
      }

      // Create default privacy settings if they don't exist
      const { error: privacyError } = await supabaseAdmin
        .from('privacy_settings')
        .upsert({ 
          user_id: user.id,
          location_sharing_enabled: false,
          home_privacy_enabled: true,
          data_retention_days: 7,
          share_with_emergency_contacts: false,
          anonymous_crash_detection: true,
          background_location_enabled: false
        }, {
          onConflict: 'user_id'
        })

      if (privacyError) {
        console.log('⚠️ [API] Privacy settings error (non-critical):', privacyError)
      }

      deviceResult = {
        device_id: newDevice.id,
        action: 'created_new'
      }
    }

    console.log('✅ [API] Device operation successful:', deviceResult)
    
    return NextResponse.json({
      success: true,
      message: deviceResult.action === 'created_new' ? 'Device registered successfully' : 'Device updated successfully',
      device_id: deviceResult.device_id,
      action: deviceResult.action
    })

  } catch (error) {
    console.error('💥 [API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] GET /api/device/personal - Starting request')
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ [API] No Authorization header provided')
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }
    
    // Verify the JWT token
    const token = authHeader.substring(7)
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token)
    
    if (userError || !userData.user) {
      console.error('❌ [API] Invalid token:', userError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const user = userData.user
    console.log('🔑 [API] Authenticated user:', user.email)

    // Set the session on the admin client
    await supabaseAdmin.auth.setSession({
      access_token: token,
      refresh_token: ''
    })

    // Get user's devices
    const { data: devices, error } = await supabaseAdmin
      .from('personal_devices')
      .select(`
        id,
        device_type,
        device_name,
        device_model,
        device_os,
        sharing_enabled,
        location_sharing_active,
        privacy_mode,
        last_ping_at,
        battery_level,
        is_active,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ [API] Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
    }

    console.log('✅ [API] Found devices:', devices?.length || 0)
    
    return NextResponse.json({
      success: true,
      devices: devices || []
    })

  } catch (error) {
    console.error('💥 [API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    console.log('🔍 [API] PATCH /api/device/personal - Starting request')
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ [API] No Authorization header provided')
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }
    
    // Verify the JWT token
    const token = authHeader.substring(7)
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token)
    
    if (userError || !userData.user) {
      console.error('❌ [API] Invalid token:', userError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const user = userData.user
    console.log('🔑 [API] Authenticated user:', user.email)

    const body = await request.json()
    const { device_id, sharing_enabled, location_sharing_active, privacy_mode } = body

    if (!device_id) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 })
    }

    // Set the session on the admin client
    await supabaseAdmin.auth.setSession({
      access_token: token,
      refresh_token: ''
    })

    // Update device settings
    const { data: updatedDevice, error } = await supabaseAdmin
      .from('personal_devices')
      .update({
        sharing_enabled,
        location_sharing_active,
        privacy_mode,
        updated_at: new Date().toISOString()
      })
      .eq('id', device_id)
      .eq('user_id', user.id) // Ensure user owns this device
      .select('id')
      .single()

    if (error) {
      console.error('❌ [API] Update error:', error)
      return NextResponse.json({ error: 'Failed to update device settings' }, { status: 500 })
    }

    if (!updatedDevice) {
      return NextResponse.json({ error: 'Device not found or access denied' }, { status: 404 })
    }

    console.log('✅ [API] Device settings updated successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Device settings updated successfully'
    })

  } catch (error) {
    console.error('💥 [API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 