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
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // The `delete` method was called from a Server Component.
          }
        },
      },
    }
  )
}

// Get movement analytics for user's devices
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const deviceId = url.searchParams.get('device_id')
    const timeframe = url.searchParams.get('timeframe') || '7d' // 1d, 7d, 30d, 90d
    const type = url.searchParams.get('type') || 'summary' // summary, sessions, heatmap

    // Calculate date range based on timeframe
    const now = new Date()
    const startDate = new Date()
    switch (timeframe) {
      case '1d':
        startDate.setDate(now.getDate() - 1)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    if (type === 'summary') {
      return await getAnalyticsSummary(supabase, user.id, deviceId, startDate, now)
    } else if (type === 'sessions') {
      return await getMovementSessions(supabase, user.id, deviceId, startDate, now)
    } else if (type === 'heatmap') {
      return await getLocationHeatmap(supabase, user.id, deviceId, startDate, now)
    }

    return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 })

  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

async function getAnalyticsSummary(supabase: any, userId: string, deviceId: string | null, startDate: Date, endDate: Date) {
  // Build device filter
  let deviceFilter = `user_id.eq.${userId}`
  if (deviceId) {
    deviceFilter += `,id.eq.${deviceId}`
  }

  // Get user's devices
  const { data: devices, error: devicesError } = await supabase
    .from('personal_devices')
    .select('id, device_name, device_type')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (devicesError) throw devicesError

  const deviceIds = deviceId ? [deviceId] : devices.map((d: any) => d.id)

  // Get location ping statistics
  const { data: pingStats, error: pingError } = await supabase
    .from('location_pings')
    .select('device_id, latitude, longitude, speed, recorded_at')
    .in('device_id', deviceIds)
    .gte('recorded_at', startDate.toISOString())
    .lte('recorded_at', endDate.toISOString())
    .order('recorded_at', { ascending: true })

  if (pingError) throw pingError

  // Get movement sessions
  const { data: sessions, error: sessionsError } = await supabase
    .from('movement_sessions')
    .select('*')
    .in('device_id', deviceIds)
    .gte('session_start', startDate.toISOString())
    .lte('session_start', endDate.toISOString())

  if (sessionsError) throw sessionsError

  // Calculate analytics
  const analytics = {
    timeframe: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    devices: devices.map((device: any) => {
      const devicePings = pingStats.filter((p: any) => p.device_id === device.id)
      const deviceSessions = sessions.filter((s: any) => s.device_id === device.id)
      
      return {
        ...device,
        total_pings: devicePings.length,
        total_distance: deviceSessions.reduce((sum: number, s: any) => sum + (s.total_distance_meters || 0), 0),
        total_sessions: deviceSessions.length,
        avg_speed: deviceSessions.length > 0 
          ? deviceSessions.reduce((sum: number, s: any) => sum + (s.avg_speed_kmh || 0), 0) / deviceSessions.length 
          : 0,
        max_speed: Math.max(...deviceSessions.map((s: any) => s.max_speed_kmh || 0), 0),
        active_days: new Set(devicePings.map((p: any) => p.recorded_at.split('T')[0])).size
      }
    }),
    summary: {
      total_devices: devices.length,
      total_pings: pingStats.length,
      total_distance: sessions.reduce((sum: number, s: any) => sum + (s.total_distance_meters || 0), 0),
      total_sessions: sessions.length,
      avg_session_duration: sessions.length > 0 
        ? sessions.reduce((sum: number, s: any) => {
            const start = new Date(s.session_start)
            const end = s.session_end ? new Date(s.session_end) : new Date()
            return sum + (end.getTime() - start.getTime()) / 1000 / 60 // minutes
          }, 0) / sessions.length 
        : 0,
      unique_locations: new Set(pingStats.map((p: any) => `${Math.round(p.latitude * 100)},${Math.round(p.longitude * 100)}`)).size
    }
  }

  return NextResponse.json({
    success: true,
    analytics
  })
}

async function getMovementSessions(supabase: any, userId: string, deviceId: string | null, startDate: Date, endDate: Date) {
  // Get user's devices
  const { data: devices, error: devicesError } = await supabase
    .from('personal_devices')
    .select('id, device_name, device_type')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (devicesError) throw devicesError

  const deviceIds = deviceId ? [deviceId] : devices.map((d: any) => d.id)

  // Get movement sessions with device info
  const { data: sessions, error } = await supabase
    .from('movement_sessions')
    .select(`
      *,
      personal_devices(device_name, device_type)
    `)
    .in('device_id', deviceIds)
    .gte('session_start', startDate.toISOString())
    .lte('session_start', endDate.toISOString())
    .order('session_start', { ascending: false })

  if (error) throw error

  return NextResponse.json({
    success: true,
    sessions: sessions || []
  })
}

async function getLocationHeatmap(supabase: any, userId: string, deviceId: string | null, startDate: Date, endDate: Date) {
  // Get user's devices
  const { data: devices, error: devicesError } = await supabase
    .from('personal_devices')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (devicesError) throw devicesError

  const deviceIds = deviceId ? [deviceId] : devices.map((d: any) => d.id)

  // Get location data for heatmap (sampling for performance)
  const { data: locations, error } = await supabase
    .from('location_pings')
    .select('latitude, longitude, recorded_at, device_id')
    .in('device_id', deviceIds)
    .gte('recorded_at', startDate.toISOString())
    .lte('recorded_at', endDate.toISOString())
    .order('recorded_at', { ascending: true })

  if (error) throw error

  // Group locations by proximity (for heatmap visualization)
  const heatmapData = locations.reduce((acc: any, location: any) => {
    const key = `${Math.round(location.latitude * 1000)},${Math.round(location.longitude * 1000)}`
    if (!acc[key]) {
      acc[key] = {
        latitude: location.latitude,
        longitude: location.longitude,
        count: 0,
        times: []
      }
    }
    acc[key].count++
    acc[key].times.push(location.recorded_at)
    return acc
  }, {})

  return NextResponse.json({
    success: true,
    heatmap: Object.values(heatmapData),
    total_points: locations.length
  })
} 