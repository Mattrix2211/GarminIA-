const CACHE_NAME = 'garminia-v1'
const API_CACHE = 'garminia-api-v1'

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
]

// ─── Install : précache les assets statiques ─────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// ─── Activate : nettoyage des anciens caches ──────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== API_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ─── Fetch : stratégie par type de requête ────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // API calls → network-first, fallback cache (3s timeout)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithTimeout(event.request, 3000))
    return
  }

  // GIFs exercice → cache-first (longs à charger)
  if (url.pathname.includes('/gif') || url.hostname.includes('exercisedb') || url.hostname.includes('wger')) {
    event.respondWith(cacheFirst(event.request, CACHE_NAME))
    return
  }

  // Navigation HTML → network-first, fallback vers /
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/').then(r => r ?? new Response('Hors ligne', { status: 503 }))
      )
    )
    return
  }

  // Tout le reste (JS, CSS, fonts) → cache-first
  event.respondWith(cacheFirst(event.request, CACHE_NAME))
})

async function networkFirstWithTimeout(request, timeoutMs) {
  const cache = await caches.open(API_CACHE)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(request, { signal: controller.signal })
    clearTimeout(timeout)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    clearTimeout(timeout)
    const cached = await cache.match(request)
    return cached ?? new Response(JSON.stringify({ error: 'Hors ligne', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Ressource indisponible hors ligne', { status: 503 })
  }
}

// ─── Push notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data
  try { data = event.data.json() } catch { data = { title: 'GarminIA', body: event.data.text() } }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'GarminIA', {
      body: data.body ?? '',
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      tag: data.tag ?? 'garminia',
      data: { url: data.url ?? '/' },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
