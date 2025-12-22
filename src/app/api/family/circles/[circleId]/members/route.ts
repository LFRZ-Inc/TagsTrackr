import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

// GET - Get all members of a circle with their current locations and device info
export async function GET(
  request: NextRequest,
  { params }: { params: { circleId: string } }
) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const circleId = params.circleId

    // Verify user is a member of this circle
    const { data: membership } = await supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this circle' },
        { status: 403 }
      )
    }

    // Get all active members of the circle
    const { data: members, error: membersError } = await supabase
      .from('circle_members')
      .select(`
        id,
        role,
        location_sharing_enabled,
        joined_at,
        users:user_id(
          id,
          email,
          full_name
        )
      `)
      .eq('circle_id', circleId)
      .eq('is_active', true)

    if (membersError) {
      console.error('Error fetching members:', membersError)
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      )
    }

    // For each member, get their devices and latest locations
    const membersWithData = await Promise.all(
      (members || []).map(async (member: any) => {
        if (!member.users) {
          return {
            ...member,
            devices: [],
            current_location: null
          }
        }

        // Get all active devices for this user that have location sharing enabled
        // Only show devices if member has location sharing enabled for this circle
        if (!member.location_sharing_enabled) {
          return {
            ...member,
            devices: [],
            current_location: null,
            is_sharing: false,
            device_count: 0,
            active_device_count: 0
          }
        }

        const { data: devices, error: devicesError } = await supabase
          .from('personal_devices')
          .select('id, device_name, device_type, device_model, battery_level, last_ping_at, location_sharing_active')
          .eq('user_id', member.users.id)
          .eq('is_active', true)
          .eq('location_sharing_active', true) // Only show devices actively sharing location

        if (devicesError || !devices || devices.length === 0) {
          return {
            ...member,
            devices: [],
            current_location: null,
            is_sharing: false
          }
        }

        // Get latest location for each device
        const devicesWithLocations = await Promise.all(
          devices.map(async (device: any) => {
            if (!device.location_sharing_active) {
              return {
                ...device,
                current_location: null
              }
            }

            // Get latest location ping
            const { data: location, error: locationError } = await supabase
              .from('location_pings')
              .select('latitude, longitude, accuracy, recorded_at, speed, heading')
              .eq('device_id', device.id)
              .order('recorded_at', { ascending: false })
              .limit(1)
              .single()

            if (locationError || !location) {
              return {
                ...device,
                current_location: null
              }
            }

            return {
              ...device,
              current_location: {
                latitude: parseFloat(location.latitude),
                longitude: parseFloat(location.longitude),
                accuracy: location.accuracy ? parseFloat(location.accuracy) : undefined,
                speed: location.speed ? parseFloat(location.speed) : undefined,
                heading: location.heading ? parseFloat(location.heading) : undefined,
                recorded_at: location.recorded_at
              }
            }
          })
        )

        // Get the most recent location across all devices
        const locationsWithTime = devicesWithLocations
          .filter((d: any) => d.current_location)
          .map((d: any) => ({
            ...d.current_location,
            device_name: d.device_name,
            device_type: d.device_type
          }))
          .sort((a: any, b: any) => 
            new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
          )

        const latestLocation = locationsWithTime.length > 0 ? locationsWithTime[0] : null

        return {
          ...member,
          devices: devicesWithLocations,
          current_location: latestLocation ? {
            latitude: latestLocation.latitude,
            longitude: latestLocation.longitude,
            accuracy: latestLocation.accuracy,
            speed: latestLocation.speed,
            heading: latestLocation.heading,
            recorded_at: latestLocation.recorded_at,
            device_name: latestLocation.device_name,
            device_type: latestLocation.device_type
          } : null,
          is_sharing: member.location_sharing_enabled && latestLocation !== null,
          device_count: devices.length,
          active_device_count: devicesWithLocations.filter((d: any) => d.current_location).length
        }
      })
    )

    return NextResponse.json({
      circle_id: circleId,
      members: membersWithData,
      total_members: membersWithData.length,
      sharing_members: membersWithData.filter((m: any) => m.is_sharing).length
    })
  } catch (error) {
    console.error('Get circle members error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

