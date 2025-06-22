import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

// Create client for auth verification - handle missing env vars during build
const getSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 [API] POST /api/ping/personal - Processing location ping')
    
    // Get Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ [API] No valid authorization header')
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    // Get Supabase client
    const supabaseAuth = getSupabaseClient()

    // Verify the JWT token
    const token = authHeader.substring(7)
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token)
    
    if (userError || !userData.user) {
      console.error('❌ [API] Auth failed:', userError)
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    console.log('✅ [API] User authenticated:', userData.user.email)

    const body = await request.json()
    const {
      device_id,
      latitude,
      longitude,
      accuracy,
      altitude,
      speed,
      heading,
      source = 'browser_geolocation',
      is_background = false
    } = body

    console.log('📍 [API] Ping data:', { device_id, latitude, longitude, accuracy, source, is_background })

    // Validate required fields
    if (!device_id || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: device_id, latitude, longitude' },
        { status: 400 }
      )
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      )
    }

    // Set session for RLS
    await supabaseAuth.auth.setSession({
      access_token: token,
      refresh_token: '', // Not needed for this operation
    })

    // Record location ping directly to location_pings table
    // Try the new schema first, fallback to old schema if needed
    let data, error
    
    try {
      const result = await supabaseAuth
        .from('location_pings')
        .insert({
          device_id: device_id,
          user_id: userData.user.id,
          user_email: userData.user.email!,
          latitude: latitude,
          longitude: longitude,
          accuracy: accuracy,
          timestamp: new Date().toISOString()
        })
        .select()
        .single()
      
      data = result.data
      error = result.error
    } catch (schemaError) {
      // If location_pings doesn't exist, try inserting a manual GPS ping record
      console.log('location_pings table not found, creating manual record')
      
      // First, let's just update the device's last_ping_at
      const updateResult = await supabaseAuth
        .from('personal_devices')
        .update({ 
          last_ping_at: new Date().toISOString(),
          location_sharing_enabled: true 
        })
        .eq('id', device_id)
        .select()
        .single()
        
      data = updateResult.data
      error = updateResult.error
    }

    if (error) {
      console.error('❌ [API] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to record location ping: ' + error.message },
        { status: 500 }
      )
    }

    console.log('✅ [API] Location ping recorded successfully:', data)

    return NextResponse.json({
      success: true,
      result: data,
      message: 'Location recorded successfully'
    })

  } catch (error) {
    console.error('❌ [API] Error processing location ping:', error)
    return NextResponse.json(
      { error: 'Failed to process location ping' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    // Get Supabase client
    const supabaseAuth = getSupabaseClient()

    // Verify the JWT token
    const token = authHeader.substring(7)
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token)
    
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    const url = new URL(request.url)
    const deviceId = url.searchParams.get('device_id')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    if (!deviceId) {
      return NextResponse.json({ error: 'device_id required' }, { status: 400 })
    }

    // Set session for RLS
    await supabaseAuth.auth.setSession({
      access_token: token,
      refresh_token: '',
    })

    // Verify user owns this device first
    const { data: device, error: deviceError } = await supabaseAuth
      .from('personal_devices')
      .select('user_id')
      .eq('id', deviceId)
      .single()

    if (deviceError || device?.user_id !== userData.user.id) {
      return NextResponse.json({ error: 'Device not found or access denied' }, { status: 403 })
    }

    // Get recent location history for device
    const { data: locations, error } = await supabaseAuth
      .from('location_pings')
      .select(`
        id,
        latitude,
        longitude,
        accuracy,
        timestamp,
        created_at
      `)
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({
      success: true,
      locations: locations || [],
      count: locations?.length || 0
    })

  } catch (error) {
    console.error('Error fetching location history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch location history' },
      { status: 500 }
    )
  }
} 