import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'deployment working',
    timestamp: new Date().toISOString(),
    version: 'v2.0-auth-fixed'
  })
} 