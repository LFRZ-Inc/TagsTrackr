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
      source = 'browser_geolocation',
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

    // Record location ping using stored function
    const { data, error } = await supabase.rpc('record_location_ping', {
      p_device_id: device_id,
      p_latitude: latitude,
      p_longitude: longitude,
      p_accuracy: accuracy,
      p_altitude: altitude,
      p_speed: speed,
      p_heading: heading,
      p_location_source: source,
      p_is_background_ping: is_background
    })

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      ping_id: data,
      message: 'Location recorded successfully'
    })

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

    // Verify user owns this device first
    const { data: device, error: deviceError } = await supabase
      .from('personal_devices')
      .select('user_id')
      .eq('id', deviceId)
      .single()

    if (deviceError || device?.user_id !== user.id) {
      return NextResponse.json({ error: 'Device not found or access denied' }, { status: 403 })
    }

    // Get recent location history for device
    const { data: locations, error } = await supabase
      .from('location_pings')
      .select(`
        id,
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        heading,
        location_source,
        is_background,
        recorded_at,
        created_at
      `)
      .eq('device_id', deviceId)
      .order('recorded_at', { ascending: false })
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