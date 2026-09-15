'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import type { IdentifyHit, IdentifyResult } from '@/lib/identify/types'
import { compressImageForUpload } from '@/lib/images/compress'
import { extractInstagramUrl } from '@/lib/reels/url'
import { findDuplicateInList, normalizeTitleName } from '@/lib/titles/api'
import type { MediaType, Title } from '@/types/database'

const SHARE_CACHE = 'share-target-v1'
const SHARE_IMAGE_KEY = 'shared-image'
const SHARE_LINK_KEY = 'shared-link'
const MIN_CONFIDENCE = 0.45

type Phase = 'idle' | 'loading' | 'confirm' | 'select' | 'saving' | 'success' | 'fallback'
type InputMode = 'screenshot' | 'reel'

type ShareHandlerClientProps = {
  existingTitles?: Title[]
}

type IdentifyPayload = {
  results?: IdentifyResult[]
  result?: IdentifyResult
  error?: string
  code?: string
}

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

async function readSharedLinkFromCache(): Promise<string | null> {
  if (!('caches' in window)) return null

  try {
    const cache = await caches.open(SHARE_CACHE)
    const response = await cache.match(SHARE_LINK_KEY)
    if (!response) return null

    await cache.delete(SHARE_LINK_KEY)
    const data = (await response.json()) as { url?: string }
    const url = data.url?.trim()
    return url ? extractInstagramUrl(url) ?? url : null
  } catch {
    return null
  }
}

function isTooLargeError(status: number, message: string | undefined): boolean {
  if (status === 413) return true
  if (!message) return false
  return /too large|payload|entity too large|body.*limit|413/i.test(message)
}

function reelErrorMessage(code: string | undefined, fallback: string): string {
  if (code === 'REEL_INACCESSIBLE') {
    return 'This reel is private or we cannot access it. Try a public Instagram reel link.'
  }
  if (code === 'SUPADATA_NOT_CONFIGURED') {
    return 'Reel identification is not set up on the server yet (missing Supadata key).'
  }
  if (code === 'INVALID_URL') {
    return 'Please paste a public Instagram reel or post link.'
  }
  if (code === 'NO_TEXT') {
    return 'We could not read a caption or spoken audio from this reel. Search for the title manually.'
  }
  return fallback
}

function parseIdentifyPayload(data: IdentifyPayload): IdentifyResult[] {
  if (Array.isArray(data.results)) return data.results
  if (data.result) return [data.result]
  return []
}

function confidentHits(results: IdentifyResult[]): IdentifyHit[] {
  return results.filter(
    (result): result is IdentifyHit =>
      Boolean(result.name?.trim()) &&
      Boolean(result.media_type) &&
      result.confidence >= MIN_CONFIDENCE,
  )
}

function titleKey(name: string, mediaType: MediaType): string {
  return `${mediaType}:${normalizeTitleName(name)}`
}

function mediaLabel(type: MediaType | null | undefined) {
  if (type === 'movie') return 'Movie'
  if (type === 'show') return 'Show'
  if (type === 'book') return 'Book'
  return 'Unknown'
}

