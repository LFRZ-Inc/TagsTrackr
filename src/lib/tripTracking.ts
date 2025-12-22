/**
 * Trip Tracking and Driving Behavior Analysis
 * Similar to Life360 - tracks trips and detects risky driving behaviors
 */

export interface TripWaypoint {
  latitude: number
  longitude: number
  accuracy?: number
  altitude?: number
  speed?: number // km/h
  heading?: number // degrees
  acceleration?: number // m/s²
  timestamp: Date
}

export interface DrivingEvent {
  eventType: 'hard_braking' | 'rapid_acceleration' | 'speeding' | 'harsh_turning' | 'phone_usage' | 'rapid_lane_change' | 'idle_timeout' | 'crash_detection'
  severity: 'low' | 'medium' | 'high' | 'critical'
  latitude: number
  longitude: number
  speed?: number
  acceleration?: number
  gForce?: number
  description?: string
  metadata?: Record<string, any>
}

export interface TripData {
  tripId?: string
  deviceId: string
  startLocation: { lat: number; lng: number }
  endLocation?: { lat: number; lng: number }
  startedAt: Date
  endedAt?: Date
  waypoints: TripWaypoint[]
  events: DrivingEvent[]
  isActive: boolean
}

// Thresholds for detecting risky behaviors
const DRIVING_THRESHOLDS = {
  MIN_DRIVING_SPEED: 15, // km/h - below this is walking/stationary
  HARD_BRAKING_DECELERATION: -6.5, // m/s² - threshold for hard braking
  RAPID_ACCELERATION: 3.5, // m/s² - threshold for rapid acceleration
  SPEEDING_THRESHOLD: 120, // km/h - consider speeding above this (adjust per region)
  HARSH_TURNING_G_FORCE: 0.5, // G-force threshold for harsh turns
  IDLE_TIMEOUT_SECONDS: 300, // 5 minutes - consider trip ended if stationary
  WAYPOINT_INTERVAL_MS: 5000, // Record waypoint every 5 seconds when moving
}

export class TripTracker {
  private currentTrip: TripData | null = null
  private waypointBuffer: TripWaypoint[] = []
  private lastWaypointTime: number = 0
  private lastLocation: TripWaypoint | null = null
  private idleStartTime: number | null = null
  private isDriving: boolean = false

  /**
   * Process a new location update and detect trips/events
   */
  processLocationUpdate(waypoint: TripWaypoint): {
    tripStarted?: boolean
    tripEnded?: boolean
    events?: DrivingEvent[]
    shouldRecordWaypoint?: boolean
  } {
    const now = Date.now()
    const results: {
      tripStarted?: boolean
      tripEnded?: boolean
      events?: DrivingEvent[]
      shouldRecordWaypoint?: boolean
    } = {}

    // Detect if user is driving
    const wasDriving = this.isDriving
    this.isDriving = waypoint.speed !== undefined && waypoint.speed >= DRIVING_THRESHOLDS.MIN_DRIVING_SPEED

    // Detect trip start
    if (!this.currentTrip && this.isDriving) {
      this.startTrip(waypoint)
      results.tripStarted = true
    }

    // Detect trip end
    if (this.currentTrip && wasDriving && !this.isDriving) {
      // Check if idle for too long
      if (this.idleStartTime === null) {
        this.idleStartTime = now
      } else if (now - this.idleStartTime > DRIVING_THRESHOLDS.IDLE_TIMEOUT_SECONDS * 1000) {
        this.endTrip(waypoint)
        results.tripEnded = true
        this.idleStartTime = null
      }
    } else if (this.isDriving) {
      this.idleStartTime = null
    }

    // Analyze driving behavior if trip is active
    if (this.currentTrip && this.isDriving && this.lastLocation) {
      const events = this.analyzeDrivingBehavior(this.lastLocation, waypoint)
      if (events.length > 0) {
        results.events = events
        this.currentTrip.events.push(...events)
      }
    }

    // Record waypoint if moving or if significant time has passed
    const timeSinceLastWaypoint = now - this.lastWaypointTime
    if (this.currentTrip && (this.isDriving || timeSinceLastWaypoint > DRIVING_THRESHOLDS.WAYPOINT_INTERVAL_MS * 2)) {
      results.shouldRecordWaypoint = true
      this.currentTrip.waypoints.push(waypoint)
      this.lastWaypointTime = now
    }

    this.lastLocation = waypoint
    return results
  }

