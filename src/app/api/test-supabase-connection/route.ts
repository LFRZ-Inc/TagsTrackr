import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    return NextResponse.json({
      configured: !!(supabaseUrl && supabaseKey),
      url: supabaseUrl || 'NOT SET',
      hasKey: !!supabaseKey && supabaseKey !== 'placeholder-anon-key',
      keyLength: supabaseKey?.length || 0,
      urlMatches: supabaseUrl?.includes('bqrigkmpppkfyhnfckeu') || false
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      configured: false
    }, { status: 500 })
  }
}

