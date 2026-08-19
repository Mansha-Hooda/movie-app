'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { IdentifyResult } from '@/lib/identify/types'
import { compressImageForUpload } from '@/lib/images/compress'
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

function isTooLargeError(status: number, message: string | undefined): boolean {
  if (status === 413) return true
  if (!message) return false
  return /too large|payload|entity too large|body.*limit|413/i.test(message)
}

export function ShareHandlerClient() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [guess, setGuess] = useState<IdentifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorKind, setErrorKind] = useState<'size' | 'identify' | 'generic' | null>(
    null,
  )

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
      setErrorKind(null)
      setGuess(null)
      setPhase('loading')

      try {
        let uploadFile: File
        try {
          uploadFile = await compressImageForUpload(file, {
            maxDimension: 1200,
            quality: 0.8,
          })
        } catch {
          // If compression fails (e.g. exotic HEIC), fall back to original
          uploadFile = file
        }

        setPreviewUrl(URL.createObjectURL(uploadFile))

        const formData = new FormData()
        formData.append('image', uploadFile)

        const response = await fetch('/api/identify-screenshot', {
          method: 'POST',
          body: formData,
        })

        let data: { result?: IdentifyResult; error?: string; code?: string } = {}
        try {
          data = (await response.json()) as typeof data
        } catch {
          if (response.status === 413 || response.status === 400) {
            setError('Image too large, please try again')
            setErrorKind('size')
            setPhase('fallback')
            return
          }
          setError('Something went wrong identifying the screenshot')
          setErrorKind('generic')
          setPhase('fallback')
          return
        }

        if (!response.ok) {
          const message = data.error || 'Could not identify this image'
          if (data.code === 'IMAGE_TOO_LARGE' || isTooLargeError(response.status, message)) {
            setError('Image too large, please try again')
            setErrorKind('size')
          } else {
            setError(message)
            setErrorKind('generic')
          }
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
          setErrorKind('identify')
          setPhase('fallback')
          return
        }

        setGuess(result)
        setPhase('confirm')
      } catch (err) {
        const message = err instanceof Error ? err.message : ''
        if (isTooLargeError(0, message)) {
          setError('Image too large, please try again')
          setErrorKind('size')
        } else {
          setError('Something went wrong identifying the screenshot')
          setErrorKind('generic')
        }
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

  const fallbackTitle =
    errorKind === 'size'
      ? 'Image too large'
      : errorKind === 'generic'
        ? 'Something went wrong'
        : "Couldn't confidently identify a title"

  const fallbackBody =
    error ||
    (errorKind === 'size'
      ? 'Image too large, please try again'
      : 'Try uploading a clearer screenshot, or search/type the title manually.')

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
          className="mx-auto max-h-64 rounded-md border border-border object-contain"
        />
      )}

      {phase === 'idle' && (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="mb-4 text-sm text-muted">
            Share a screenshot into this app from Android, or upload one here to
            test on desktop.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full bg-accent px-4 py-2 text-sm text-ink"
          >
            Upload screenshot
          </button>
        </div>
      )}

      {phase === 'loading' && (
        <p className="text-center text-sm text-muted">
          Preparing image and identifying title…
        </p>
      )}

      {phase === 'confirm' && guess && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-accent">
            Is this it?
          </p>
          <p className="text-lg font-medium text-fg">{guess.name}</p>
          <p className="mb-1 text-sm text-muted">
            {mediaLabel(guess.media_type)}
          </p>
          <p className="mb-4 text-xs text-muted">
            Confidence: {Math.round(guess.confidence * 100)}%
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-full bg-accent px-4 py-2 text-sm text-ink"
            >
              Yes, that&apos;s it
            </button>
            <Link
              href="/add"
              className="rounded-full border border-border px-4 py-2 text-center text-sm text-muted"
            >
              Not quite, let me search
            </Link>
          </div>
        </div>
      )}

      {phase === 'fallback' && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-2 font-medium text-fg">{fallbackTitle}</p>
          <p className="mb-4 text-sm text-muted">{fallbackBody}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-border px-4 py-2 text-sm text-muted"
            >
              Try another image
            </button>
            <Link
              href="/add"
              className="rounded-full bg-accent px-4 py-2 text-center text-sm text-ink"
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
            setErrorKind(null)
            setPhase('idle')
          }}
          className="text-sm text-muted underline"
        >
          Start over
        </button>
      )}
    </div>
  )
}
