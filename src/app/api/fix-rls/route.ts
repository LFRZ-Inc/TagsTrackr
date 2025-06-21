import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { adminKey } = await request.json()
    
    if (adminKey !== 'tagstrackr-admin-reset-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    console.log('Fixing RLS policies...')

    // Fix RLS policies to allow user registration
    const policies = [
      // Allow users to insert their own profile
      `
        DROP POLICY IF EXISTS "Users can insert own profile" ON users;
        CREATE POLICY "Users can insert own profile" ON users
        FOR INSERT WITH CHECK (auth.uid() = id);
      `,
      // Allow users to read their own profile
      `
        DROP POLICY IF EXISTS "Users can read own profile" ON users;
        CREATE POLICY "Users can read own profile" ON users
        FOR SELECT USING (auth.uid() = id);
      `,
      // Allow users to update their own profile
      `
        DROP POLICY IF EXISTS "Users can update own profile" ON users;
        CREATE POLICY "Users can update own profile" ON users
        FOR UPDATE USING (auth.uid() = id);
      `,
      // Allow users to insert their own devices
      `
        DROP POLICY IF EXISTS "Users can insert own devices" ON personal_devices;
        CREATE POLICY "Users can insert own devices" ON personal_devices
        FOR INSERT WITH CHECK (auth.uid()::text = user_id);
      `,
      // Allow users to read their own devices
      `
        DROP POLICY IF EXISTS "Users can read own devices" ON personal_devices;
        CREATE POLICY "Users can read own devices" ON personal_devices
        FOR SELECT USING (auth.uid()::text = user_id);
      `,
      // Allow users to insert their own location pings
      `
        DROP POLICY IF EXISTS "Users can insert own pings" ON location_pings;
        CREATE POLICY "Users can insert own pings" ON location_pings
        FOR INSERT WITH CHECK (auth.uid()::text = user_id);
      `,
      // Allow users to read their own location pings
      `
        DROP POLICY IF EXISTS "Users can read own pings" ON location_pings;
        CREATE POLICY "Users can read own pings" ON location_pings
        FOR SELECT USING (auth.uid()::text = user_id);
      `
    ]

    const results = []
    
    for (const policy of policies) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: policy })
        if (error) {
          console.log('Policy error (expected):', error.message)
          results.push({ policy: policy.substring(0, 50) + '...', error: error.message })
        } else {
          results.push({ policy: policy.substring(0, 50) + '...', success: true })
        }
      } catch (err) {
        console.log('Policy exception:', err)
        results.push({ policy: policy.substring(0, 50) + '...', exception: err })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'RLS policies updated',
      results
    })

  } catch (err) {
    console.error('Fix RLS error:', err)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
} 