export function ShareHandlerClient({ existingTitles = [] }: ShareHandlerClientProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [inputMode, setInputMode] = useState<InputMode>('screenshot')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [reelUrl, setReelUrl] = useState<string | null>(null)
  const [linkDraft, setLinkDraft] = useState('')
  const [guesses, setGuesses] = useState<IdentifyHit[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [addedCount, setAddedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [errorKind, setErrorKind] = useState<
    'size' | 'identify' | 'generic' | 'reel' | null
  >(null)

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

  const applyIdentifyResults = useCallback(
    (results: IdentifyResult[]) => {
      const hits = confidentHits(results)
      if (hits.length === 0) {
        setGuesses([])
        setSelectedKeys(new Set())
        setErrorKind('identify')
        setPhase('fallback')
        return
      }

      const nextSelected = new Set<string>()
      for (const hit of hits) {
        if (!findDuplicateInList(existingTitles, hit.name, hit.media_type)) {
          nextSelected.add(titleKey(hit.name, hit.media_type))
        }
      }

      setGuesses(hits)
      setSelectedKeys(nextSelected)
      setPhase(hits.length === 1 ? 'confirm' : 'select')
    },
    [existingTitles],
  )

  const identifyFile = useCallback(
    async (file: File) => {
      revokePreview()
      setReelUrl(null)
      setError(null)
      setErrorKind(null)
      setGuesses([])
      setSelectedKeys(new Set())
      setInputMode('screenshot')
      setPhase('loading')

      try {
        let uploadFile: File
        try {
          uploadFile = await compressImageForUpload(file, {
            maxDimension: 1200,
            quality: 0.8,
          })
        } catch {
          uploadFile = file
        }

        setPreviewUrl(URL.createObjectURL(uploadFile))

        const formData = new FormData()
        formData.append('image', uploadFile)

        const response = await fetch('/api/identify-screenshot', {
          method: 'POST',
          body: formData,
        })

        let data: IdentifyPayload = {}
        try {
          data = (await response.json()) as IdentifyPayload
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

        applyIdentifyResults(parseIdentifyPayload(data))
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
    [applyIdentifyResults, revokePreview],
  )

  const identifyReel = useCallback(
    async (rawUrl: string) => {
      const url = extractInstagramUrl(rawUrl)
      if (!url) {
        setError('Paste a valid Instagram reel or post link')
        setErrorKind('reel')
        setPhase('fallback')
        setInputMode('reel')
        return
      }

      revokePreview()
      setReelUrl(url)
      setLinkDraft(url)
      setError(null)
      setErrorKind(null)
      setGuesses([])
      setSelectedKeys(new Set())
      setInputMode('reel')
      setPhase('loading')

      try {
        const response = await fetch('/api/identify-reel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })

        let data: IdentifyPayload = {}
        try {
          data = (await response.json()) as IdentifyPayload
        } catch {
          setError('Something went wrong reading this reel')
          setErrorKind('generic')
          setPhase('fallback')
          return
        }

        if (!response.ok) {
          setError(reelErrorMessage(data.code, data.error || 'Could not read this reel'))
          setErrorKind(data.code === 'REEL_INACCESSIBLE' ? 'reel' : 'generic')
          setPhase('fallback')
          return
        }

        if (data.code === 'NO_TEXT') {
          setGuesses([])
          setError(reelErrorMessage('NO_TEXT', data.error || ''))
          setErrorKind('identify')
          setPhase('fallback')
          return
        }

        applyIdentifyResults(parseIdentifyPayload(data))
      } catch {
        setError('Something went wrong reading this reel')
        setErrorKind('generic')
        setPhase('fallback')
      }
    },
    [applyIdentifyResults, revokePreview],
  )

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const sharedImage = await readSharedImageFromCache()
      if (!cancelled && sharedImage) {
        await identifyFile(sharedImage)
        return
      }

      const sharedLink = await readSharedLinkFromCache()
      if (!cancelled && sharedLink) {
        await identifyReel(sharedLink)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [identifyFile, identifyReel])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      void identifyFile(file)
    }
    event.target.value = ''
  }

  function handleLinkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void identifyReel(linkDraft)
  }

  const guess = guesses[0] ?? null
  const duplicate =
    guess?.name && guess.media_type
      ? findDuplicateInList(existingTitles, guess.name, guess.media_type)
      : null

  const selectableCount = useMemo(
    () =>
      guesses.filter(
        (hit) => !findDuplicateInList(existingTitles, hit.name, hit.media_type),
      ).length,
    [existingTitles, guesses],
  )

  function handleConfirm() {
    if (!guess?.name || !guess.media_type || duplicate) return
    const params = new URLSearchParams({
      name: guess.name,
      media_type: guess.media_type,
    })
    router.push(`/add?${params}`)
  }

  function toggleSelected(hit: IdentifyHit) {
    if (findDuplicateInList(existingTitles, hit.name, hit.media_type)) return
    const key = titleKey(hit.name, hit.media_type)
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleAddSelected() {
    const selected = guesses.filter((hit) =>
      selectedKeys.has(titleKey(hit.name, hit.media_type)),
    )
    if (selected.length === 0) return

    setError(null)
    setPhase('saving')

    try {
      const response = await fetch('/api/batch-add-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titles: selected.map((hit) => ({
            name: hit.name,
            media_type: hit.media_type,
          })),
        }),
      })

      const data = (await response.json()) as {
        added?: number
        error?: string
      }

      if (!response.ok) {
        setError(data.error || 'Could not add those titles')
        setErrorKind('generic')
        setPhase('select')
        return
      }

      setAddedCount(data.added ?? selected.length)
      setPhase('success')
      window.setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 1600)
    } catch {
      setError('Could not add those titles')
      setErrorKind('generic')
      setPhase('select')
    }
  }

  const fallbackTitle =
    errorKind === 'size'
      ? 'Image too large'
      : errorKind === 'reel'
        ? 'Reel unavailable'
        : errorKind === 'generic'
          ? 'Something went wrong'
          : "Couldn't confidently identify a title"

  const fallbackBody =
    error ||
    (errorKind === 'size'
      ? 'Image too large, please try again'
      : inputMode === 'reel'
        ? 'Try another public reel link, or search for the title manually.'
        : 'Try uploading a clearer screenshot, or search/type the title manually.')

  const loadingLabel =
    inputMode === 'reel'
      ? 'Reading reel caption and audio…'
      : 'Identifying titles…'

  function resetToIdle() {
    revokePreview()
    setReelUrl(null)
    setLinkDraft('')
    setGuesses([])
    setSelectedKeys(new Set())
    setAddedCount(0)
    setError(null)
    setErrorKind(null)
    setPhase('idle')
  }

  const addLabel =
    selectedKeys.size === 1 ? 'Add 1 title' : `Add ${selectedKeys.size} titles`

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
          className="mx-auto max-h-64 rounded-xl border border-border bg-surface object-contain"
        />
      )}

      {reelUrl && inputMode === 'reel' && !previewUrl && (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          <span className="block text-xs uppercase tracking-wide text-accent">
            Instagram reel
          </span>
          <span className="mt-1 block break-all text-fg">{reelUrl}</span>
        </p>
      )}

      {phase === 'idle' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <p className="mb-4 text-sm text-muted">
              Share a screenshot or an Instagram reel link into this app from
              Android, or use the options below to test on desktop.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary"
            >
              Upload screenshot
            </button>
          </div>

          <form
            onSubmit={handleLinkSubmit}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <label htmlFor="reel-link" className="mb-2 block text-sm font-medium text-fg">
              Paste a link
            </label>
            <input
              id="reel-link"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://www.instagram.com/reel/…"
              value={linkDraft}
              onChange={(event) => setLinkDraft(event.target.value)}
              className="field mb-3"
            />
            <button type="submit" className="btn-primary w-full">
              Identify from reel
            </button>
          </form>
        </div>
      )}

      {phase === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="h-7 w-7 animate-spin text-accent" aria-hidden />
          <p className="text-center text-sm text-muted">{loadingLabel}</p>
        </div>
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
          {duplicate ? (
            <div className="mb-4 rounded-lg border border-border bg-page px-3 py-2 text-sm">
              <p className="text-fg">Already in your backlog</p>
              <p className="mt-0.5 text-xs text-muted">
                {duplicate.status === 'done'
                  ? duplicate.media_type === 'book'
                    ? 'You already marked this as read.'
                    : 'You already marked this as watched.'
                  : 'No need to add it again.'}
              </p>
              <Link
                href="/backlog"
                className="mt-2 inline-block text-sm text-accent transition-colors hover:brightness-110"
              >
                View in backlog
              </Link>
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={Boolean(duplicate)}
              className="btn-primary disabled:opacity-60"
            >
              {duplicate ? 'Already in your backlog' : "Yes, that's it"}
            </button>
            <Link href="/add" className="btn-secondary">
              Not quite, let me search
            </Link>
          </div>
        </div>
      )}

      {phase === 'select' && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-accent">
            We found {guesses.length} titles
          </p>
          <p className="mb-4 text-sm text-muted">
            Uncheck anything you don&apos;t want to add.
          </p>
          <ul className="mb-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {guesses.map((hit) => {
              const key = titleKey(hit.name, hit.media_type)
              const already = findDuplicateInList(
                existingTitles,
                hit.name,
                hit.media_type,
              )
              const checked = already ? false : selectedKeys.has(key)
              return (
                <li key={key}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 px-3 py-3 ${
                      already ? 'cursor-not-allowed bg-page/60 opacity-60' : 'bg-surface'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={Boolean(already)}
                      onChange={() => toggleSelected(hit)}
                      className="mt-1 h-4 w-4 accent-accent"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-fg">{hit.name}</span>
                      <span className="block text-sm text-muted">
                        {mediaLabel(hit.media_type)}
                      </span>
                      {already ? (
                        <span className="mt-1 block text-xs text-muted">
                          Already in your backlog
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
          {error && phase === 'select' ? (
            <p className="mb-3 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void handleAddSelected()}
              disabled={selectedKeys.size === 0}
              className="btn-primary disabled:opacity-60"
            >
              {selectedKeys.size === 0 ? 'Select a title to add' : addLabel}
            </button>
            <Link href="/add" className="btn-secondary">
              Not quite, let me search
            </Link>
          </div>
          {selectableCount === 0 ? (
            <p className="mt-3 text-xs text-muted">
              Every title here is already in your backlog.
            </p>
          ) : null}
        </div>
      )}

      {phase === 'saving' && (
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="h-7 w-7 animate-spin text-accent" aria-hidden />
          <p className="text-center text-sm text-muted">Adding titles to your backlog…</p>
        </div>
      )}

      {phase === 'success' && (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-lg font-medium text-fg">
            {addedCount === 1
              ? '1 title added to your backlog'
              : `${addedCount} titles added to your backlog`}
          </p>
          <p className="mt-2 text-sm text-muted">Taking you home…</p>
        </div>
      )}

      {phase === 'fallback' && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-2 font-medium text-fg">{fallbackTitle}</p>
          <p className="mb-4 text-sm text-muted">{fallbackBody}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {inputMode === 'reel' ? (
              <button
                type="button"
                onClick={() => {
                  setPhase('idle')
                  setError(null)
                  setErrorKind(null)
                }}
                className="btn-secondary"
              >
                Try another link
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary"
              >
                Try another image
              </button>
            )}
            <Link href="/add" className="btn-primary">
              Search manually
            </Link>
          </div>
        </div>
      )}

      {phase !== 'idle' && phase !== 'loading' && phase !== 'saving' && (
        <button
          type="button"
          onClick={resetToIdle}
          className="text-sm text-white transition-colors hover:brightness-110"
        >
          Start over
        </button>
      )}
    </div>
  )
}
