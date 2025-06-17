export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          tag_id: string
          user_id: string | null
          is_active: boolean
          battery_level: number | null
          last_ping: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tag_id: string
          user_id?: string | null
          is_active?: boolean
          battery_level?: number | null
          last_ping?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tag_id?: string
          user_id?: string | null
          is_active?: boolean
          battery_level?: number | null
          last_ping?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      gps_pings: {
        Row: {
          id: string
          tag_id: string
          latitude: number
          longitude: number
          accuracy: number | null
          battery_level: number | null
          signal_strength: number | null
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          tag_id: string
          latitude: number
          longitude: number
          accuracy?: number | null
          battery_level?: number | null
          signal_strength?: number | null
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          tag_id?: string
          latitude?: number
          longitude?: number
          accuracy?: number | null
          battery_level?: number | null
          signal_strength?: number | null
          timestamp?: string
          created_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          user_id: string
          tag_id: string
          report_type: 'missing' | 'damaged' | 'delayed'
          description: string | null
          status: 'open' | 'investigating' | 'resolved'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tag_id: string
          report_type: 'missing' | 'damaged' | 'delayed'
          description?: string | null
          status?: 'open' | 'investigating' | 'resolved'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tag_id?: string
          report_type?: 'missing' | 'damaged' | 'delayed'
          description?: string | null
          status?: 'open' | 'investigating' | 'resolved'
          created_at?: string
          updated_at?: string
        }
      }
      partners: {
        Row: {
          id: string
          name: string
          partner_type: 'airline' | 'logistics'
          api_key: string
          is_active: boolean
          contact_email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          partner_type: 'airline' | 'logistics'
          api_key: string
          is_active?: boolean
          contact_email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          partner_type?: 'airline' | 'logistics'
          api_key?: string
          is_active?: boolean
          contact_email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pings_log: {
        Row: {
          id: string
          tag_id: string
          partner_id: string | null
          latitude: number
          longitude: number
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          tag_id: string
          partner_id?: string | null
          latitude: number
          longitude: number
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          tag_id?: string
          partner_id?: string | null
          latitude?: number
          longitude?: number
          metadata?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 