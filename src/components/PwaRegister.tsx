'use client'

import { useEffect } from 'react'

const BUILD_ID =
  process.env.NEXT_PUBLIC_SW_CACHE_VERSION ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  'dev'

/** Registers the service worker and keeps it updated across deploys. */
export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let refreshing = false

    function onControllerChange() {
      // New SW took control — reload once so the client gets the fresh shell.
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    async function register() {
      try {
        const registration = await navigator.serviceWorker.register(
          `/sw.js?v=${encodeURIComponent(BUILD_ID)}`,
          {
            // Always revalidate sw.js from the network on update checks
            updateViaCache: 'none',
          },
        )

        // If a new worker is already waiting, activate it immediately
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

        // Check for updates when the tab becomes visible again
        const onVisibility = () => {
          if (document.visibilityState === 'visible') {
            void registration.update()
          }
        }
        document.addEventListener('visibilitychange', onVisibility)

        // Periodic update check while the app stays open
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
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      void cleanupPromise.then((cleanup) => cleanup?.())
    }
  }, [])

  return null
}
