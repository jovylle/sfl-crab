// Minimal SW: offline shell after first visit, never stale API or version checks.
const CACHE = 'd1g-v1'

self.addEventListener('install', (e) => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  // shortcut: runtime-only cache, no precache list to keep in sync with hashed builds.
  // Never cache API/function traffic or explicit no-cache checks (hot-deploy version poll).
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return
  if (request.cache === 'no-cache' || request.cache === 'no-store') return

  if (request.mode === 'navigate') {
    // Navigations: network first so deploys show up, cache fallback for offline.
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(request)
          const cache = await caches.open(CACHE)
          cache.put(request, res.clone())
          return res
        } catch {
          const cached = await caches.match(request)
          return cached || caches.match('/index.html')
        }
      })()
    )
    return
  }

  // Static assets: stale-while-revalidate.
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      const cached = await cache.match(request)
      const network = fetch(request)
        .then((res) => {
          cache.put(request, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || network
    })()
  )
})
