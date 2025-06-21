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

// Create a new geofence
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      center_latitude,
      center_longitude,
      radius_meters,
      device_id,
      is_home_fence = false,
      is_private = false,
      alert_on_enter = true,
      alert_on_exit = true
    } = body

    // Validate required fields
    if (!name || !center_latitude || !center_longitude || !radius_meters) {
      return NextResponse.json(
        { error: 'Missing required fields: name, center_latitude, center_longitude, radius_meters' },
        { status: 400 }
      )
    }

    // Validate coordinates
    if (center_latitude < -90 || center_latitude > 90 || center_longitude < -180 || center_longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      )
    }

    // If device_id is provided, verify user owns the device
    if (device_id) {
      const { data: device, error: deviceError } = await supabase
        .from('personal_devices')
        .select('user_id')
        .eq('id', device_id)
        .single()

      if (deviceError || device?.user_id !== user.id) {
        return NextResponse.json({ error: 'Device not found or access denied' }, { status: 403 })
      }
    }

    // Create geofence
    const { data: geofence, error } = await supabase
      .from('geofences')
      .insert({
        name,
        description,
        center_latitude,
        center_longitude,
        radius_meters,
        user_id: user.id,
        device_id,
        is_home_fence,
        is_private,
        alert_on_enter,
        alert_on_exit
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      geofence,
      message: 'Geofence created successfully'
    })

  } catch (error) {
    console.error('Error creating geofence:', error)
    return NextResponse.json(
      { error: 'Failed to create geofence' },
      { status: 500 }
    )
  }
}

// Get user's geofences
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const deviceId = url.searchParams.get('device_id')
    const includeInactive = url.searchParams.get('include_inactive') === 'true'

    let query = supabase
      .from('geofences')
      .select(`
        id,
        name,
        description,
        center_latitude,
        center_longitude,
        radius_meters,
        device_id,
        is_home_fence,
        is_private,
        alert_on_enter,
        alert_on_exit,
        is_active,
        created_at,
        updated_at,
        personal_devices(device_name, device_type)
      `)
      .eq('user_id', user.id)

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    if (deviceId) {
      query = query.eq('device_id', deviceId)
    }

    const { data: geofences, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      geofences: geofences || []
    })

  } catch (error) {
    console.error('Error fetching geofences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch geofences' },
      { status: 500 }
    )
  }
}

// Update a geofence
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Geofence ID is required' }, { status: 400 })
    }

    // Verify user owns this geofence
    const { data: geofence, error: geofenceError } = await supabase
      .from('geofences')
      .select('user_id')
      .eq('id', id)
      .single()

    if (geofenceError || geofence?.user_id !== user.id) {
      return NextResponse.json({ error: 'Geofence not found or access denied' }, { status: 403 })
    }

    // Update geofence
    const { data: updatedGeofence, error } = await supabase
      .from('geofences')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      geofence: updatedGeofence,
      message: 'Geofence updated successfully'
    })

  } catch (error) {
    console.error('Error updating geofence:', error)
    return NextResponse.json(
      { error: 'Failed to update geofence' },
      { status: 500 }
    )
  }
}

// Delete a geofence
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const geofenceId = url.searchParams.get('id')

    if (!geofenceId) {
      return NextResponse.json({ error: 'Geofence ID is required' }, { status: 400 })
    }

    // Verify user owns this geofence
    const { data: geofence, error: geofenceError } = await supabase
      .from('geofences')
      .select('user_id')
      .eq('id', geofenceId)
      .single()

    if (geofenceError || geofence?.user_id !== user.id) {
      return NextResponse.json({ error: 'Geofence not found or access denied' }, { status: 403 })
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('geofences')
      .update({ is_active: false })
      .eq('id', geofenceId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Geofence deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting geofence:', error)
    return NextResponse.json(
      { error: 'Failed to delete geofence' },
      { status: 500 }
    )
  }
} 