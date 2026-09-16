'use client'

import { useEffect } from 'react'

const BUILD_ID =
  process.env.NEXT_PUBLIC_SW_CACHE_VERSION ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  'dev'

type NavUpdatedMessage = {
  type?: string
  reason?: 'build' | 'content'
}

/** Registers the service worker. Does not reload on launch — that kept the splash up. */
export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    function onWorkerMessage(event: MessageEvent<NavUpdatedMessage>) {
      if (event.data?.type !== 'NAV_UPDATED') return
      if (event.data.reason !== 'build') return
      // New deployment's JS chunks changed — apply after this paint, not during splash.
      window.setTimeout(() => {
        window.location.reload()
      }, 2500)
    }

    navigator.serviceWorker.addEventListener('message', onWorkerMessage)

    async function register() {
      try {
        const registration = await navigator.serviceWorker.register(
          `/sw.js?v=${encodeURIComponent(BUILD_ID)}`,
          {
            updateViaCache: 'none',
          },
        )

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing
          if (!worker) return
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })

        const onVisibility = () => {
          if (document.visibilityState === 'visible') {
            void registration.update()
          }
        }
        document.addEventListener('visibilitychange', onVisibility)

        const intervalId = window.setInterval(() => {
          void registration.update()
        }, 60_000)

        return () => {
          document.removeEventListener('visibilitychange', onVisibility)
          window.clearInterval(intervalId)
        }
      } catch {
        // Non-fatal — app still works without SW registration.
      }
    }

    const cleanupPromise = register()

    return () => {
      navigator.serviceWorker.removeEventListener('message', onWorkerMessage)
      void cleanupPromise.then((cleanup) => cleanup?.())
    }
  }, [])

  return null
}
