import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

// Create client for auth verification
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Create admin client that bypasses RLS
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

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] POST /api/device/personal - Starting device registration')
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [API] No valid authorization header')
      return NextResponse.json(
        { error: 'Please log in to add devices' },
        { status: 401 }
      )
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '')
    console.log('🔑 [API] Token received, length:', token.length)

    // Verify user with auth client
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    
    if (authError || !user) {
      console.log('❌ [API] Auth verification failed:', authError?.message)
      return NextResponse.json(
        { error: 'Auth session missing!' },
        { status: 401 }
      )
    }

    console.log('✅ [API] User authenticated:', user.email, 'User ID:', user.id)

    // Parse request body
    const body = await request.json()
    console.log('📝 [API] Request body:', JSON.stringify(body, null, 2))

    const {
      device_type,
      device_name,
      hardware_fingerprint,
      device_model,
      device_os
    } = body

    // Validate required fields
    if (!device_type || !device_name || !hardware_fingerprint) {
      console.log('❌ [API] Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if device already exists using admin client (bypasses RLS)
    console.log('🔍 [API] Checking for existing device...')
    const { data: existingDevices, error: checkError } = await supabaseAdmin
      .from('personal_devices')
      .select('id, device_name')
      .eq('user_id', user.id)
      .eq('hardware_fingerprint', hardware_fingerprint)
      .eq('is_active', true)

    if (checkError) {
      console.log('❌ [API] Error checking existing devices:', checkError)
      return NextResponse.json(
        { error: 'Database error checking existing devices' },
        { status: 500 }
      )
    }

    if (existingDevices && existingDevices.length > 0) {
      console.log('⚠️ [API] Device already registered:', existingDevices[0])
      return NextResponse.json(
        { error: 'Device already registered', device: existingDevices[0] },
        { status: 409 }
      )
    }

    // Create new device using admin client (bypasses RLS)
    console.log('➕ [API] Creating new device...')
    const deviceData = {
      user_id: user.id,
      device_type,
      device_name,
      hardware_fingerprint,
      device_model: device_model || 'Unknown',
      device_os: device_os || 'Unknown',
      is_active: true,
      location_sharing_active: false,
      sharing_enabled: true,
      privacy_mode: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: newDevice, error: insertError } = await supabaseAdmin
      .from('personal_devices')
      .insert(deviceData)
      .select('*')
      .single()

    if (insertError) {
      console.log('❌ [API] Error creating device:', insertError)
      return NextResponse.json(
        { error: 'Failed to create device: ' + insertError.message },
        { status: 500 }
      )
    }

    console.log('✅ [API] Device created successfully:', newDevice.id)
    
    return NextResponse.json({
      success: true,
      device: newDevice,
      message: 'Device registered successfully!'
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
    console.log('🔍 [API] GET /api/device/personal - Fetching devices')
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [API] No valid authorization header')
      return NextResponse.json(
        { error: 'Please log in to view devices' },
        { status: 401 }
      )
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '')
    
    // Verify user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    
    if (authError || !user) {
      console.log('❌ [API] Auth verification failed:', authError?.message)
      return NextResponse.json(
        { error: 'Auth session missing!' },
        { status: 401 }
      )
    }

    console.log('✅ [API] User authenticated:', user.email)

    // Fetch user's devices using admin client
    const { data: devices, error: fetchError } = await supabaseAdmin
      .from('personal_devices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.log('❌ [API] Error fetching devices:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch devices' },
        { status: 500 }
      )
    }

    console.log('✅ [API] Found', devices?.length || 0, 'devices')
    
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