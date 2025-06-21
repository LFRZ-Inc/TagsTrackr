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
      },
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      device_id,
      latitude,
      longitude,
      accuracy,
      altitude,
      speed,
      heading,
      source = 'gps',
      is_background = false
    } = body

    // Validate required fields
    if (!device_id || !latitude || !longitude) {
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

    // Process location ping using stored function
    const { data, error } = await supabase.rpc('process_location_ping', {
      p_device_id: device_id,
      p_latitude: latitude,
      p_longitude: longitude,
      p_accuracy: accuracy,
      p_altitude: altitude,
      p_speed: speed,
      p_heading: heading,
      p_source: source,
      p_is_background: is_background
    })

    if (error) throw error

    return NextResponse.json(data)

  } catch (error) {
    console.error('Error processing location ping:', error)
    return NextResponse.json(
      { error: 'Failed to process location ping' },
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
    const deviceId = url.searchParams.get('device_id')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    if (!deviceId) {
      return NextResponse.json({ error: 'device_id required' }, { status: 400 })
    }

    // Get recent location history for device
    const { data: locations, error } = await supabase
      .from('device_locations')
      .select(`
        id,
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        heading,
        source_device_type,
        accuracy_radius,
        location_source,
        is_background_ping,
        recorded_at,
        created_at
      `)
      .eq('device_id', deviceId)
      .order('recorded_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Verify user owns this device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('owner_id')
      .eq('id', deviceId)
      .single()

    if (deviceError || device?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Device not found or access denied' }, { status: 403 })
    }

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