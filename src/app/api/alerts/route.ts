import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET - Retrieve user's alerts
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const alertType = searchParams.get('type')
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('alerts')
      .select(`
        *,
        personal_devices (
          device_name,
          device_type,
          device_model
        )
      `)
      .eq('user_id', user.id)
      .order('triggered_at', { ascending: false })
      .limit(limit)

    if (alertType) {
      query = query.eq('alert_type', alertType)
    }

    if (unreadOnly) {
      query = query.is('viewed_at', null)
    }

    const { data: alerts, error } = await query

    if (error) {
      console.error('Error fetching alerts:', error)
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }

    // Get alert statistics
    const { data: stats } = await supabase
      .from('alerts')
      .select('alert_type, viewed_at, resolved_at')
      .eq('user_id', user.id)

    const alertStats = {
      total: stats?.length || 0,
      unread: stats?.filter(s => !s.viewed_at).length || 0,
      resolved: stats?.filter(s => s.resolved_at).length || 0,
      byType: {
        movement: stats?.filter(s => s.alert_type === 'movement').length || 0,
        geofence_exit: stats?.filter(s => s.alert_type === 'geofence_exit').length || 0,
        theft: stats?.filter(s => s.alert_type === 'theft').length || 0,
        low_battery: stats?.filter(s => s.alert_type === 'low_battery').length || 0,
        data_low: stats?.filter(s => s.alert_type === 'data_low').length || 0
      }
    }

    return NextResponse.json({
      alerts: alerts || [],
      stats: alertStats
    })
  } catch (error) {
    console.error('Error in alerts GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new alert or trigger alert
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      deviceId, 
      alertType, 
      metadata = {}, 
      triggerCondition = null 
    } = body

    if (!deviceId || !alertType) {
      return NextResponse.json(
        { error: 'Device ID and alert type are required' },
        { status: 400 }
      )
    }

    // Validate alert type
    const validAlertTypes = ['movement', 'geofence_exit', 'theft', 'low_battery', 'data_low']
    if (!validAlertTypes.includes(alertType)) {
      return NextResponse.json(
        { error: 'Invalid alert type' },
        { status: 400 }
      )
    }

    // Verify device ownership
    const { data: device, error: deviceError } = await supabase
      .from('personal_devices')
      .select('id, user_id, device_name')
      .eq('id', deviceId)
      .eq('user_id', user.id)
      .single()

    if (deviceError || !device) {
      return NextResponse.json(
        { error: 'Device not found or access denied' },
        { status: 404 }
      )
    }

    // Check if similar alert exists recently (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recentAlert } = await supabase
      .from('alerts')
      .select('id')
      .eq('tag_id', deviceId)
      .eq('alert_type', alertType)
      .gte('triggered_at', oneHourAgo)
      .limit(1)
      .single()

    if (recentAlert) {
      return NextResponse.json(
        { error: 'Similar alert already triggered recently' },
        { status: 409 }
      )
    }

    // Create the alert
    const { data: alert, error: alertError } = await supabase
      .from('alerts')
      .insert({
        tag_id: deviceId,
        user_id: user.id,
        alert_type: alertType,
        metadata: {
          ...metadata,
          trigger_condition: triggerCondition,
          device_name: device.device_name,
          triggered_by: 'system'
        },
        is_active: true
      })
      .select()
      .single()

    if (alertError) {
      console.error('Error creating alert:', alertError)
      return NextResponse.json(
        { error: 'Failed to create alert' },
        { status: 500 }
      )
    }

    // If this is a geofence alert, also create alerts for family members with full access
    if (alertType === 'geofence_exit' || alertType === 'theft') {
      const { data: shares } = await supabase
        .from('tag_shares')
        .select('shared_with_user_id')
        .eq('tag_id', deviceId)
        .eq('permissions', 'full')
        .eq('is_active', true)

      if (shares && shares.length > 0) {
        const familyAlerts = shares.map(share => ({
          tag_id: deviceId,
          user_id: share.shared_with_user_id,
          alert_type: alertType,
          metadata: {
            ...metadata,
            shared_alert: true,
            original_owner: user.id,
            device_name: device.device_name
          },
          is_active: true
        }))

        await supabase.from('alerts').insert(familyAlerts)
      }
    }

    return NextResponse.json({
      success: true,
      alert,
      message: 'Alert created successfully'
    })
  } catch (error) {
    console.error('Error in alerts POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update alert (mark as viewed/resolved)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { alertId, action } = body

    if (!alertId || !action) {
      return NextResponse.json(
        { error: 'Alert ID and action are required' },
        { status: 400 }
      )
    }

    const validActions = ['view', 'resolve', 'unresolve']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    // Verify alert ownership
    const { data: alert, error: alertError } = await supabase
      .from('alerts')
      .select('id, user_id')
      .eq('id', alertId)
      .eq('user_id', user.id)
      .single()

    if (alertError || !alert) {
      return NextResponse.json(
        { error: 'Alert not found or access denied' },
        { status: 404 }
      )
    }

    // Update alert based on action
    const updateData: any = {}
    
    switch (action) {
      case 'view':
        updateData.viewed_at = new Date().toISOString()
        break
      case 'resolve':
        updateData.resolved_at = new Date().toISOString()
        updateData.is_active = false
        break
      case 'unresolve':
        updateData.resolved_at = null
        updateData.is_active = true
        break
    }

    const { error: updateError } = await supabase
      .from('alerts')
      .update(updateData)
      .eq('id', alertId)

    if (updateError) {
      console.error('Error updating alert:', updateError)
      return NextResponse.json(
        { error: 'Failed to update alert' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Alert ${action}ed successfully`
    })
  } catch (error) {
    console.error('Error in alerts PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete alert
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const alertId = searchParams.get('alertId')

    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      )
    }

    // Verify alert ownership
    const { data: alert, error: alertError } = await supabase
      .from('alerts')
      .select('id, user_id')
      .eq('id', alertId)
      .eq('user_id', user.id)
      .single()

    if (alertError || !alert) {
      return NextResponse.json(
        { error: 'Alert not found or access denied' },
        { status: 404 }
      )
    }

    // Delete the alert
    const { error: deleteError } = await supabase
      .from('alerts')
      .delete()
      .eq('id', alertId)

    if (deleteError) {
      console.error('Error deleting alert:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete alert' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Alert deleted successfully'
    })
  } catch (error) {
    console.error('Error in alerts DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 