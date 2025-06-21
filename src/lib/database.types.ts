export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ad_credits: {
        Row: {
          created_at: string | null
          credit_balance: number | null
          daily_views_count: number | null
          last_redeemed: string | null
          last_view_date: string | null
          total_earned: number | null
          total_redeemed: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credit_balance?: number | null
          daily_views_count?: number | null
          last_redeemed?: string | null
          last_view_date?: string | null
          total_earned?: number | null
          total_redeemed?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credit_balance?: number | null
          daily_views_count?: number | null
          last_redeemed?: string | null
          last_view_date?: string | null
          total_earned?: number | null
          total_redeemed?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_redemptions: {
        Row: {
          amount: number
          created_at: string | null
          credit_amount: number
          description: string | null
          id: string
          metadata: Json | null
          processed_at: string | null
          redemption_type: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          credit_amount: number
          description?: string | null
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          redemption_type: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          credit_amount?: number
          description?: string | null
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          redemption_type?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_views: {
        Row: {
          ad_id: string | null
          id: string
          ip_address: unknown | null
          is_click: boolean | null
          page_context: string
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          ad_id?: string | null
          id?: string
          ip_address?: unknown | null
          is_click?: boolean | null
          page_context: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          ad_id?: string | null
          id?: string
          ip_address?: unknown | null
          is_click?: boolean | null
          page_context?: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_views_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          body: string
          click_count: number | null
          created_at: string | null
          current_daily_views: number | null
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string
          max_daily_views: number | null
          metadata: Json | null
          page_context: string
          priority: number | null
          start_date: string | null
          title: string
          total_views: number | null
          updated_at: string | null
        }
        Insert: {
          body: string
          click_count?: number | null
          created_at?: string | null
          current_daily_views?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url: string
          max_daily_views?: number | null
          metadata?: Json | null
          page_context: string
          priority?: number | null
          start_date?: string | null
          title: string
          total_views?: number | null
          updated_at?: string | null
        }
        Update: {
          body?: string
          click_count?: number | null
          created_at?: string | null
          current_daily_views?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string
          max_daily_views?: number | null
          metadata?: Json | null
          page_context?: string
          priority?: number | null
          start_date?: string | null
          title?: string
          total_views?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          alert_type: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          resolved_at: string | null
          tag_id: string | null
          triggered_at: string | null
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          alert_type: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          resolved_at?: string | null
          tag_id?: string | null
          triggered_at?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          alert_type?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          resolved_at?: string | null
          tag_id?: string | null
          triggered_at?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_locations: {
        Row: {
          accuracy: number | null
          altitude: number | null
          created_at: string | null
          device_id: string | null
          heading: number | null
          id: string
          latitude: number
          longitude: number
          recorded_at: string
          speed: number | null
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          created_at?: string | null
          device_id?: string | null
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          recorded_at: string
          speed?: number | null
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          created_at?: string | null
          device_id?: string | null
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "device_locations_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          adhesive: boolean | null
          battery_level: number | null
          created_at: string | null
          data_remaining_mb: number | null
          firmware_version: string | null
          id: string
          is_active: boolean | null
          is_rented: boolean | null
          last_ping_at: string | null
          owner_id: string | null
          registered_at: string | null
          tag_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          adhesive?: boolean | null
          battery_level?: number | null
          created_at?: string | null
          data_remaining_mb?: number | null
          firmware_version?: string | null
          id?: string
          is_active?: boolean | null
          is_rented?: boolean | null
          last_ping_at?: string | null
          owner_id?: string | null
          registered_at?: string | null
          tag_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          adhesive?: boolean | null
          battery_level?: number | null
          created_at?: string | null
          data_remaining_mb?: number | null
          firmware_version?: string | null
          id?: string
          is_active?: boolean | null
          is_rented?: boolean | null
          last_ping_at?: string | null
          owner_id?: string | null
          registered_at?: string | null
          tag_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      found_reports: {
        Row: {
          finder_contact: string
          finder_name: string | null
          found_at: string | null
          found_location_lat: number | null
          found_location_lng: number | null
          id: string
          notes: string | null
          owner_notified: boolean | null
          reward_amount: number | null
          reward_claimed: boolean | null
          status: string | null
          tag_id: string | null
        }
        Insert: {
          finder_contact: string
          finder_name?: string | null
          found_at?: string | null
          found_location_lat?: number | null
          found_location_lng?: number | null
          id?: string
          notes?: string | null
          owner_notified?: boolean | null
          reward_amount?: number | null
          reward_claimed?: boolean | null
          status?: string | null
          tag_id?: string | null
        }
        Update: {
          finder_contact?: string
          finder_name?: string | null
          found_at?: string | null
          found_location_lat?: number | null
          found_location_lng?: number | null
          id?: string
          notes?: string | null
          owner_notified?: boolean | null
          reward_amount?: number | null
          reward_claimed?: boolean | null
          status?: string | null
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "found_reports_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      geofence_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          geofence_id: string | null
          id: string
          is_acknowledged: boolean | null
          location: unknown
          tag_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          geofence_id?: string | null
          id?: string
          is_acknowledged?: boolean | null
          location: unknown
          tag_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          geofence_id?: string | null
          id?: string
          is_acknowledged?: boolean | null
          location?: unknown
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geofence_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_alerts_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_alerts_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "active_tags_with_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_alerts_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      geofences: {
        Row: {
          created_at: string | null
          description: string | null
          geometry: unknown
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          geometry: unknown
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          geometry?: unknown
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gps_pings: {
        Row: {
          accuracy: number | null
          altitude: number | null
          battery_level: number | null
          created_at: string | null
          heading: number | null
          id: string
          is_manual: boolean | null
          latitude: number
          longitude: number
          raw_data: Json | null
          signal_strength: number | null
          speed: number | null
          tag_id: string | null
          temperature: number | null
          timestamp: string | null
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          battery_level?: number | null
          created_at?: string | null
          heading?: number | null
          id?: string
          is_manual?: boolean | null
          latitude: number
          longitude: number
          raw_data?: Json | null
          signal_strength?: number | null
          speed?: number | null
          tag_id?: string | null
          temperature?: number | null
          timestamp?: string | null
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          battery_level?: number | null
          created_at?: string | null
          heading?: number | null
          id?: string
          is_manual?: boolean | null
          latitude?: number
          longitude?: number
          raw_data?: Json | null
          signal_strength?: number | null
          speed?: number | null
          tag_id?: string | null
          temperature?: number | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gps_pings_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "active_tags_with_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_pings_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          tag_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          tag_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          tag_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "active_tags_with_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          api_key: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          type: Database["public"]["Enums"]["partner_type"]
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: Database["public"]["Enums"]["partner_type"]
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["partner_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      pings_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          ping_data: Json
          processed_at: string | null
          processing_status: string | null
          tag_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          ping_data: Json
          processed_at?: string | null
          processing_status?: string | null
          tag_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          ping_data?: Json
          processed_at?: string | null
          processing_status?: string | null
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pings_log_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "active_tags_with_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pings_log_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_history: {
        Row: {
          condition_notes: string | null
          device_id: string | null
          id: string
          refund_amount: number | null
          refund_processed: boolean | null
          rented_at: string | null
          return_approved: boolean | null
          returned_at: string | null
          shipping_address: Json | null
          tracking_number: string | null
          user_id: string | null
        }
        Insert: {
          condition_notes?: string | null
          device_id?: string | null
          id?: string
          refund_amount?: number | null
          refund_processed?: boolean | null
          rented_at?: string | null
          return_approved?: boolean | null
          returned_at?: string | null
          shipping_address?: Json | null
          tracking_number?: string | null
          user_id?: string | null
        }
        Update: {
          condition_notes?: string | null
          device_id?: string | null
          id?: string
          refund_amount?: number | null
          refund_processed?: boolean | null
          rented_at?: string | null
          return_approved?: boolean | null
          returned_at?: string | null
          shipping_address?: Json | null
          tracking_number?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_history_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          contact_info: Json | null
          created_at: string | null
          description: string
          id: string
          is_verified: boolean | null
          location: unknown | null
          location_description: string | null
          reporter_user_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          reward_amount: number | null
          status: string | null
          tag_id: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          contact_info?: Json | null
          created_at?: string | null
          description: string
          id?: string
          is_verified?: boolean | null
          location?: unknown | null
          location_description?: string | null
          reporter_user_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          reward_amount?: number | null
          status?: string | null
          tag_id?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          contact_info?: Json | null
          created_at?: string | null
          description?: string
          id?: string
          is_verified?: boolean | null
          location?: unknown | null
          location_description?: string | null
          reporter_user_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          reward_amount?: number | null
          status?: string | null
          tag_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "active_tags_with_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      subscription_devices: {
        Row: {
          allocated_at: string | null
          device_id: string | null
          id: string
          subscription_id: string | null
        }
        Insert: {
          allocated_at?: string | null
          device_id?: string | null
          id?: string
          subscription_id?: string | null
        }
        Update: {
          allocated_at?: string | null
          device_id?: string | null
          id?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_devices_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_devices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string | null
          devices_covered: number
          id: string
          is_active: boolean | null
          plan_type: string
          price_monthly: number
          renewal_date: string
          stripe_subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string | null
          devices_covered?: number
          id?: string
          is_active?: boolean | null
          plan_type: string
          price_monthly?: number
          renewal_date: string
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          canceled_at?: string | null
          created_at?: string | null
          devices_covered?: number
          id?: string
          is_active?: boolean | null
          plan_type?: string
          price_monthly?: number
          renewal_date?: string
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tag_shares: {
        Row: {
          expires_at: string | null
          id: string
          is_active: boolean | null
          owner_id: string | null
          permissions: string
          shared_at: string | null
          shared_with_user_id: string | null
          tag_id: string | null
        }
        Insert: {
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          owner_id?: string | null
          permissions: string
          shared_at?: string | null
          shared_with_user_id?: string | null
          tag_id?: string | null
        }
        Update: {
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          owner_id?: string | null
          permissions?: string
          shared_at?: string | null
          shared_with_user_id?: string | null
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tag_shares_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          battery_level: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_location: unknown | null
          last_seen_at: string | null
          metadata: Json | null
          name: string
          partner_id: string | null
          qr_code_url: string | null
          status: Database["public"]["Enums"]["tag_status"] | null
          tag_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          battery_level?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_location?: unknown | null
          last_seen_at?: string | null
          metadata?: Json | null
          name: string
          partner_id?: string | null
          qr_code_url?: string | null
          status?: Database["public"]["Enums"]["tag_status"] | null
          tag_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          battery_level?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_location?: unknown | null
          last_seen_at?: string | null
          metadata?: Json | null
          name?: string
          partner_id?: string | null
          qr_code_url?: string | null
          status?: Database["public"]["Enums"]["tag_status"] | null
          tag_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          current_devices: number | null
          device_limit: number | null
          email: string
          full_name: string | null
          id: string
          is_premium: boolean | null
          owned_tags: number | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_devices?: number | null
          device_limit?: number | null
          email: string
          full_name?: string | null
          id: string
          is_premium?: boolean | null
          owned_tags?: number | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_devices?: number | null
          device_limit?: number | null
          email?: string
          full_name?: string | null
          id?: string
          is_premium?: boolean | null
          owned_tags?: number | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      active_tags_with_location: {
        Row: {
          battery_level: number | null
          description: string | null
          id: string | null
          last_seen_at: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          owner_email: string | null
          owner_name: string | null
          partner_name: string | null
          status: Database["public"]["Enums"]["tag_status"] | null
          tag_id: string | null
        }
        Relationships: []
      }
      admin_device_inventory: {
        Row: {
          battery_level: number | null
          created_at: string | null
          data_remaining_mb: number | null
          is_active: boolean | null
          is_rented: boolean | null
          last_ping_at: string | null
          owner_email: string | null
          owner_id: string | null
          tag_id: string | null
          type: string | null
        }
        Relationships: []
      }
      admin_rental_overview: {
        Row: {
          data_remaining_mb: number | null
          id: string | null
          refund_amount: number | null
          refund_processed: boolean | null
          rented_at: string | null
          renter_email: string | null
          return_approved: boolean | null
          returned_at: string | null
          tag_id: string | null
        }
        Relationships: []
      }
      admin_subscription_analytics: {
        Row: {
          active_subscriptions: number | null
          avg_devices_per_sub: number | null
          monthly_revenue: number | null
          plan_type: string | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown | null
          f_table_catalog: unknown | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown | null
          f_table_catalog: string | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      open_reports_summary: {
        Row: {
          created_at: string | null
          id: string | null
          owner_name: string | null
          report_latitude: number | null
          report_longitude: number | null
          reward_amount: number | null
          status: string | null
          tag_id: string | null
          tag_name: string | null
          title: string | null
          type: string | null
        }
        Relationships: []
      }
      recent_pings_with_tags: {
        Row: {
          accuracy: number | null
          battery_level: number | null
          id: string | null
          latitude: number | null
          longitude: number | null
          owner_name: string | null
          signal_strength: number | null
          tag_id: string | null
          tag_name: string | null
          timestamp: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      partner_type: "airline" | "shipping" | "hotel" | "government"
      tag_status: "active" | "inactive" | "lost" | "found"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

// Helper type for ad credits
export interface AdCredits {
  user_id: string
  credit_balance: number
  total_earned: number
  total_redeemed: number
  last_redeemed: string | null
  daily_views_count: number
  last_view_date: string
  created_at: string
  updated_at: string
}

// Helper type for devices (the new monetization table)
export interface Device {
  id: string
  tag_id: string
  type: 'standard' | 'returnable'
  adhesive: boolean
  registered_at: string
  owner_id: string | null
  is_rented: boolean
  data_remaining_mb: number
  is_active: boolean
  battery_level: number | null
  last_ping_at: string | null
  firmware_version: string
  created_at: string
  updated_at: string
}

// Helper type for subscriptions
export interface Subscription {
  id: string
  user_id: string
  plan_type: 'basic' | 'family' | 'enterprise'
  devices_covered: number
  is_active: boolean
  created_at: string
  renewal_date: string
  canceled_at: string | null
  stripe_subscription_id: string | null
  price_monthly: number
} 