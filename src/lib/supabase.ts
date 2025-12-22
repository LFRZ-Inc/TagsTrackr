import { createClient } from '@supabase/supabase-js'
// Temporarily commenting out custom types to test
// import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Validate configuration (only log warning, don't block)
if (typeof window !== 'undefined' && (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-anon-key')) {
  console.error('⚠️ Supabase is not configured! Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file')
  console.error('Current URL:', supabaseUrl)
  console.error('Has Key:', !!supabaseAnonKey && supabaseAnonKey !== 'placeholder-anon-key')
}

// Create a single instance to avoid multiple client warnings
const supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

export const supabase = supabaseInstance

export function createSupabaseClient() {
  return supabaseInstance
} 