'use client'

import { useEffect, useState } from 'react'
import { motion, useDragControls, type PanInfo } from 'framer-motion'
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
  const dragControls = useDragControls()

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
        // Year is optional — keep the sheet usable without it.
      }
    }

    void loadYear()
    return () => {
      cancelled = true
    }
  }, [title])

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.y > 90 || info.velocity.y > 650) {
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center text-fg"
      >
        <ChevronDown className="h-7 w-7" strokeWidth={1.75} />
      </button>

      <div
        className="flex min-h-0 flex-1 items-center justify-center px-4 pb-3 pt-14"
        onClick={(event) => event.stopPropagation()}
      >
        {title.poster_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={title.poster_url}
            alt=""
            className="max-h-full w-auto max-w-full object-contain"
          />
        ) : (
          <div
            className="aspect-[2/3] h-full max-h-full w-auto rounded-xl"
            style={{
              background:
                'linear-gradient(160deg, #2a2633 0%, #1c1a20 45%, #332f3d 100%)',
            }}
          />
        )}
      </div>

      <motion.div
        className="relative z-10 max-h-[52svh] overflow-y-auto rounded-t-3xl bg-surface px-5 pb-8 pt-2"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.45 }}
        onDragEnd={handleDragEnd}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="flex cursor-grab justify-center py-2 active:cursor-grabbing"
          onPointerDown={(event) => dragControls.start(event)}
        >
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        <h2 className="text-xl font-medium text-fg">
          {title.name}
          {year ? <span className="font-normal text-muted"> ({year})</span> : null}
        </h2>
        <p className="mt-1 text-sm text-muted">{formatAddedDate(title.date_added)}</p>

        <button
          type="button"
          disabled={updating}
          onClick={handleMarkDone}
          className="btn-primary mt-5 w-full py-3"
        >
          {updating ? 'Saving…' : doneLabel}
        </button>

        <div className="mt-4">
          <MetaRow label="Type" value={typeLabel} />
          {title.suggested_by && (
            <MetaRow label="Suggested by" value={title.suggested_by} />
          )}
          {moodText && <MetaRow label="Mood" value={moodText} />}
          {title.genre && <MetaRow label="Genre" value={title.genre} />}
          <MetaRow label="When" value={commitmentLabel(title.time_commitment)} />
        </div>
      </motion.div>
    </motion.div>
  )
}
