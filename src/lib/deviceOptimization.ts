/**
 * Device Optimization Utilities
 * Provides optimized settings for different device types based on their capabilities
 */

export type DeviceType = 'phone' | 'tablet' | 'watch' | 'laptop' | 'gps_tag'

export interface DeviceOptimization {
  hasGPS: boolean
  updateInterval: number // milliseconds
  movementThreshold: number // meters
  geolocationTimeout: number // milliseconds
  geolocationMaxAge: number // milliseconds
  enableHighAccuracy: boolean
  description: string
}

/**
 * Get optimization settings for a device type
 */
export function getDeviceOptimization(deviceType: DeviceType): DeviceOptimization {
  switch (deviceType) {
    case 'phone':
      return {
        hasGPS: true,
        updateInterval: 20000, // 20 seconds - more frequent for GPS
        movementThreshold: 5, // 5 meters - more sensitive
        geolocationTimeout: 20000, // 20 seconds - longer for GPS lock
        geolocationMaxAge: 30000, // 30 seconds - fresher data
        enableHighAccuracy: true,
        description: 'GPS-enabled mobile device with high accuracy tracking'
      }
    
    case 'tablet':
      // Tablets can have GPS (especially cellular models)
      return {
        hasGPS: true,
        updateInterval: 25000, // 25 seconds - slightly less frequent than phones
        movementThreshold: 7, // 7 meters - slightly less sensitive
        geolocationTimeout: 20000, // 20 seconds - GPS lock time
        geolocationMaxAge: 30000, // 30 seconds - fresh GPS data
        enableHighAccuracy: true,
        description: 'GPS-enabled tablet device (cellular models have better accuracy)'
      }
    
    case 'watch':
      // Smartwatches typically have GPS
      return {
        hasGPS: true,
        updateInterval: 30000, // 30 seconds - watches may have battery constraints
        movementThreshold: 5, // 5 meters - sensitive for fitness tracking
        geolocationTimeout: 20000, // 20 seconds - GPS lock
        geolocationMaxAge: 30000, // 30 seconds - fresh data
        enableHighAccuracy: true,
        description: 'GPS-enabled smartwatch with fitness tracking capabilities'
      }
    
    case 'laptop':
      return {
        hasGPS: false,
        updateInterval: 30000, // 30 seconds - WiFi-based
        movementThreshold: 10, // 10 meters - less sensitive
        geolocationTimeout: 15000, // 15 seconds - WiFi is faster
        geolocationMaxAge: 60000, // 60 seconds - WiFi can use cached data
        enableHighAccuracy: true, // Still request high accuracy when available
        description: 'WiFi-based laptop tracking (less accurate than GPS)'
      }
    
    case 'gps_tag':
      // Physical GPS tag - prepared for future implementation
      return {
        hasGPS: true,
        updateInterval: 60000, // 60 seconds - battery-efficient for hardware devices
        movementThreshold: 10, // 10 meters - standard for asset tracking
        geolocationTimeout: 30000, // 30 seconds - hardware GPS may take longer
        geolocationMaxAge: 120000, // 2 minutes - hardware devices may have delays
        enableHighAccuracy: true,
        description: 'Physical GPS tracking tag with battery-efficient updates'
      }
    
    default:
      // Default to laptop settings for unknown types
      return {
        hasGPS: false,
        updateInterval: 30000,
        movementThreshold: 10,
        geolocationTimeout: 15000,
        geolocationMaxAge: 60000,
        enableHighAccuracy: true,
        description: 'Unknown device type - using default settings'
      }
  }
}

/**
 * Check if device type is GPS-capable
 */
export function isGPSDevice(deviceType: DeviceType): boolean {
  return getDeviceOptimization(deviceType).hasGPS
}

/**
 * Get optimized geolocation options for a device type
 */
export function getGeolocationOptions(deviceType: DeviceType) {
  const optimization = getDeviceOptimization(deviceType)
  
  return {
    enableHighAccuracy: optimization.enableHighAccuracy,
    timeout: optimization.geolocationTimeout,
    maximumAge: optimization.geolocationMaxAge
  }
}

/**
 * Get error message for geolocation errors based on device type
 */
export function getGeolocationErrorMessage(
  errorCode: number,
  deviceType: DeviceType
): string {
  const optimization = getDeviceOptimization(deviceType)
  const isMobile = typeof window !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  switch (errorCode) {
    case 1: // PERMISSION_DENIED
      if (optimization.hasGPS) {
        return isMobile
          ? 'Location access denied. Please allow location access when prompted, or enable it in your browser settings and ensure GPS is enabled in your device settings.'
          : 'Location access denied. Please click the lock icon in your browser address bar and allow location access, then try again.'
      }
      return isMobile
        ? 'Location access denied. Please allow location access when prompted, or enable it in your browser settings.'
        : 'Location access denied. Please click the lock icon in your browser address bar and allow location access, then try again.'
    
    case 2: // POSITION_UNAVAILABLE
      if (optimization.hasGPS) {
        return 'Location unavailable. Please check your GPS is enabled and try going outdoors for better signal.'
      }
      return 'Location unavailable. Please check your GPS/WiFi connection.'
    
    case 3: // TIMEOUT
      if (optimization.hasGPS) {
        return 'GPS lock timed out. Try going outdoors or wait a bit longer for GPS signal.'
      }
      return 'Location request timed out. Please try again.'
    
    default:
      return 'An unknown location error occurred. Please try again.'
  }
}

/**
 * Get update frequency description for UI
 */
export function getUpdateFrequencyDescription(deviceType: DeviceType): string {
  const optimization = getDeviceOptimization(deviceType)
  const seconds = optimization.updateInterval / 1000
  return `Location updates every ${seconds} seconds when active`
}

