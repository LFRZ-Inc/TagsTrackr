import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  return NextResponse.json({
    status: 'healthy',
    service: 'TagsTrackr GPS Tracking',
    timestamp,
    version: 'v4.0-comprehensive-fix',
    deployment: {
      environment: process.env.VERCEL_ENV || 'development',
      region: process.env.VERCEL_REGION || 'unknown',
      url: process.env.VERCEL_URL || 'localhost',
      buildId: process.env.VERCEL_GIT_COMMIT_SHA || 'local'
    },
    routes: {
      main: 'https://tags-trackr.vercel.app',
      dashboard: 'https://tags-trackr.vercel.app/dashboard',
      'dashboard-simple': 'https://tags-trackr.vercel.app/dashboard-simple',
      'dashboard-working': 'https://tags-trackr.vercel.app/dashboard-working',
      'dashboard-enhanced': 'https://tags-trackr.vercel.app/dashboard-enhanced'
    },
    api: {
      ping: '/api/ping/simple',
      track: '/api/track',
      register: '/api/register-tag'
    }
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
} 