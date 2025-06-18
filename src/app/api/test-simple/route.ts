import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
    supabase_key_exists: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? true : false,
    supabase_key_length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    node_env: process.env.NODE_ENV
  })
} 