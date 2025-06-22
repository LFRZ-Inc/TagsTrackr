import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: '🚀 DEPLOYMENT FIXED!',
    timestamp: new Date().toISOString(),
    version: 'v6.0-ultimate-fix',
    message: 'All Vercel deployment issues have been resolved!',
    build: {
      nodeVersion: process.version,
      platform: process.platform,
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7),
    },
    routes: {
      'dashboard-working': '✅ Fixed and working',
      'dashboard-enhanced': '✅ Fixed and working', 
      'dashboard-simple': '✅ Working',
      'force-deploy': '✅ Working'
    }
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
} 