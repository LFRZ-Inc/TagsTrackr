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

    console.log('🚀 Starting complete Supabase rebuild...')
    const results = []

    // Step 1: Drop all existing tables
    console.log('📋 Step 1: Dropping existing tables...')
    const dropTables = [
      'DROP TABLE IF EXISTS location_pings CASCADE;',
      'DROP TABLE IF EXISTS personal_devices CASCADE;', 
      'DROP TABLE IF EXISTS users CASCADE;',
      'DROP TABLE IF EXISTS tags CASCADE;',
      'DROP TABLE IF EXISTS tag_pings CASCADE;',
    ]

    for (const sql of dropTables) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
        if (error) {
          console.log('Drop table result:', error.message)
        }
        results.push({ step: 'drop_tables', sql: sql.substring(0, 30) + '...', success: !error })
      } catch (err) {
        results.push({ step: 'drop_tables', sql: sql.substring(0, 30) + '...', error: err })
      }
    }

    // Step 2: Create fresh schema
    console.log('🏗️ Step 2: Creating fresh schema...')
    const createSchema = `
      -- Users table
      CREATE TABLE users (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Tags table (for GPS tags)
      CREATE TABLE tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Personal devices table (for phones, tablets, etc.)
      CREATE TABLE personal_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        device_name TEXT NOT NULL,
        device_type TEXT NOT NULL CHECK (device_type IN ('phone', 'tablet', 'watch', 'laptop', 'gps_tag')),
        hardware_fingerprint TEXT NOT NULL,
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        battery_level INTEGER,
        location_sharing_enabled BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_email, hardware_fingerprint)
      );

      -- Tag pings table (for GPS tag location updates)
      CREATE TABLE tag_pings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        accuracy DECIMAL(10, 2),
        battery_level INTEGER,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Location pings table (for personal device location updates)
      CREATE TABLE location_pings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID NOT NULL REFERENCES personal_devices(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        accuracy DECIMAL(10, 2),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Enable RLS
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
      ALTER TABLE personal_devices ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tag_pings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE location_pings ENABLE ROW LEVEL SECURITY;
    `

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: createSchema })
      if (error) {
        console.error('Schema creation error:', error)
        results.push({ step: 'create_schema', error: error.message })
      } else {
        console.log('✅ Schema created successfully')
        results.push({ step: 'create_schema', success: true })
      }
    } catch (err) {
      console.error('Schema creation exception:', err)
      results.push({ step: 'create_schema', exception: err })
    }

    // Step 3: Create RLS policies
    console.log('🔒 Step 3: Creating RLS policies...')
    const policies = `
      -- Users policies
      CREATE POLICY "Users can read own profile" ON users FOR SELECT USING (auth.uid() = id);
      CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
      CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

      -- Tags policies
      CREATE POLICY "Users can manage own tags" ON tags FOR ALL USING (auth.uid() = user_id);

      -- Personal devices policies
      CREATE POLICY "Users can manage own devices" ON personal_devices FOR ALL USING (auth.uid()::text = user_id);

      -- Tag pings policies
      CREATE POLICY "Users can read own tag pings" ON tag_pings FOR SELECT USING (
        EXISTS (SELECT 1 FROM tags WHERE tags.id = tag_pings.tag_id AND tags.user_id = auth.uid())
      );
      CREATE POLICY "Users can insert own tag pings" ON tag_pings FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM tags WHERE tags.id = tag_pings.tag_id AND tags.user_id = auth.uid())
      );

      -- Location pings policies
      CREATE POLICY "Users can manage own location pings" ON location_pings FOR ALL USING (auth.uid()::text = user_id);
    `

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: policies })
      if (error) {
        console.log('Policies result:', error.message)
        results.push({ step: 'create_policies', error: error.message })
      } else {
        console.log('✅ RLS policies created successfully')
        results.push({ step: 'create_policies', success: true })
      }
    } catch (err) {
      console.log('Policies exception:', err)
      results.push({ step: 'create_policies', exception: err })
    }

    // Step 4: Create indexes for performance
    console.log('⚡ Step 4: Creating indexes...')
    const indexes = `
      CREATE INDEX idx_tags_user_id ON tags(user_id);
      CREATE INDEX idx_personal_devices_user_id ON personal_devices(user_id);
      CREATE INDEX idx_personal_devices_user_email ON personal_devices(user_email);
      CREATE INDEX idx_tag_pings_tag_id ON tag_pings(tag_id);
      CREATE INDEX idx_tag_pings_timestamp ON tag_pings(timestamp);
      CREATE INDEX idx_location_pings_device_id ON location_pings(device_id);
      CREATE INDEX idx_location_pings_user_id ON location_pings(user_id);
      CREATE INDEX idx_location_pings_timestamp ON location_pings(timestamp);
    `

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: indexes })
      if (error) {
        console.log('Indexes result:', error.message)
        results.push({ step: 'create_indexes', error: error.message })
      } else {
        console.log('✅ Indexes created successfully')
        results.push({ step: 'create_indexes', success: true })
      }
    } catch (err) {
      console.log('Indexes exception:', err)
      results.push({ step: 'create_indexes', exception: err })
    }

    console.log('🎉 Supabase rebuild completed!')

    return NextResponse.json({ 
      success: true, 
      message: 'Supabase completely rebuilt with fresh schema!',
      steps_completed: results.length,
      results,
      next_step: 'Now you can sign up fresh with luisdrod750@gmail.com'
    })

  } catch (err) {
    console.error('Rebuild error:', err)
    return NextResponse.json({ 
      error: 'Rebuild failed',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
} 