import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, redemptionType, creditAmount, description } = await request.json()
    
    if (!userId || !redemptionType || !creditAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate redemption type
    const validTypes = ['tag_discount', 'premium_trial', 'cash_out']
    if (!validTypes.includes(redemptionType)) {
      return NextResponse.json(
        { error: 'Invalid redemption type' },
        { status: 400 }
      )
    }

    // Call the redemption function
    const { data, error } = await supabase.rpc('redeem_ad_credits', {
      p_user_id: userId,
      p_redemption_type: redemptionType,
      p_credit_amount: creditAmount,
      p_description: description || null
    })

    if (error) throw error

    if (!data.success) {
      return NextResponse.json(
        { error: data.error || 'Redemption failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      redemptionId: data.redemption_id,
      amount: data.amount,
      remainingBalance: data.remaining_balance
    })
  } catch (error) {
    console.error('Error processing redemption:', error)
    return NextResponse.json(
      { error: 'Failed to process redemption' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Get user's credit balance and redemption history
    const [creditsResult, redemptionsResult] = await Promise.all([
      supabase
        .from('ad_credits')
        .select('*')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('ad_redemptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
    ])

    return NextResponse.json({
      credits: creditsResult.data,
      redemptions: redemptionsResult.data || []
    })
  } catch (error) {
    console.error('Error fetching redemption data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch redemption data' },
      { status: 500 }
    )
  }
} 