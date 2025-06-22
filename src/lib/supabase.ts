import { createClient } from '@supabase/supabase-js'
// Temporarily commenting out custom types to test
// import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Create a single instance to avoid multiple client warnings
const supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)

export const supabase = supabaseInstance

export function createSupabaseClient() {
  return supabaseInstance
} 