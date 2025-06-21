import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, adId, pageContext, isClick = false } = await request.json()
    
    if (!userId || !adId || !pageContext) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get user IP and user agent for tracking
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    if (isClick) {
      // Just track the click
      const { error } = await supabase
        .from('ad_views')
        .insert({
          user_id: userId,
          ad_id: adId,
          page_context: pageContext,
          is_click: true,
          ip_address: ip,
          user_agent: userAgent,
          session_id: sessionId
        })

      if (error) throw error

      // Update click count on ad
      const { data: currentAd } = await supabase
        .from('ads')
        .select('click_count')
        .eq('id', adId)
        .single()
      
      if (currentAd) {
        await supabase
          .from('ads')
          .update({ click_count: (currentAd.click_count || 0) + 1 })
          .eq('id', adId)
      }

      return NextResponse.json({ success: true, type: 'click' })
    } else {
      // Process ad view with potential credit earning
      const { data, error } = await supabase.rpc('process_ad_view', {
        p_user_id: userId,
        p_ad_id: adId,
        p_page_context: pageContext,
        p_ip_address: ip,
        p_user_agent: userAgent,
        p_session_id: sessionId
      })

      if (error) throw error

      return NextResponse.json({
        success: true,
        type: 'view',
        ...data
      })
    }
  } catch (error) {
    console.error('Error tracking ad:', error)
    return NextResponse.json(
      { error: 'Failed to track ad interaction' },
      { status: 500 }
    )
  }
} 