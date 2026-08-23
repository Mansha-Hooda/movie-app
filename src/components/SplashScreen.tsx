'use client'

import { useEffect, useState } from 'react'

const SPLASH_MS = 1400
const SPLASH_KEY = 'bookmark-splash-shown'

function alreadyShown(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_KEY) === '1'
  } catch {
    return false
  }
}

/** Full-screen launch splash matching the BOOKMARK brand frame. */
export function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (alreadyShown()) {
      document.documentElement.classList.add('splash-done')
      setVisible(false)
      return
    }

    const hide = window.setTimeout(() => setExiting(true), SPLASH_MS)
    const remove = window.setTimeout(() => {
      setVisible(false)
      document.documentElement.classList.add('splash-done')
      try {
        sessionStorage.setItem(SPLASH_KEY, '1')
      } catch {
        // ignore
      }
    }, SPLASH_MS + 380)

    return () => {
      window.clearTimeout(hide)
      window.clearTimeout(remove)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#6C00F8] transition-opacity duration-300 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" alt="" className="h-24 w-auto" />
      <p className="mt-6 text-xl font-bold tracking-[0.28em] text-white">BOOKMARK</p>
    </div>
  )
}
