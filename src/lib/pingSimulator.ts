// Simulated GPS Ping Generator for Development
// This simulates GPS devices sending location updates every 5 minutes

interface SimulatedPing {
  tag_id: string
  latitude: number
  longitude: number
  accuracy: number
  battery_level: number
  signal_strength: number
  timestamp: string
}

class PingSimulator {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private tags: Array<{
    tag_id: string
    latitude: number
    longitude: number
    battery_level: number
    route: Array<{ lat: number; lng: number }>
    currentRouteIndex: number
  }> = []

  constructor() {
    // Initialize with some sample tags
    this.initializeSampleTags()
  }

  private initializeSampleTags() {
    // Sample routes simulating luggage movement
    const routes = [
      // Route 1: JFK to LAX (New York to Los Angeles)
      {
        tag_id: 'TT12345ABC',
        start: { lat: 40.6413, lng: -73.7781 }, // JFK Airport
        end: { lat: 33.9425, lng: -118.4081 }, // LAX Airport
        battery_level: 85
      },
      // Route 2: Heathrow to Charles de Gaulle (London to Paris)
      {
        tag_id: 'TT67890DEF',
        start: { lat: 51.4700, lng: -0.4543 }, // Heathrow
        end: { lat: 49.0097, lng: 2.5479 }, // CDG
        battery_level: 42
      }
    ]

    this.tags = routes.map(route => ({
      tag_id: route.tag_id,
      latitude: route.start.lat,
      longitude: route.start.lng,
      battery_level: route.battery_level,
      route: this.generateRoute(route.start, route.end),
      currentRouteIndex: 0
    }))
  }

  private generateRoute(start: { lat: number; lng: number }, end: { lat: number; lng: number }) {
    const steps = 20 // Number of steps in the route
    const route = []
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps
      const lat = start.lat + (end.lat - start.lat) * progress
      const lng = start.lng + (end.lng - start.lng) * progress
      
      // Add some random variation to simulate realistic movement
      const variation = 0.01
      const randomLat = lat + (Math.random() - 0.5) * variation
      const randomLng = lng + (Math.random() - 0.5) * variation
      
      route.push({ lat: randomLat, lng: randomLng })
    }
    
    return route
  }

  private generatePing(tag: typeof this.tags[0]): SimulatedPing {
    // Move to next position in route
    if (tag.currentRouteIndex < tag.route.length - 1) {
      tag.currentRouteIndex++
      const currentPos = tag.route[tag.currentRouteIndex]
      tag.latitude = currentPos.lat
      tag.longitude = currentPos.lng
    }

    // Simulate battery drain
    tag.battery_level = Math.max(0, tag.battery_level - Math.random() * 2)

    return {
      tag_id: tag.tag_id,
      latitude: tag.latitude,
      longitude: tag.longitude,
      accuracy: Math.random() * 10 + 2, // 2-12 meter accuracy
      battery_level: Math.round(tag.battery_level),
      signal_strength: Math.floor(Math.random() * 40) - 80, // -80 to -40 dBm
      timestamp: new Date().toISOString()
    }
  }

  private async sendPing(ping: SimulatedPing) {
    try {
      const response = await fetch('/api/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ping)
      })

      if (response.ok) {
        console.log(`✓ Ping sent for ${ping.tag_id}:`, {
          location: `${ping.latitude.toFixed(4)}, ${ping.longitude.toFixed(4)}`,
          battery: `${ping.battery_level}%`,
          accuracy: `${ping.accuracy.toFixed(1)}m`
        })
      } else {
        console.error(`✗ Failed to send ping for ${ping.tag_id}:`, response.statusText)
      }
    } catch (error) {
      console.error(`✗ Error sending ping for ${ping.tag_id}:`, error)
    }
  }

  private generateAllPings() {
    console.log('🎯 Generating simulated GPS pings...')
    
    this.tags.forEach(tag => {
      if (tag.battery_level > 0) {
        const ping = this.generatePing(tag)
        this.sendPing(ping)
      } else {
        console.log(`🔋 Tag ${tag.tag_id} battery depleted, stopping pings`)
      }
    })
  }

  start(intervalMinutes: number = 5) {
    if (this.isRunning) {
      console.log('⚠️ Ping simulator is already running')
      return
    }

    console.log(`🚀 Starting ping simulator (${intervalMinutes} minute intervals)`)
    this.isRunning = true
    
    // Send initial pings
    this.generateAllPings()
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.generateAllPings()
    }, intervalMinutes * 60 * 1000)
  }

  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Ping simulator is not running')
      return
    }

    console.log('🛑 Stopping ping simulator')
    this.isRunning = false
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  addTag(tagId: string, startLat: number, startLng: number, endLat: number, endLng: number) {
    const route = this.generateRoute(
      { lat: startLat, lng: startLng },
      { lat: endLat, lng: endLng }
    )

    this.tags.push({
      tag_id: tagId,
      latitude: startLat,
      longitude: startLng,
      battery_level: 100,
      route,
      currentRouteIndex: 0
    })

    console.log(`✓ Added tag ${tagId} to simulator`)
  }

  removeTag(tagId: string) {
    const index = this.tags.findIndex(tag => tag.tag_id === tagId)
    if (index > -1) {
      this.tags.splice(index, 1)
      console.log(`✓ Removed tag ${tagId} from simulator`)
    } else {
      console.log(`⚠️ Tag ${tagId} not found in simulator`)
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      tagCount: this.tags.length,
      tags: this.tags.map(tag => ({
        tag_id: tag.tag_id,
        battery_level: tag.battery_level,
        current_position: {
          latitude: tag.latitude,
          longitude: tag.longitude
        },
        route_progress: `${tag.currentRouteIndex}/${tag.route.length - 1}`
      }))
    }
  }

  // Method to manually trigger a ping (useful for testing)
  sendManualPing(tagId?: string) {
    if (tagId) {
      const tag = this.tags.find(t => t.tag_id === tagId)
      if (tag) {
        const ping = this.generatePing(tag)
        this.sendPing(ping)
      } else {
        console.log(`⚠️ Tag ${tagId} not found`)
      }
    } else {
      this.generateAllPings()
    }
  }
}