  /**
   * Start a new trip
   */
  private startTrip(waypoint: TripWaypoint): void {
    this.currentTrip = {
      deviceId: '', // Will be set by caller
      startLocation: { lat: waypoint.latitude, lng: waypoint.longitude },
      startedAt: waypoint.timestamp,
      waypoints: [waypoint],
      events: [],
      isActive: true,
    }
    this.lastWaypointTime = Date.now()
    this.idleStartTime = null
  }

  /**
   * End the current trip
   */
  private endTrip(waypoint: TripWaypoint): void {
    if (!this.currentTrip) return

    this.currentTrip.endLocation = { lat: waypoint.latitude, lng: waypoint.longitude }
    this.currentTrip.endedAt = waypoint.timestamp
    this.currentTrip.isActive = false
  }

  /**
   * Analyze driving behavior between two waypoints
   */
  private analyzeDrivingBehavior(prev: TripWaypoint, current: TripWaypoint): DrivingEvent[] {
    const events: DrivingEvent[] = []

    if (!prev.speed || !current.speed || !current.acceleration) {
      return events
    }

    // Calculate acceleration if not provided
    const timeDiff = (current.timestamp.getTime() - prev.timestamp.getTime()) / 1000 // seconds
    const speedDiff = current.speed - prev.speed // km/h
    const acceleration = current.acceleration || (speedDiff / 3.6 / timeDiff) // Convert to m/s²

    // Detect hard braking
    if (acceleration < DRIVING_THRESHOLDS.HARD_BRAKING_DECELERATION) {
      const gForce = Math.abs(acceleration) / 9.81
      const severity: DrivingEvent['severity'] = 
        gForce > 0.8 ? 'critical' :
        gForce > 0.6 ? 'high' :
        gForce > 0.4 ? 'medium' : 'low'

      events.push({
        eventType: 'hard_braking',
        severity,
        latitude: current.latitude,
        longitude: current.longitude,
        speed: current.speed,
        acceleration,
        gForce,
        description: `Hard braking detected: ${gForce.toFixed(2)}G deceleration`,
      })
    }

    // Detect rapid acceleration
    if (acceleration > DRIVING_THRESHOLDS.RAPID_ACCELERATION) {
      const gForce = acceleration / 9.81
      const severity: DrivingEvent['severity'] = 
        gForce > 0.5 ? 'high' :
        gForce > 0.35 ? 'medium' : 'low'

      events.push({
        eventType: 'rapid_acceleration',
        severity,
        latitude: current.latitude,
        longitude: current.longitude,
        speed: current.speed,
        acceleration,
        gForce,
        description: `Rapid acceleration detected: ${gForce.toFixed(2)}G`,
      })
    }

    // Detect speeding
    if (current.speed > DRIVING_THRESHOLDS.SPEEDING_THRESHOLD) {
      const overSpeed = current.speed - DRIVING_THRESHOLDS.SPEEDING_THRESHOLD
      const severity: DrivingEvent['severity'] = 
        overSpeed > 30 ? 'critical' :
        overSpeed > 20 ? 'high' :
        overSpeed > 10 ? 'medium' : 'low'

      events.push({
        eventType: 'speeding',
        severity,
        latitude: current.latitude,
        longitude: current.longitude,
        speed: current.speed,
        description: `Speeding detected: ${current.speed.toFixed(0)} km/h (${overSpeed.toFixed(0)} km/h over limit)`,
      })
    }

    // Detect harsh turning (using heading change and speed)
    if (prev.heading !== undefined && current.heading !== undefined) {
      const headingChange = Math.abs(current.heading - prev.heading)
      // Normalize heading change (account for 360° wrap)
      const normalizedHeadingChange = Math.min(headingChange, 360 - headingChange)
      
      // Harsh turn if significant heading change at speed
      if (normalizedHeadingChange > 30 && current.speed > 30) {
        const gForce = (current.speed / 3.6) * (normalizedHeadingChange * Math.PI / 180) / timeDiff / 9.81
        if (gForce > DRIVING_THRESHOLDS.HARSH_TURNING_G_FORCE) {
          const severity: DrivingEvent['severity'] = 
            gForce > 0.7 ? 'high' :
            gForce > 0.5 ? 'medium' : 'low'

          events.push({
            eventType: 'harsh_turning',
            severity,
            latitude: current.latitude,
            longitude: current.longitude,
            speed: current.speed,
            gForce,
            description: `Harsh turning detected: ${normalizedHeadingChange.toFixed(0)}° turn at ${current.speed.toFixed(0)} km/h`,
          })
        }
      }
    }

    return events
  }

