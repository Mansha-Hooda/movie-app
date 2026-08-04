// PWA service worker — share_target + versioned caching.
// Cache version comes from ?v= on the script URL (set at register time from the build id).
const CACHE_VERSION = new URL(self.location.href).searchParams.get('v') || 'dev'
const STATIC_CACHE = `backlog-static-${CACHE_VERSION}`
const SHARE_CACHE = 'share-target-v1'
const SHARE_IMAGE_KEY = 'shared-image'

const PRECACHE_URLS = ['/manifest.json']

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      await cache.addAll(PRECACHE_URLS)
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== SHARE_CACHE)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

/**
 * Android share_target POSTs the image here. Cache it, then redirect to the
 * GET /share-handler page so the client can read the file and call Gemini.
 */
async function handleShareTarget(request) {
  try {
    const formData = await request.formData()
    const file =
      formData.get('image') ||
      formData.get('file') ||
      formData.get('media') ||
      [...formData.values()].find((value) => value instanceof Blob && value.size > 0)

    if (file instanceof Blob && file.size > 0) {
      const cache = await caches.open(SHARE_CACHE)
      const headers = new Headers({
        'Content-Type': file.type || 'application/octet-stream',
      })
      if (file instanceof File && file.name) {
        headers.set('X-Filename', file.name)
      }
      await cache.put(SHARE_IMAGE_KEY, new Response(file, { headers }))
    }
  } catch (error) {
    console.error('[sw] share_target failed', error)
  }

  return Response.redirect('/share-handler', 303)
}

function isSameOrigin(url) {
  return url.origin === self.location.origin
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/')
}

function isNavigationRequest(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' &&
      (request.headers.get('accept') || '').includes('text/html'))
  )
}

function isStaticAsset(url) {
  if (url.pathname.startsWith('/_next/static/')) return true
  if (url.pathname === '/manifest.json') return true
  return /\.(?:js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot)$/i.test(
    url.pathname,
  )
}

/** Network-first: always try network for HTML shells; fall back to cache offline. */
async function networkFirst(request) {
  const cache = await caches.open(STATIC_CACHE)
  try {
    const fresh = await fetch(request)
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone())
    }
    return fresh
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    const fallback = await cache.match('/')
    if (fallback) return fallback
    return new Response('Offline', { status: 503, statusText: 'Offline' })
  }
}

/** Stale-while-revalidate: return cache quickly, refresh in background. */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => null)

  if (cached) {
    void networkPromise
    return cached
  }

  const fresh = await networkPromise
  if (fresh) return fresh
  return new Response('Offline', { status: 503, statusText: 'Offline' })
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method === 'POST' && url.pathname === '/share-handler') {
    event.respondWith(handleShareTarget(request))
    return
  }

  // Never intercept non-GET or cross-origin (except share handled above).
  if (request.method !== 'GET' || !isSameOrigin(url)) {
    return
  }

  // APIs must always hit the network (auth, Gemini, TMDb proxies, etc.).
  if (isApiRequest(url)) {
    return
  }

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirst(request))
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request))
  }
})
