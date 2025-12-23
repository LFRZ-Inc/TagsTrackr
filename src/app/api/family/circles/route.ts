import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

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

function createAdminClient() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient } = require('@supabase/supabase-js')
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }
  return null
}

// GET - Get all circles for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all circles the user belongs to
    const { data: circles, error: circlesError } = await supabase
      .from('family_circles')
      .select(`
        *,
        circle_members!inner(
          user_id,
          role,
          location_sharing_enabled,
          users:user_id(email, full_name)
        )
      `)
      .eq('circle_members.user_id', user.id)
      .eq('circle_members.is_active', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (circlesError) {
      console.error('Error fetching circles:', circlesError)
      return NextResponse.json(
        { error: 'Failed to fetch circles' },
        { status: 500 }
      )
    }

    // For each circle, get all members with their latest locations
    const circlesWithMembers = await Promise.all(
      (circles || []).map(async (circle: any) => {
        const { data: members, error: membersError } = await supabase
          .from('circle_members')
          .select(`
            *,
            users:user_id(id, email, full_name)
          `)
          .eq('circle_id', circle.id)
          .eq('is_active', true)

        if (membersError) {
          console.error('Error fetching members:', membersError)
          return { ...circle, members: [] }
        }

        // Get latest location for each member
        const membersWithLocations = await Promise.all(
          (members || []).map(async (member: any) => {
            if (!member.location_sharing_enabled || !member.users) {
              return { ...member, current_location: null }
            }

            // Get user's devices
            const { data: devices } = await supabase
              .from('personal_devices')
              .select('id')
              .eq('user_id', member.users.id)
              .eq('location_sharing_active', true)
              .limit(1)

            if (!devices || devices.length === 0) {
              return { ...member, current_location: null }
            }

            // Get latest location ping
            const { data: location } = await supabase
              .from('location_pings')
              .select('latitude, longitude, accuracy, recorded_at')
              .eq('device_id', devices[0].id)
              .order('recorded_at', { ascending: false })
              .limit(1)
              .single()

            return {
              ...member,
              current_location: location ? {
                latitude: parseFloat(location.latitude),
                longitude: parseFloat(location.longitude),
                accuracy: location.accuracy ? parseFloat(location.accuracy) : undefined,
                recorded_at: location.recorded_at
              } : null
            }
          })
        )

        return {
          ...circle,
          members: membersWithLocations
        }
      })
    )

    return NextResponse.json({
      circles: circlesWithMembers
    })
  } catch (error) {
    console.error('Get circles error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new circle
export async function POST(request: NextRequest) {
  try {
    // Parse request body first to get userId from client
    const body = await request.json()
    const { name, description, color, userId } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Circle name is required' },
        { status: 400 }
      )
    }

    // Use userId from request body if provided (from client), otherwise try server auth
    let targetUserId: string | null = userId || null

    // Try to get user from server-side auth as fallback/verification
    const supabase = createSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // If we have userId from client, use it. Otherwise try server auth
    if (!targetUserId) {
      if (user) {
        targetUserId = user.id
        console.log('Using authenticated user:', user.id, user.email)
      } else {
        // Try session as last resort
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (session?.user) {
          targetUserId = session.user.id
          console.log('Using session user:', session.user.id, session.user.email)
        }
      }
    } else {
      console.log('Using userId from client request:', targetUserId)
    }
    
    if (!targetUserId) {
      console.error('No user ID available. Auth error:', authError?.message)
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: 'User ID is required. Please log in and try again.' 
      }, { status: 401 })
    }

    console.log('Creating circle for user:', targetUserId)

    // Try using the database function first (bypasses RLS)
    let circleId: string | null = null
    let functionError: any = null
    
    try {
      const rpcResult = await supabase.rpc('create_family_circle', {
        circle_name: name.trim(),
        circle_description: description?.trim() || null,
        circle_color: color || '#3B82F6'
      })
      
      circleId = rpcResult.data
      functionError = rpcResult.error
      
      if (functionError) {
        console.error('RPC function error:', functionError)
        console.error('Function error details:', JSON.stringify(functionError, null, 2))
      }
    } catch (err) {
      console.error('RPC call exception:', err)
      functionError = err
    }

    if (!functionError && circleId) {
      console.log('Circle created via function, ID:', circleId)
      // Fetch the created circle
      const { data: circle, error: fetchError } = await supabase
        .from('family_circles')
        .select('*')
        .eq('id', circleId)
        .single()

      if (fetchError || !circle) {
        console.error('Error fetching created circle:', fetchError)
        return NextResponse.json(
          { error: 'Circle created but failed to fetch details', details: fetchError?.message },
          { status: 500 }
        )
      }

      // Get the member record
      const { data: member } = await supabase
        .from('circle_members')
        .select('*')
        .eq('circle_id', circle.id)
        .eq('user_id', targetUserId)
        .single()

      return NextResponse.json({
        success: true,
        circle: {
          ...circle,
          members: member ? [member] : []
        },
        message: 'Circle created successfully!'
      })
    }

    // Fallback: Try with admin client if available
    const adminClient = createAdminClient()
    if (adminClient) {
      console.log('Trying with admin client as fallback')
      try {
        const { data: adminCircleId, error: adminError } = await adminClient.rpc('create_family_circle', {
          circle_name: name.trim(),
          circle_description: description?.trim() || null,
          circle_color: color || '#3B82F6'
        })
        
        if (!adminError && adminCircleId) {
          // Fetch with regular client (for RLS)
          const { data: circle } = await supabase
            .from('family_circles')
            .select('*')
            .eq('id', adminCircleId)
            .single()
            
          if (circle) {
            const { data: member } = await supabase
              .from('circle_members')
              .select('*')
              .eq('circle_id', circle.id)
              .eq('user_id', targetUserId)
              .single()
              
            return NextResponse.json({
              success: true,
              circle: {
                ...circle,
                members: member ? [member] : []
              },
              message: 'Circle created successfully!'
            })
          }
        }
      } catch (adminErr) {
        console.error('Admin client error:', adminErr)
      }
    }

    // Final fallback: Try direct insert with admin client if available
    if (adminClient) {
      console.log('Trying direct insert with admin client')
      const { data: adminCircle, error: adminInsertError } = await adminClient
        .from('family_circles')
          .insert({
            name: name.trim(),
            description: description?.trim() || null,
            created_by: targetUserId,
            color: color || '#3B82F6'
          })
        .select()
        .single()

      if (!adminInsertError && adminCircle) {
        // Add creator as admin member
        await adminClient
          .from('circle_members')
          .insert({
            circle_id: adminCircle.id,
            user_id: targetUserId,
            role: 'admin',
            location_sharing_enabled: true
          })
          .select()
          .single()

        // Fetch with regular client for RLS
        const { data: circle } = await supabase
          .from('family_circles')
          .select('*')
          .eq('id', adminCircle.id)
          .single()

        if (circle) {
          const { data: member } = await supabase
            .from('circle_members')
            .select('*')
            .eq('circle_id', circle.id)
            .eq('user_id', targetUserId)
            .single()

          return NextResponse.json({
            success: true,
            circle: {
              ...circle,
              members: member ? [member] : []
            },
            message: 'Circle created successfully!'
          })
        }
      }
    }

    // Last resort: Try direct insert with regular client
    console.log('Trying direct insert with regular client. Previous errors:', functionError?.message)
    const { data: circle, error: circleError } = await supabase
      .from('family_circles')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_by: targetUserId,
        color: color || '#3B82F6'
      })
      .select()
      .single()

    if (circleError) {
      console.error('Error creating circle:', circleError)
      console.error('Circle error details:', JSON.stringify(circleError, null, 2))
      return NextResponse.json(
        { 
          error: 'Failed to create circle',
          details: circleError.message,
          code: circleError.code,
          hint: circleError.hint,
          functionError: functionError?.message
        },
        { status: 500 }
      )
    }

    // The trigger will automatically add the creator as admin member
    // But let's verify it was created
    const { data: member } = await supabase
      .from('circle_members')
      .select('*')
      .eq('circle_id', circle.id)
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      circle: {
        ...circle,
        members: member ? [member] : []
      },
      message: 'Circle created successfully!'
    })
  } catch (error) {
    console.error('Create circle error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update a circle
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { circleId, name, description, color } = body

    if (!circleId) {
      return NextResponse.json(
        { error: 'Circle ID is required' },
        { status: 400 }
      )
    }

    // Check if user is admin of this circle
    const { data: membership } = await supabase
      .from('circle_members')
      .select('role')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!membership || (membership.role !== 'admin' && user.id !== (await supabase.from('family_circles').select('created_by').eq('id', circleId).single()).data?.created_by)) {
      return NextResponse.json(
        { error: 'You do not have permission to update this circle' },
        { status: 403 }
      )
    }

    // Update the circle
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (color !== undefined) updateData.color = color

    const { data: circle, error: circleError } = await supabase
      .from('family_circles')
      .update(updateData)
      .eq('id', circleId)
      .select()
      .single()

    if (circleError) {
      console.error('Error updating circle:', circleError)
      return NextResponse.json(
        { error: 'Failed to update circle' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      circle,
      message: 'Circle updated successfully!'
    })
  } catch (error) {
    console.error('Update circle error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a circle
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const circleId = searchParams.get('circleId')

    if (!circleId) {
      return NextResponse.json(
        { error: 'Circle ID is required' },
        { status: 400 }
      )
    }

    // Check if user created this circle
    const { data: circle } = await supabase
      .from('family_circles')
      .select('created_by')
      .eq('id', circleId)
      .single()

    if (!circle || circle.created_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete circles you created' },
        { status: 403 }
      )
    }

    // Soft delete by setting is_active to false
    const { error: deleteError } = await supabase
      .from('family_circles')
      .update({ is_active: false })
      .eq('id', circleId)

    if (deleteError) {
      console.error('Error deleting circle:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete circle' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Circle deleted successfully!'
    })
  } catch (error) {
    console.error('Delete circle error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

