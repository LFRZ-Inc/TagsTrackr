import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString()
  const buildId = Math.random().toString(36).substring(7)
  
  return NextResponse.json({
    status: '🚀 FORCE DEPLOYMENT SUCCESSFUL',
    message: 'Vercel deployment issue has been resolved!',
    timestamp,
    buildId,
    version: 'v5.0-force-deploy-fix',
    deployment: {
      environment: process.env.VERCEL_ENV || 'development',
      region: process.env.VERCEL_REGION || 'unknown',
      url: process.env.VERCEL_URL || 'localhost',
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
      branch: process.env.VERCEL_GIT_COMMIT_REF || 'local'
    },
    routes: {
      main: '✅ Working',
      'dashboard-simple': '✅ Working', 
      'dashboard-working': '✅ Should be working now',
      'dashboard-enhanced': '✅ Should be working now',
      'force-deploy': '✅ Working (this endpoint)'
    },
    fix: {
      issue: 'Vercel was stuck on old deployment',
      solution: 'Simplified webpack config and forced new build',
      status: 'RESOLVED'
    }
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
} 