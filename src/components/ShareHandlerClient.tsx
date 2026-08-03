'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { IdentifyResult } from '@/lib/gemini/types'
import type { MediaType } from '@/types/database'

const SHARE_CACHE = 'share-target-v1'
const SHARE_IMAGE_KEY = 'shared-image'
const MIN_CONFIDENCE = 0.45

type Phase = 'idle' | 'loading' | 'confirm' | 'fallback'

async function readSharedImageFromCache(): Promise<File | null> {
  if (!('caches' in window)) return null

  try {
    const cache = await caches.open(SHARE_CACHE)
    const response = await cache.match(SHARE_IMAGE_KEY)
    if (!response) return null

    const blob = await response.blob()
    await cache.delete(SHARE_IMAGE_KEY)

    if (!blob.size) return null

    const filename =
      response.headers.get('X-Filename') ||
      `screenshot.${blob.type.split('/')[1] || 'jpg'}`

    return new File([blob], filename, {
      type: blob.type || 'image/jpeg',
    })
  } catch {
    return null
  }
}

export function ShareHandlerClient() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [guess, setGuess] = useState<IdentifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const revokePreview = useCallback(() => {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const identifyFile = useCallback(
    async (file: File) => {
      revokePreview()
      setError(null)
      setGuess(null)
      setPreviewUrl(URL.createObjectURL(file))
      setPhase('loading')

      try {
        const formData = new FormData()
        formData.append('image', file)

        const response = await fetch('/api/identify-screenshot', {
          method: 'POST',
          body: formData,
        })

        const data = (await response.json()) as {
          result?: IdentifyResult
          error?: string
        }

        if (!response.ok) {
          setError(data.error || 'Could not identify this image')
          setPhase('fallback')
          return
        }

        const result = data.result
        if (
          !result?.name ||
          !result.media_type ||
          result.confidence < MIN_CONFIDENCE
        ) {
          setGuess(result ?? null)
          setPhase('fallback')
          return
        }

        setGuess(result)
        setPhase('confirm')
      } catch {
        setError('Something went wrong identifying the screenshot')
        setPhase('fallback')
      }
    },
    [revokePreview],
  )

  // Pick up image shared via Android share_target (cached by the service worker)
  useEffect(() => {
    let cancelled = false

    void (async () => {
      const shared = await readSharedImageFromCache()
      if (!cancelled && shared) {
        await identifyFile(shared)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [identifyFile])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      void identifyFile(file)
    }
    event.target.value = ''
  }

  function handleConfirm() {
    if (!guess?.name || !guess.media_type) return
    const params = new URLSearchParams({
      name: guess.name,
      media_type: guess.media_type,
    })
    router.push(`/add?${params}`)
  }

  function mediaLabel(type: MediaType | null | undefined) {
    if (type === 'movie') return 'Movie'
    if (type === 'show') return 'Show'
    if (type === 'book') return 'Book'
    return 'Unknown'
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Screenshot being identified"
          className="mx-auto max-h-64 rounded-md border border-gray-200 object-contain"
        />
      )}

      {phase === 'idle' && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="mb-4 text-sm text-gray-700">
            Share a screenshot into this app from Android, or upload one here to
            test on desktop.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white"
          >
            Upload screenshot
          </button>
        </div>
      )}

      {phase === 'loading' && (
        <p className="text-center text-sm text-gray-600">Identifying title…</p>
      )}

      {phase === 'confirm' && guess && (
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">
            Is this it?
          </p>
          <p className="text-lg font-medium text-gray-900">{guess.name}</p>
          <p className="mb-1 text-sm text-gray-600">
            {mediaLabel(guess.media_type)}
          </p>
          <p className="mb-4 text-xs text-gray-500">
            Confidence: {Math.round(guess.confidence * 100)}%
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white"
            >
              Yes, that&apos;s it
            </button>
            <Link
              href="/add"
              className="rounded-md border border-gray-300 px-4 py-2 text-center text-sm text-gray-700"
            >
              Not quite, let me search
            </Link>
          </div>
        </div>
      )}

      {phase === 'fallback' && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 font-medium text-gray-900">
            Couldn&apos;t confidently identify a title
          </p>
          <p className="mb-4 text-sm text-gray-600">
            {error ||
              'Try uploading a clearer screenshot, or search/type the title manually.'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
            >
              Try another image
            </button>
            <Link
              href="/add"
              className="rounded-md bg-gray-900 px-4 py-2 text-center text-sm text-white"
            >
              Search manually
            </Link>
          </div>
        </div>
      )}

      {phase !== 'idle' && phase !== 'loading' && (
        <button
          type="button"
          onClick={() => {
            revokePreview()
            setGuess(null)
            setError(null)
            setPhase('idle')
          }}
          className="text-sm text-gray-600 underline"
        >
          Start over
        </button>
      )}
    </div>
  )
}
