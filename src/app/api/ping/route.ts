import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { 
      tag_id, 
      latitude, 
      longitude, 
      accuracy,
      battery_level,
      signal_strength,
      timestamp 
    } = await request.json()

    if (!tag_id || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Tag ID, latitude, and longitude are required' },
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

    // Check if tag exists
    const { data: tag } = await supabase
      .from('tags')
      .select('*')
      .eq('tag_id', tag_id)
      .single()

    if (!tag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      )
    }

    // Insert GPS ping
    const { data: ping, error: pingError } = await supabase
      .from('gps_pings')
      .insert({
        tag_id: tag.id,
        latitude,
        longitude,
        accuracy: accuracy || null,
        battery_level: battery_level || null,
        signal_strength: signal_strength || null,
        timestamp: timestamp || new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (pingError) {
      console.error('Failed to insert ping:', pingError)
      return NextResponse.json(
        { error: 'Failed to record ping' },
        { status: 500 }
      )
    }

    // Update tag with latest ping info
    const { error: updateError } = await supabase
      .from('tags')
      .update({
        battery_level: battery_level || tag.battery_level,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('tag_id', tag_id)

    if (updateError) {
      console.error('Failed to update tag:', updateError)
    }

    // Log ping for analytics
    const { error: logError } = await supabase
      .from('pings_log')
      .insert({
        tag_id: tag.id,
        ping_data: {
          latitude,
          longitude,
          accuracy,
          battery_level,
          signal_strength,
          timestamp
        },
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Failed to log ping:', logError)
    }

    return NextResponse.json({ 
      message: 'Ping recorded successfully',
      ping_id: ping.id,
      timestamp: ping.created_at
    })

  } catch (error) {
    console.error('Ping recording error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 