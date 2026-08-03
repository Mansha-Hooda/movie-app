'use client'

import { useEffect } from 'react'

/** Registers the minimal service worker for PWA install support. */
export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Non-fatal — app still works without SW registration.
      })
    }
  }, [])

  return null
}
