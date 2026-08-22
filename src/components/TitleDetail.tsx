'use client'

import { useEffect, useState } from 'react'
import { motion, type PanInfo } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateTitleStatus } from '@/lib/titles/api'
import { commitmentLabel, formatAddedDate, MEDIA_TYPES } from '@/lib/titles/constants'
import { moodLabel } from '@/lib/titles/moods'
import type { SearchResult } from '@/lib/enrichment/types'
import type { Title } from '@/types/database'

type TitleDetailProps = {
  title: Title
  onClose: () => void
  onUpdate?: (title: Title) => void
}

const PLAYER_SPRING = { type: 'spring' as const, stiffness: 420, damping: 38, mass: 0.85 }

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span className="shrink-0 text-sm text-muted">{label}</span>
      <span className="text-right text-sm text-fg">{value}</span>
    </div>
  )
}

function matchReleaseYear(title: Title, results: SearchResult[]): string | null {
  const normalized = title.name.trim().toLowerCase()
  const exact = results.find((result) => result.name.trim().toLowerCase() === normalized)
  return exact?.year ?? null
}

export function TitleDetail({ title, onClose, onUpdate }: TitleDetailProps) {
  const [updating, setUpdating] = useState(false)
  const [year, setYear] = useState<string | null>(null)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  useEffect(() => {
    let cancelled = false

    async function loadYear() {
      try {
        const params = new URLSearchParams({
          q: title.name,
          media_type: title.media_type,
        })
        const response = await fetch(`/api/search-title?${params}`)
        if (!response.ok) return
        const data = (await response.json()) as { results?: SearchResult[] }
        if (cancelled) return
        setYear(matchReleaseYear(title, data.results ?? []))
      } catch {
        // Year is optional.
      }
    }

    void loadYear()
    return () => {
      cancelled = true
    }
  }, [title])

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.y > 110 || info.velocity.y > 700) {
      onClose()
    }
  }

  async function handleMarkDone() {
    if (updating) return

    setUpdating(true)
    onClose()

    const next = { ...title, status: 'done' as const }
    onUpdate?.(next)

    const supabase = createClient()
    const { error } = await updateTitleStatus(supabase, title.id, 'done')
    setUpdating(false)

    if (error) {
      onUpdate?.(title)
    }
  }

  const typeLabel =
    MEDIA_TYPES.find((option) => option.value === title.media_type)?.label ?? title.media_type
  const doneLabel = title.media_type === 'book' ? 'Mark as Read' : 'Mark as Watched'
  const moodText =
    title.mood_tags.length > 0 ? title.mood_tags.map(moodLabel).join(', ') : null

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-page"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={PLAYER_SPRING}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.02, bottom: 0.55 }}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
    >
      <div className="flex shrink-0 justify-center pt-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-12 items-center justify-center text-fg"
        >
          <ChevronDown className="h-7 w-7" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-6 pb-10">
        <motion.div
          className="mx-auto flex w-full max-w-sm flex-1 items-center justify-center py-4"
          initial={{ scale: 0.88, opacity: 0.65 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={PLAYER_SPRING}
        >
          {title.poster_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={title.poster_url}
              alt=""
              draggable={false}
              className="max-h-[46svh] w-full rounded-xl object-contain shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
            />
          ) : (
            <div
              className="aspect-[2/3] w-full max-h-[46svh] rounded-xl"
              style={{
                background:
                  'linear-gradient(160deg, #2a2633 0%, #1c1a20 45%, #332f3d 100%)',
              }}
            />
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.28, ease: 'easeOut' }}
        >
          <h2 className="text-2xl font-medium tracking-tight text-fg">
            {title.name}
            {year ? <span className="font-normal text-muted"> ({year})</span> : null}
          </h2>
          <p className="mt-1 text-sm text-muted">{formatAddedDate(title.date_added)}</p>

          <button
            type="button"
            disabled={updating}
            onClick={handleMarkDone}
            className="btn-primary mt-6 w-full py-3"
          >
            {updating ? 'Saving…' : doneLabel}
          </button>

          <div className="mt-5">
            <MetaRow label="Type" value={typeLabel} />
            {title.suggested_by && (
              <MetaRow label="Suggested by" value={title.suggested_by} />
            )}
            {moodText && <MetaRow label="Mood" value={moodText} />}
            {title.genre && <MetaRow label="Genre" value={title.genre} />}
            <MetaRow label="When" value={commitmentLabel(title.time_commitment)} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
