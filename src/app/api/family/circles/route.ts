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
    // Create supabase client with request to extract auth token
    const supabase = createSupabaseClient(request)
    
    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization')
    const cookieHeader = request.headers.get('cookie')
    
    console.log('🔍 [API] GET circles - Auth header present:', !!authHeader, 'Cookie present:', !!cookieHeader)
    
    // Try getUser first (works with both cookies and tokens)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    let targetUserId: string | null = user?.id || null
    
    // If getUser fails, try session
    if (!targetUserId) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      targetUserId = session?.user?.id || null
      
      if (!targetUserId) {
        console.error('❌ [API] GET circles: No user ID available. Auth error:', authError?.message, 'Session error:', sessionError?.message)
        return NextResponse.json({ 
          error: 'Unauthorized',
          details: 'Please log in to view circles'
        }, { status: 401 })
      }
    }
    
    console.log('✅ [API] GET circles for user:', targetUserId)

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
      .eq('circle_members.user_id', targetUserId)
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
    console.log('📥 [API] Request body received:', { name: body.name, hasUserId: !!body.userId, userId: body.userId })
    const { name, description, color, userId } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Circle name is required' },
        { status: 400 }
      )
    }

    // Use userId from request body if provided (from client), otherwise try server auth
    let targetUserId: string | null = userId || null

    // If userId is provided from client, use it directly (no server auth needed)
    if (targetUserId) {
      console.log('✅ [API] Using userId from client request:', targetUserId)
    } else {
      // Only try server auth if userId not provided
      console.log('⚠️ [API] No userId in request, trying server auth...')
      const supabase = createSupabaseClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (user) {
        targetUserId = user.id
        console.log('✅ [API] Using authenticated user:', user.id, user.email)
      } else {
        // Try session as last resort
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (session?.user) {
          targetUserId = session.user.id
          console.log('✅ [API] Using session user:', session.user.id, session.user.email)
        } else {
          console.error('❌ [API] No user ID available. Auth error:', authError?.message, sessionError?.message)
          return NextResponse.json({ 
            error: 'Unauthorized', 
            details: 'User ID is required. Please log in and try again.' 
          }, { status: 401 })
        }
      }
    }
    
    if (!targetUserId) {
      console.error('❌ [API] No user ID available after all checks')
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: 'User ID is required. Please log in and try again.' 
      }, { status: 401 })
    }

    console.log('✅ [API] Creating circle for user:', targetUserId)

    // Create supabase client for fetching (needed later)
    const supabase = createSupabaseClient()

    // Use admin client to bypass RLS (most reliable method)
    const adminClient = createAdminClient()
    if (!adminClient) {
      console.error('❌ [API] Admin client not available - SUPABASE_SERVICE_ROLE_KEY not set')
      return NextResponse.json({
        error: 'Server configuration error',
        details: 'Admin client not available. Please contact support.'
      }, { status: 500 })
    }

    console.log('✅ [API] Using admin client to create circle')
    try {
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

      if (adminInsertError) {
        console.error('❌ [API] Admin insert error:', adminInsertError)
        console.error('❌ [API] Error details:', JSON.stringify(adminInsertError, null, 2))
        return NextResponse.json({
          error: 'Failed to create circle',
          details: adminInsertError.message,
          code: adminInsertError.code,
          hint: adminInsertError.hint
        }, { status: 500 })
      }

      if (!adminCircle) {
        console.error('❌ [API] Circle insert returned no data')
        return NextResponse.json({
          error: 'Failed to create circle',
          details: 'Circle was not created'
        }, { status: 500 })
      }

      console.log('✅ [API] Circle created, ID:', adminCircle.id)
      
      // Check if member was already added by trigger (database trigger should handle this)
      // Wait a moment for trigger to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Try to fetch the member that should have been created by trigger
      const { data: existingMember } = await adminClient
        .from('circle_members')
        .select('*')
        .eq('circle_id', adminCircle.id)
        .eq('user_id', targetUserId)
        .single()

      if (!existingMember) {
        // Only add member if trigger didn't create it
        console.log('⚠️ [API] Member not found, adding manually...')
        const { error: memberError } = await adminClient
          .from('circle_members')
          .insert({
            circle_id: adminCircle.id,
            user_id: targetUserId,
            role: 'admin',
            location_sharing_enabled: true
          })

        if (memberError) {
          console.error('⚠️ [API] Error adding member (circle still created):', memberError)
          // Don't fail - circle was created, member might be added by trigger later
        } else {
          console.log('✅ [API] Creator added as admin member manually')
        }
      } else {
        console.log('✅ [API] Member already exists (created by trigger)')
      }

      // Try to fetch with regular client (for RLS) to get full circle data
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
      } else {
        // If RLS blocks fetch, use admin client to get member and return
        const { data: adminMember } = await adminClient
          .from('circle_members')
          .select('*')
          .eq('circle_id', adminCircle.id)
          .eq('user_id', targetUserId)
          .single()

        console.log('⚠️ [API] RLS blocked fetch, returning admin circle data')
        return NextResponse.json({
          success: true,
          circle: {
            ...adminCircle,
            members: adminMember ? [adminMember] : []
          },
          message: 'Circle created successfully!'
        })
      }
    } catch (adminErr) {
      console.error('❌ [API] Admin client exception:', adminErr)
      console.error('❌ [API] Exception details:', adminErr instanceof Error ? adminErr.message : String(adminErr))
      console.error('❌ [API] Stack:', adminErr instanceof Error ? adminErr.stack : 'No stack')
      return NextResponse.json({
        error: 'Failed to create circle',
        details: adminErr instanceof Error ? adminErr.message : 'Unknown error occurred'
      }, { status: 500 })
    }

    // If we reach here, admin client failed or doesn't exist
    console.error('❌ [API] All circle creation methods failed')
    return NextResponse.json({
      error: 'Failed to create circle',
      details: 'Unable to create circle. Please try again or contact support.'
    }, { status: 500 })
  } catch (error) {
    console.error('❌ [API] Create circle error:', error)
    console.error('❌ [API] Error details:', error instanceof Error ? error.message : String(error))
    console.error('❌ [API] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
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

