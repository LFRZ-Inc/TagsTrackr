'use client'

import { supabase } from './supabase'

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: string
  battery_level?: number
}

interface TrackingOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  pingInterval?: number // in milliseconds
}

class LocationTrackingService {
  private watchId: number | null = null
  private pingInterval: NodeJS.Timeout | null = null
  private isTracking = false
  private deviceId: string | null = null
  private lastLocation: LocationData | null = null
  private options: TrackingOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 60000,
    pingInterval: 30000 // 30 seconds
  }

  constructor(options?: Partial<TrackingOptions>) {
    if (options) {
      this.options = { ...this.options, ...options }
    }
  }

  async startTracking(deviceId: string): Promise<boolean> {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser')
      return false
    }

    if (this.isTracking) {
      console.log('Already tracking location')
      return true
    }

    this.deviceId = deviceId
    this.isTracking = true

    try {
      // Get initial position
      await this.getCurrentPosition()

      // Start watching position
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handlePositionUpdate(position),
        (error) => this.handlePositionError(error),
        {
          enableHighAccuracy: this.options.enableHighAccuracy,
          timeout: this.options.timeout,
          maximumAge: this.options.maximumAge
        }
      )

      // Start periodic pinging
      this.startPinging()

      console.log(`Started location tracking for device ${deviceId}`)
      return true
    } catch (error) {
      console.error('Failed to start location tracking:', error)
      this.isTracking = false
      return false
    }
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }

    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    this.isTracking = false
    this.deviceId = null
    this.lastLocation = null

    console.log('Stopped location tracking')
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking
  }

  getLastLocation(): LocationData | null {
    return this.lastLocation
  }

  private async getCurrentPosition(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = this.extractLocationData(position)
          this.lastLocation = locationData
          resolve(locationData)
        },
        (error) => reject(error),
        {
          enableHighAccuracy: this.options.enableHighAccuracy,
          timeout: this.options.timeout,
          maximumAge: this.options.maximumAge
        }
      )
    })
  }

  private handlePositionUpdate(position: GeolocationPosition): void {
    const locationData = this.extractLocationData(position)
    this.lastLocation = locationData
    
    // Optionally send immediate update for significant location changes
    if (this.isSignificantLocationChange(locationData)) {
      this.sendLocationPing(locationData)
    }
  }

  private handlePositionError(error: GeolocationPositionError): void {
    console.error('Geolocation error:', error.message)
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        console.error('Location access denied by user')
        break
      case error.POSITION_UNAVAILABLE:
        console.error('Location information unavailable')
        break
      case error.TIMEOUT:
        console.error('Location request timed out')
        break
    }
  }

  private extractLocationData(position: GeolocationPosition): LocationData {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date().toISOString(),
      battery_level: this.getBatteryLevel()
    }
  }

  private getBatteryLevel(): number | undefined {
    // Try to get battery level if available (Chrome only)
    if ('getBattery' in navigator) {
      // Note: This is async but we'll handle it separately
      return undefined
    }
    return undefined
  }

  private async getBatteryLevelAsync(): Promise<number | null> {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery()
        return Math.round(battery.level * 100)
      }
    } catch (error) {
      console.log('Battery API not available')
    }
    return null
  }

  private isSignificantLocationChange(newLocation: LocationData): boolean {
    if (!this.lastLocation) return true

    const distance = this.calculateDistance(
      this.lastLocation.latitude,
      this.lastLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    )

    // Consider significant if moved more than 10 meters
    return distance > 10
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

  private startPinging(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval)
    }

    this.pingInterval = setInterval(async () => {
      if (this.lastLocation && this.deviceId) {
        await this.sendLocationPing(this.lastLocation)
      }
    }, this.options.pingInterval)
  }

  private async sendLocationPing(locationData: LocationData): Promise<void> {
    if (!this.deviceId) return

    try {
      // Get fresh battery level
      const batteryLevel = await this.getBatteryLevelAsync()
      
      const pingData = {
        device_id: this.deviceId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        battery_level: batteryLevel,
        timestamp: locationData.timestamp
      }

      const response = await fetch('/api/ping/personal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pingData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('Location ping sent successfully:', result)
    } catch (error) {
      console.error('Failed to send location ping:', error)
    }
  }

  // Public method to manually send a ping
  async sendManualPing(): Promise<boolean> {
    try {
      const currentLocation = await this.getCurrentPosition()
      await this.sendLocationPing(currentLocation)
      return true
    } catch (error) {
      console.error('Failed to send manual ping:', error)
      return false
    }
  }

  // Check if user has granted location permissions
  static async checkLocationPermission(): Promise<PermissionState> {
    if (!navigator.permissions) {
      return 'prompt'
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' })
      return permission.state
    } catch (error) {
      console.error('Failed to check location permission:', error)
      return 'prompt'
    }
  }

  // Request location permission
  static async requestLocationPermission(): Promise<boolean> {
    if (!navigator.geolocation) {
      return false
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        { timeout: 5000 }
      )
    })
  }
}

export default LocationTrackingService

// Singleton instance for global use
export const locationTracker = new LocationTrackingService()

// Utility functions
export const formatLocationAccuracy = (accuracy: number): string => {
  if (accuracy < 10) return 'Very High'
  if (accuracy < 50) return 'High'
  if (accuracy < 100) return 'Medium'
  return 'Low'
}

export const formatLastSeen = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  return `${Math.floor(diffMins / 1440)}d ago`
} 