// Export singleton instance
export const pingSimulator = new PingSimulator()

// Browser-only utilities
export const simulatorUtils = {
  // Add to window object for browser console access
  addToWindow: () => {
    if (typeof window !== 'undefined') {
      ;(window as any).pingSimulator = {
        start: (minutes?: number) => pingSimulator.start(minutes),
        stop: () => pingSimulator.stop(),
        status: () => console.table(pingSimulator.getStatus()),
        addTag: (tagId: string, startLat: number, startLng: number, endLat: number, endLng: number) =>
          pingSimulator.addTag(tagId, startLat, startLng, endLat, endLng),
        removeTag: (tagId: string) => pingSimulator.removeTag(tagId),
        ping: (tagId?: string) => pingSimulator.sendManualPing(tagId)
      }
      console.log('🎯 Ping simulator added to window.pingSimulator')
      console.log('Available commands:')
      console.log('  window.pingSimulator.start(5) - Start with 5-minute intervals')
      console.log('  window.pingSimulator.stop() - Stop simulator')
      console.log('  window.pingSimulator.status() - View current status')
      console.log('  window.pingSimulator.ping() - Send manual ping for all tags')
      console.log('  window.pingSimulator.ping("TT12345ABC") - Send ping for specific tag')
    }
  }
}

// Route simulation function for admin panel
export const simulateRoute = async (tagId: string, routeType: string, onPing?: (ping: SimulatedPing) => void) => {
  const routes = {
    airport: {
      start: { lat: 40.6413, lng: -73.7781 }, // JFK Airport
      end: { lat: 33.9425, lng: -118.4081 }, // LAX Airport
      steps: 15,
      interval: 3000 // 3 seconds for demo
    },
    shipping: {
      start: { lat: 40.7128, lng: -74.0060 }, // NYC Warehouse
      end: { lat: 40.7589, lng: -73.9851 }, // Manhattan Delivery
      steps: 20,
      interval: 2000
    },
    hotel: {
      start: { lat: 40.6413, lng: -73.7781 }, // Airport
      end: { lat: 40.7505, lng: -73.9934 }, // Hotel
      steps: 10,
      interval: 2500
    }
  }

  const route = routes[routeType as keyof typeof routes]
  if (!route) throw new Error('Invalid route type')

  for (let i = 0; i <= route.steps; i++) {
    const progress = i / route.steps
    const lat = route.start.lat + (route.end.lat - route.start.lat) * progress
    const lng = route.start.lng + (route.end.lng - route.start.lng) * progress
    
    // Add slight variation for realism
    const variation = 0.001
    const actualLat = lat + (Math.random() - 0.5) * variation
    const actualLng = lng + (Math.random() - 0.5) * variation

    const ping: SimulatedPing = {
      tag_id: tagId,
      latitude: actualLat,
      longitude: actualLng,
      accuracy: Math.random() * 5 + 2,
      battery_level: Math.max(20, 100 - (i * 2)),
      signal_strength: Math.floor(Math.random() * 20) - 70,
      timestamp: new Date().toISOString()
    }

    // Send to API
    try {
      await fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ping)
      })
    } catch (error) {
      console.error('Failed to send ping:', error)
    }

    // Call callback if provided
    if (onPing) onPing(ping)

    // Wait before next ping
    if (i < route.steps) {
      await new Promise(resolve => setTimeout(resolve, route.interval))
    }
  }
}

export default pingSimulator 