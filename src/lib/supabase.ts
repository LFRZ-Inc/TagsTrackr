import { createClient } from '@supabase/supabase-js'
// Temporarily commenting out custom types to test
// import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
} 