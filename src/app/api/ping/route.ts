import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { lat, lon, device_id, accuracy, altitude, speed, heading } = await request.json()

    // Validate required fields
    if (!lat || !lon || !device_id) {
      return NextResponse.json(
        { error: 'Missing required fields: lat, lon, device_id' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = createSupabaseServerClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify device belongs to user
    const { data: device, error: deviceError } = await supabase
      .from('personal_devices')
      .select('id, device_name, user_id')
      .eq('id', device_id)
      .eq('user_id', user.id)
      .single()

    if (deviceError || !device) {
      return NextResponse.json(
        { error: 'Device not found or unauthorized' },
        { status: 404 }
      )
    }

    // Insert location ping
    const { data: ping, error: pingError } = await supabase
      .from('location_pings')
      .insert({
        device_id: device_id,
        latitude: lat,
        longitude: lon,
        accuracy: accuracy || null,
        altitude: altitude || null,
        speed: speed || null,
        heading: heading || null,
        recorded_at: new Date().toISOString(),
        is_background_ping: false,
        location_source: 'gps'
      })
      .select()
      .single()

    if (pingError) {
      console.error('Ping error:', pingError)
      return NextResponse.json(
        { error: 'Failed to save location ping' },
        { status: 500 }
      )
    }

    // Update device's last ping timestamp
    const { error: updateError } = await supabase
      .from('personal_devices')
      .update({ 
        last_ping_at: new Date().toISOString(),
        location_sharing_active: true
      })
      .eq('id', device_id)

    if (updateError) {
      console.error('Update error:', updateError)
      // Don't fail the request if update fails
    }

    return NextResponse.json({
      success: true,
      message: `Location updated for ${device.device_name}`,
      ping: ping,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Ping API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Ping API endpoint',
    usage: 'POST with { lat, lon, device_id, accuracy?, altitude?, speed?, heading? }'
  })
} 