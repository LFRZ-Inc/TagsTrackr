import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { tagId: string } }
) {
  try {
    const { tagId } = params

    if (!tagId) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      )
    }

    // Get tag information
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('*')
      .eq('tag_id', tagId)
      .single()

    if (tagError || !tag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      )
    }

    // Get latest GPS ping
    const { data: latestPing, error: pingError } = await supabase
      .from('gps_pings')
      .select('*')
      .eq('tag_id', tagId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (pingError && pingError.code !== 'PGRST116') {
      console.error('Failed to fetch latest ping:', pingError)
      return NextResponse.json(
        { error: 'Failed to fetch location data' },
        { status: 500 }
      )
    }

    // Get recent ping history (last 10 pings)
    const { data: recentPings, error: historyError } = await supabase
      .from('gps_pings')
      .select('*')
      .eq('tag_id', tagId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (historyError) {
      console.error('Failed to fetch ping history:', historyError)
    }

    const response = {
      tag: {
        id: tag.tag_id,
        is_active: tag.is_active,
        battery_level: tag.battery_level,
        last_ping: tag.last_ping,
        created_at: tag.created_at
      },
      current_location: latestPing ? {
        latitude: latestPing.latitude,
        longitude: latestPing.longitude,
        accuracy: latestPing.accuracy,
        timestamp: latestPing.timestamp,
        battery_level: latestPing.battery_level,
        signal_strength: latestPing.signal_strength
      } : null,
      recent_locations: recentPings || [],
      status: tag.is_active ? 'active' : 'inactive'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Track tag error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 