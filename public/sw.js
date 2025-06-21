// TagsTrackr Service Worker for background location tracking
const CACHE_NAME = 'tagstrackr-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/static/js/bundle.js',
  '/static/css/main.css'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Background sync for location updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'location-sync') {
    event.waitUntil(syncLocationData());
  }
});

// Periodic background sync (limited support)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'location-update') {
    event.waitUntil(updateLocationPeriodically());
  }
});

// Sync location data when back online
async function syncLocationData() {
  try {
    // Get stored location data from IndexedDB
    const pendingLocations = await getPendingLocations();
    
    for (const location of pendingLocations) {
      await fetch('/api/ping/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(location)
      });
    }
    
    // Clear synced data
    await clearPendingLocations();
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Periodic location update (very limited browser support)
async function updateLocationPeriodically() {
  // Note: This has very limited support and many restrictions
  // Most browsers don't allow this without user interaction
  console.log('Periodic background sync triggered');
  
  // Show notification to user to open app
  self.registration.showNotification('TagsTrackr Location Update', {
    body: 'Tap to update your location',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    actions: [
      {
        action: 'update-location',
        title: 'Update Location'
      }
    ]
  });
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'update-location') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// Helper functions for IndexedDB storage
async function getPendingLocations() {
  // Implement IndexedDB storage for offline location data
  return [];
}

async function clearPendingLocations() {
  // Clear synced location data
}

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 