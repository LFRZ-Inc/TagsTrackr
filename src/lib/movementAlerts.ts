'use client'

import { supabase } from './supabase'

interface MovementAlert {
  id: string
  device_id: string
  alert_type: 'movement' | 'geofence_exit' | 'geofence_enter' | 'theft_protection'
  threshold_distance?: number // in meters
  time_window?: number // in minutes
  is_active: boolean
  created_at: string
}

interface LocationPoint {
  latitude: number
  longitude: number
  timestamp: string
  accuracy?: number
}

interface AlertTrigger {
  device_id: string
  alert_type: string
  message: string
  location: LocationPoint
  metadata?: any
}

class MovementAlertService {
  private alertCheckInterval: NodeJS.Timeout | null = null
  private lastKnownLocations: Map<string, LocationPoint> = new Map()
  private isMonitoring = false

  async startMonitoring(userId: string): Promise<boolean> {
    if (this.isMonitoring) {
      console.log('Movement monitoring already active')
      return true
    }

    try {
      // Check if user is premium
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('is_premium')
        .eq('id', userId)
        .single()

      if (userError || !user?.is_premium) {
        console.log('Movement alerts are only available for premium users')
        return false
      }

      this.isMonitoring = true
      
      // Load initial device locations
      await this.loadInitialLocations(userId)

      // Start monitoring interval (check every 2 minutes)
      this.alertCheckInterval = setInterval(() => {
        this.checkForAlerts(userId)
      }, 120000) // 2 minutes

      console.log('Movement monitoring started for premium user')
      return true
    } catch (error) {
      console.error('Failed to start movement monitoring:', error)
      return false
    }
  }

  stopMonitoring(): void {
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval)
      this.alertCheckInterval = null
    }
    
    this.isMonitoring = false
    this.lastKnownLocations.clear()
    console.log('Movement monitoring stopped')
  }

  private async loadInitialLocations(userId: string): Promise<void> {
    try {
      // Load GPS tag locations
      const { data: tags } = await supabase
        .from('tags')
        .select(`
          id,
          last_location,
          last_seen_at
        `)
        .eq('user_id', userId)
        .not('last_location', 'is', null)

      if (tags) {
        tags.forEach(tag => {
          if (tag.last_location && tag.last_seen_at) {
            const location = tag.last_location as any
            this.lastKnownLocations.set(tag.id, {
              latitude: location.coordinates[1],
              longitude: location.coordinates[0],
              timestamp: tag.last_seen_at
            })
          }
        })
      }
    } catch (error) {
      console.error('Failed to load initial locations:', error)
    }
  }

  private async checkForAlerts(userId: string): Promise<void> {
    try {
      // Get active movement alerts for user
      const { data: alerts } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('alert_type', 'movement')
        .eq('is_active', true)

      if (!alerts || alerts.length === 0) {
        return
      }

      console.log('Checking for movement alerts...')
    } catch (error) {
      console.error('Error checking for alerts:', error)
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c
  }

  async getActiveAlerts(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('triggered_at', { ascending: false })

      return data || []
    } catch (error) {
      console.error('Failed to get active alerts:', error)
      return []
    }
  }
}

export default MovementAlertService

// Singleton instance
export const movementAlertService = new MovementAlertService()
 