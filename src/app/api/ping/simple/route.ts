import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Simple ping endpoint for location tracking using user authentication

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Simple ping endpoint called')
    
    // Check environment variables
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasAnonKey: !!supabaseAnonKey 
      })
      return NextResponse.json({ 
        error: 'Server configuration error' 
      }, { status: 500 })
    }

    // Get Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No valid authorization header')
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Create Supabase client with user token
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Set the user session
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData.user) {
      console.error('❌ Auth failed:', userError)
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    console.log('✅ User authenticated:', userData.user.email)

    const body = await request.json()
    console.log('📍 Request body:', body)
    
    const { device_id, latitude, longitude, accuracy = 10.0 } = body

    if (!device_id || latitude === undefined || longitude === undefined) {
      console.error('❌ Missing required fields:', { device_id, latitude, longitude })
      return NextResponse.json({ 
        error: 'Missing required fields: device_id, latitude, longitude' 
      }, { status: 400 })
    }

    // Validate numeric values
    const lat = typeof latitude === 'number' ? latitude : parseFloat(latitude)
    const lng = typeof longitude === 'number' ? longitude : parseFloat(longitude)
    const acc = typeof accuracy === 'number' ? accuracy : parseFloat(accuracy)

    if (isNaN(lat) || isNaN(lng) || isNaN(acc)) {
      console.error('❌ Invalid numeric values:', { lat, lng, acc })
      return NextResponse.json({ 
        error: 'Invalid numeric values for coordinates' 
      }, { status: 400 })
    }

    console.log('📍 Updating device with location:', { device_id, lat, lng, acc })

    // Set session for RLS
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: '', // Not needed for this operation
    })

    // Update the device with location data and mark as active
    const { data, error } = await supabase
      .from('personal_devices')
      .update({
        last_ping_at: new Date().toISOString(),
        location_sharing_active: true,
        metadata: {
          current_location: {
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            timestamp: new Date().toISOString()
          }
        }
      })
      .eq('id', device_id)
      .eq('user_id', userData.user.id) // Ensure user owns this device
      .select()
      .single()

    if (error) {
      console.error('❌ Database update error:', error)
      return NextResponse.json({ 
        error: 'Failed to update device location',
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Device updated successfully:', data)

    return NextResponse.json({ 
      success: true,
      message: 'Location updated successfully',
      device: data,
      location: {
        latitude: lat,
        longitude: lng,
        accuracy: acc
      }
    })

  } catch (err) {
    console.error('Simple ping error:', err)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const device_id = searchParams.get('device_id')

    if (!device_id) {
      return NextResponse.json({ error: 'device_id is required' }, { status: 400 })
    }

    // Get Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Verify the JWT token
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    // Set session for RLS
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    })

    const { data, error } = await supabase
      .from('personal_devices')
      .select('*')
      .eq('id', device_id)
      .eq('user_id', userData.user.id)
      .single()

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to get device',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      device: data,
      current_location: data.metadata?.current_location || null
    })

  } catch (err) {
    console.error('Get device error:', err)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
} 