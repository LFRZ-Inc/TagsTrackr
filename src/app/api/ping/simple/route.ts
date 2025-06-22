import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { device_id, latitude, longitude, accuracy = 10.0 } = body

    if (!device_id || !latitude || !longitude) {
      return NextResponse.json({ 
        error: 'Missing required fields: device_id, latitude, longitude' 
      }, { status: 400 })
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update the device with location data and mark as active
    const { data, error } = await supabase
      .from('personal_devices')
      .update({
        last_ping_at: new Date().toISOString(),
        location_sharing_enabled: true,
        // Store location as JSON in a metadata field if available
        metadata: {
          current_location: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            accuracy: parseFloat(accuracy),
            timestamp: new Date().toISOString()
          }
        }
      })
      .eq('id', device_id)
      .select()
      .single()

    if (error) {
      console.error('Device update error:', error)
      return NextResponse.json({ 
        error: 'Failed to update device location',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Location updated successfully',
      device: data,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: parseFloat(accuracy)
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase
      .from('personal_devices')
      .select('*')
      .eq('id', device_id)
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