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
    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization')
    const cookieHeader = request.headers.get('cookie')
    
    console.log('🔍 [API] GET circles - Auth header present:', !!authHeader, 'Cookie present:', !!cookieHeader)
    
    // Create supabase client
    const supabase = createSupabaseClient()
    
    let targetUserId: string | null = null
    
    // If we have an auth token, use it directly
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { createClient } = require('@supabase/supabase-js')
      const tempClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: { user }, error: authError } = await tempClient.auth.getUser(token)
      
      if (!authError && user) {
        targetUserId = user.id
        console.log('✅ [API] GET circles - User from token:', targetUserId)
        
        // Set session on main client for RLS
        await supabase.auth.setSession({
          access_token: token,
          refresh_token: ''
        }).catch(() => {
          // Ignore session set errors
        })
      }
    }
    
    // If token didn't work, try getUser (works with cookies)
    if (!targetUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      targetUserId = user?.id || null
      
      if (!targetUserId) {
        // Try session as last resort
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
    }
    
    console.log('✅ [API] GET circles for user:', targetUserId)

    // Get all circles the user belongs to
    // Use admin client to bypass RLS for the initial query (avoids infinite recursion)
    const adminClient = createAdminClient()
    if (!adminClient) {
      console.error('❌ [API] Admin client not available')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // First, get circle IDs where user is a member (using admin client to avoid RLS recursion)
    const { data: memberCircles, error: memberError } = await adminClient
      .from('circle_members')
      .select('circle_id')
      .eq('user_id', targetUserId)
      .eq('is_active', true)

    if (memberError) {
      console.error('Error fetching member circles:', memberError)
      return NextResponse.json(
        { error: 'Failed to fetch circles' },
        { status: 500 }
      )
    }

    if (!memberCircles || memberCircles.length === 0) {
      return NextResponse.json({ circles: [] })
    }

    const circleIds = memberCircles.map((m: { circle_id: string }) => m.circle_id)

    // Now fetch the circles with their members using admin client (avoids RLS recursion)
    const { data: circles, error: circlesError } = await adminClient
      .from('family_circles')
      .select(`
        *,
        circle_members(
          user_id,
          role,
          location_sharing_enabled,
          is_active,
          joined_at
        )
      `)
      .in('id', circleIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (circlesError) {
      console.error('Error fetching circles:', circlesError)
      return NextResponse.json(
        { error: 'Failed to fetch circles' },
        { status: 500 }
      )
    }

    // Transform the data to include user info for each member
    // Use admin client for user lookup too (avoids any RLS issues)
    const circlesWithMembers = await Promise.all(
      (circles || []).map(async (circle: any) => {
        // Get user info for each member from public.users table
        const memberUserIds = (circle.circle_members || [])
          .filter((m: any) => m.is_active)
          .map((m: any) => m.user_id)
        
        let membersWithUsers = circle.circle_members || []
        
        if (memberUserIds.length > 0) {
          // Use admin client to avoid RLS issues
          const { data: users } = await adminClient
            .from('users')
            .select('id, email, full_name')
            .in('id', memberUserIds)

          membersWithUsers = (circle.circle_members || []).map((member: any) => {
            const user = users?.find((u: any) => u.id === member.user_id)
            return {
              ...member,
              user: user ? { email: user.email, full_name: user.full_name } : null
            }
          })
        }

        return {
          ...circle,
          members: membersWithUsers.filter((m: any) => m.is_active)
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

// DELETE - Delete a circle (only creator or admin can delete)
export async function DELETE(request: NextRequest) {
  try {
    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization')
    
    // Create supabase client
    const supabase = createSupabaseClient()
    
    let targetUserId: string | null = null
    
    // If we have an auth token, use it directly
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { createClient } = require('@supabase/supabase-js')
      const tempClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: { user }, error: authError } = await tempClient.auth.getUser(token)
      
      if (!authError && user) {
        targetUserId = user.id
        // Set session on main client for RLS
        await supabase.auth.setSession({
          access_token: token,
          refresh_token: ''
        }).catch(() => {})
      }
    }
    
    // If token didn't work, try getUser (works with cookies)
    if (!targetUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      targetUserId = user?.id || null
      
      if (!targetUserId) {
        const { data: { session } } = await supabase.auth.getSession()
        targetUserId = session?.user?.id || null
      }
    }

    if (!targetUserId) {
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

    // Use admin client to check circle and membership (avoids RLS recursion)
    const adminClient = createAdminClient()
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Check if user is the creator or an admin
    const { data: circle, error: circleError } = await adminClient
      .from('family_circles')
      .select('created_by')
      .eq('id', circleId)
      .eq('is_active', true)
      .single()

    if (circleError || !circle) {
      return NextResponse.json({ error: 'Circle not found' }, { status: 404 })
    }

    // Check if user is creator
    const isCreator = circle.created_by === targetUserId

    // Check if user is admin member
    let isAdmin = false
    if (!isCreator) {
      const { data: membership } = await adminClient
        .from('circle_members')
        .select('role')
        .eq('circle_id', circleId)
        .eq('user_id', targetUserId)
        .eq('is_active', true)
        .single()

      isAdmin = membership?.role === 'admin'
    }

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ 
        error: 'Only the circle creator or admins can delete the circle' 
      }, { status: 403 })
    }

    // Soft delete the circle using admin client
    const { error: deleteError } = await adminClient
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

    // Also soft delete all members
    const { error: membersError } = await adminClient
      .from('circle_members')
      .update({ is_active: false })
      .eq('circle_id', circleId)

    if (membersError) {
      console.error('Error deleting circle members:', membersError)
      // Don't fail the request, members will be cleaned up later
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

