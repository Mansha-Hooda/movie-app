// PWA service worker — share_target + versioned caching.
// Cache version comes from ?v= on the script URL (set at register time from the build id).
const CACHE_VERSION = new URL(self.location.href).searchParams.get('v') || 'dev'
const STATIC_CACHE = `backlog-static-${CACHE_VERSION}`
const SHARE_CACHE = 'share-target-v1'
const SHARE_IMAGE_KEY = 'shared-image'
const SHARE_LINK_KEY = 'shared-link'

const PRECACHE_URLS = ['/splash.png', '/logo-mark.png', '/icon.png']

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
const INSTAGRAM_URL =
  /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\/[\w-]+(?:\/)?/i

function extractInstagramUrl(raw) {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  const match = trimmed.match(INSTAGRAM_URL)
  if (match) return match[0].replace(/\/$/, '')
  try {
    const asUrl = new URL(trimmed)
    if (/instagram\.com$/i.test(asUrl.hostname.replace(/^www\./, ''))) {
      if (/^\/(reel|p|tv)\//.test(asUrl.pathname)) {
        return `${asUrl.origin}${asUrl.pathname}`.replace(/\/$/, '')
      }
    }
  } catch {
    // ignore
  }
  return null
}

function resolveSharedInstagramUrl(urlField, textField, titleField) {
  for (const candidate of [urlField, textField, titleField]) {
    const found = extractInstagramUrl(candidate)
    if (found) return found
  }
  return null
}

async function handleShareTarget(request) {
  try {
    const formData = await request.formData()
    const file =
      formData.get('image') ||
      formData.get('video') ||
      formData.get('file') ||
      formData.get('media') ||
      [...formData.values()].find((value) => value instanceof Blob && value.size > 0)

    const cache = await caches.open(SHARE_CACHE)

    if (file instanceof Blob && file.size > 0) {
      const headers = new Headers({
        'Content-Type': file.type || 'application/octet-stream',
      })
      if (file instanceof File && file.name) {
        headers.set('X-Filename', file.name)
      }
      await cache.put(SHARE_IMAGE_KEY, new Response(file, { headers }))
      await cache.delete(SHARE_LINK_KEY)
    } else {
      const sharedUrl = resolveSharedInstagramUrl(
        formData.get('url'),
        formData.get('text'),
        formData.get('title'),
      )
      if (sharedUrl) {
        await cache.put(
          SHARE_LINK_KEY,
          new Response(JSON.stringify({ url: sharedUrl }), {
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        await cache.delete(SHARE_IMAGE_KEY)
      }
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
  if (url.pathname === '/manifest.json') return false
  return /\.(?:js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot)$/i.test(
    url.pathname,
  )
}

function navigationCacheKey(request) {
  const url = new URL(request.url)
  return new Request(`${url.origin}${url.pathname}`, {
    method: 'GET',
    headers: { Accept: 'text/html' },
  })
}

function isRscRequest(url) {
  return url.searchParams.has('_rsc')
}

/** Stale-while-revalidate: return cache immediately, refresh in the background. */
async function staleWhileRevalidate(request, { notifyOnHtmlChange = false } = {}) {
  const cache = await caches.open(STATIC_CACHE)
  const cacheKey = notifyOnHtmlChange ? navigationCacheKey(request) : request
  const cached =
    (await cache.match(cacheKey, { ignoreSearch: true, ignoreVary: true })) ||
    (await cache.match(request, { ignoreSearch: true, ignoreVary: true }))

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response && response.ok && response.status === 200) {
        if (notifyOnHtmlChange && cached) {
          try {
            const [cachedText, freshText] = await Promise.all([
              cached.clone().text(),
              response.clone().text(),
            ])
            const cachedBuild = buildFingerprint(cachedText)
            const freshBuild = buildFingerprint(freshText)
            if (cachedBuild && freshBuild && cachedBuild !== freshBuild) {
              await notifyClients({ type: 'NAV_UPDATED', reason: 'build' })
            }
          } catch {
            // Comparison is best-effort — still cache the fresh response.
          }
        }
        await cache.put(cacheKey, response.clone())
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
  if (notifyOnHtmlChange) {
    const home = await cache.match(navigationCacheKey(new Request(`${self.location.origin}/`)), {
      ignoreSearch: true,
      ignoreVary: true,
    })
    if (home) return home
  }
  return new Response('Offline', { status: 503, statusText: 'Offline' })
}

function buildFingerprint(html) {
  const assets = [...html.matchAll(/\/_next\/static\/[^"' )\s]+/g)].map((match) => match[0])
  assets.sort()
  return assets.join('|')
}

async function notifyClients(message) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const client of windows) {
    client.postMessage(message)
  }
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
    if (url.pathname.startsWith('/auth/') || isRscRequest(url)) {
      return
    }
    event.respondWith(staleWhileRevalidate(request, { notifyOnHtmlChange: true }))
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request))
  }
})