  /**
   * Get current active trip
   */
  getCurrentTrip(): TripData | null {
    return this.currentTrip
  }

  /**
   * Force end current trip
   */
  endCurrentTrip(waypoint?: TripWaypoint): TripData | null {
    if (!this.currentTrip) return null

    if (waypoint) {
      this.endTrip(waypoint)
    } else {
      this.currentTrip.isActive = false
      this.currentTrip.endedAt = new Date()
    }

    const completedTrip = { ...this.currentTrip }
    this.currentTrip = null
    this.lastLocation = null
    this.idleStartTime = null
    this.isDriving = false

    return completedTrip
  }

  /**
   * Calculate trip statistics
   */
  calculateTripStats(trip: TripData): {
    totalDistance: number // meters
    averageSpeed: number // km/h
    maxSpeed: number // km/h
    totalDrivingTime: number // seconds
    safetyScore: number // 0-100
  } {
    if (trip.waypoints.length < 2) {
      return {
        totalDistance: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        totalDrivingTime: 0,
        safetyScore: 100,
      }
    }

    let totalDistance = 0
    let maxSpeed = 0
    let totalSpeed = 0
    let speedCount = 0
    let totalDrivingTime = 0

    for (let i = 1; i < trip.waypoints.length; i++) {
      const prev = trip.waypoints[i - 1]
      const curr = trip.waypoints[i]

      // Calculate distance
      const distance = this.calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      )
      totalDistance += distance

      // Track speed
      if (curr.speed !== undefined) {
        totalSpeed += curr.speed
        speedCount++
        maxSpeed = Math.max(maxSpeed, curr.speed)

        // Count driving time (only when moving)
        if (curr.speed >= DRIVING_THRESHOLDS.MIN_DRIVING_SPEED) {
          const timeDiff = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000
          totalDrivingTime += timeDiff
        }
      }
    }

    const averageSpeed = speedCount > 0 ? totalSpeed / speedCount : 0

    // Calculate safety score (100 - deductions for events)
    let safetyScore = 100
    trip.events.forEach(event => {
      const deduction = 
        event.severity === 'critical' ? 10 :
        event.severity === 'high' ? 5 :
        event.severity === 'medium' ? 2 : 1
      safetyScore -= deduction
    })
    safetyScore = Math.max(0, Math.min(100, safetyScore))

    return {
      totalDistance,
      averageSpeed,
      maxSpeed,
      totalDrivingTime,
      safetyScore,
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000 // Earth radius in meters
    const dLat = this.toRadians(lat2 - lat1)
    const dLng = this.toRadians(lng2 - lng1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}

