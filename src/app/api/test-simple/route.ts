import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('🔍 Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlLength: supabaseUrl?.length,
      serviceKeyLength: supabaseServiceKey?.length
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      }, { status: 500 })
    }

    // Test Supabase connection
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Try to query a simple table
    const { data: devices, error } = await supabase
      .from('personal_devices')
      .select('id, name, user_email')
      .limit(1)

    if (error) {
      return NextResponse.json({
        error: 'Database connection failed',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Environment and database connection working',
      deviceCount: devices?.length || 0,
      sampleDevice: devices?.[0] || null
    })

  } catch (err) {
    console.error('Test endpoint error:', err)
    return NextResponse.json({
      error: 'Test failed',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
} 