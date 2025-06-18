import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateTagId } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { tag_id, user_id, name, description } = await request.json()

    if (!tag_id || !user_id || !name) {
      return NextResponse.json(
        { error: 'Tag ID, User ID, and name are required' },
        { status: 400 }
      )
    }

    // Check if tag already exists
    const { data: existingTag } = await supabase
      .from('tags')
      .select('*')
      .eq('tag_id', tag_id)
      .single()

    if (existingTag) {
      if (existingTag.user_id) {
        return NextResponse.json(
          { error: 'Tag is already registered to another user' },
          { status: 409 }
        )
      }
      
      // Update existing tag with user_id
      const { data, error } = await supabase
        .from('tags')
        .update({ 
          user_id,
          name,
          description,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('tag_id', tag_id)
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Failed to register tag' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        message: 'Tag registered successfully', 
        tag: data 
      })
    }

    // Create new tag
    const { data, error } = await supabase
      .from('tags')
      .insert({
        tag_id,
        name,
        description,
        user_id,
        is_active: true,
        battery_level: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create tag' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Tag created and registered successfully', 
      tag: data 
    }, { status: 201 })

  } catch (error) {
    console.error('Tag registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 