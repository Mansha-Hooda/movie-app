'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const BUILD_ID =
  process.env.NEXT_PUBLIC_SW_CACHE_VERSION ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  'dev'

type NavUpdatedMessage = {
  type?: string
  reason?: 'build' | 'content'
}

/** Registers the service worker and applies background cache updates. */
export function PwaRegister() {
  const router = useRouter()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const hadController = Boolean(navigator.serviceWorker.controller)
    let refreshing = false

    function onControllerChange() {
      // First SW taking control is not an update — don't reload (avoids a second splash).
      if (!hadController || refreshing) return
      refreshing = true
      window.location.reload()
    }

    function onWorkerMessage(event: MessageEvent<NavUpdatedMessage>) {
      if (event.data?.type !== 'NAV_UPDATED') return
      if (event.data.reason === 'build') {
        if (refreshing) return
        refreshing = true
        window.location.reload()
        return
      }
      if (event.data.reason === 'content') {
        router.refresh()
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
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
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      navigator.serviceWorker.removeEventListener('message', onWorkerMessage)
      void cleanupPromise.then((cleanup) => cleanup?.())
    }
  }, [router])

  return null
}
