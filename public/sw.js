// PWA service worker — install eligibility + Android share_target handoff.
const CACHE_NAME = 'backlog-v2'
const SHARE_CACHE = 'share-target-v1'
const SHARE_IMAGE_KEY = 'shared-image'
const PRECACHE_URLS = ['/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== SHARE_CACHE)
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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (event.request.method === 'POST' && url.pathname === '/share-handler') {
    event.respondWith(handleShareTarget(event.request))
  }
  // All other requests go to the network (Next.js App Router must not be cached blindly).
})
