'use client'

import { useEffect, useState } from 'react'
import type { MediaType } from '@/types/database'

type WatchProvider = {
  id: number
  name: string
  logoUrl: string | null
  webUrl: string
  iosUrl: string | null
  androidUrl: string | null
}

type WhereToWatchProps = {
  name: string
  mediaType: MediaType
}

function openProvider(provider: WatchProvider) {
  const ua = navigator.userAgent
  const native = /android/i.test(ua)
    ? provider.androidUrl
    : /iphone|ipad|ipod/i.test(ua)
      ? provider.iosUrl
      : null

  if (native) {
    const started = Date.now()
    window.location.assign(native)
    window.setTimeout(() => {
      if (document.visibilityState === 'visible' && Date.now() - started < 1600) {
        window.open(provider.webUrl, '_blank', 'noopener,noreferrer')
      }
    }, 900)
    return
  }

  window.open(provider.webUrl, '_blank', 'noopener,noreferrer')
}

export function WhereToWatch({ name, mediaType }: WhereToWatchProps) {
  const [loading, setLoading] = useState(mediaType !== 'book')
  const [providers, setProviders] = useState<WatchProvider[]>([])

  useEffect(() => {
    if (mediaType === 'book') return

    let cancelled = false

    async function load() {
      try {
        const params = new URLSearchParams({
          q: name,
          media_type: mediaType,
        })
        const response = await fetch(`/api/watch-providers?${params}`)
        if (!response.ok) return
        const data = (await response.json()) as { providers?: WatchProvider[] }
        if (cancelled) return
        setProviders(data.providers ?? [])
      } catch {
        if (!cancelled) setProviders([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [name, mediaType])

  if (mediaType === 'book') return null
  if (!loading && providers.length === 0) return null

  return (
    <section className="mt-6" aria-label="Where to watch">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
        Where to watch
      </p>
      {loading ? (
        <div className="flex gap-2" aria-hidden>
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} className="h-12 w-12 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => openProvider(provider)}
                className="h-12 w-12 overflow-hidden rounded-xl bg-surface transition duration-150 active:scale-95"
                aria-label={`Watch on ${provider.name}`}
              >
                {provider.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={provider.logoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm font-medium text-fg">
                    {provider.name.slice(0, 1)}
                  </span>
                )}
              </button>
            ))}
          </div>
          <a
            href="https://www.watchmode.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-[11px] text-muted"
          >
            Powered by Watchmode
          </a>
        </>
      )}
    </section>
  )
}
