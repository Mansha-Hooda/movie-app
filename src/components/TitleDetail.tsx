'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { PosterImage } from '@/components/PosterImage'
import { createClient } from '@/lib/supabase/client'
import { updateTitleStatus } from '@/lib/titles/api'
import { commitmentLabel, formatAddedDate, MEDIA_TYPES } from '@/lib/titles/constants'
import { moodLabel } from '@/lib/titles/moods'
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

export function TitleDetail({ title, onClose, onUpdate }: TitleDetailProps) {
  const [updating, setUpdating] = useState(false)

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
      className="fixed inset-0 z-50 flex flex-col bg-page/80 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
        <div
          className="relative mx-auto flex max-h-svh w-full max-w-md flex-col overflow-y-auto px-5 pb-10 pt-4"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="mb-4 ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted transition duration-150 hover:text-fg active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>

          <PosterImage title={title} layoutId={`poster-${title.id}`} className="w-full" />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.2 }}
            className="mt-5"
          >
            <h2 className="text-xl font-medium text-fg">{title.name}</h2>
            <p className="mt-1 text-sm text-muted">{formatAddedDate(title.date_added)}</p>

            <button
              type="button"
              disabled={updating}
              onClick={handleMarkDone}
              className="btn-primary mt-5 w-full py-3"
            >
              {updating ? 'Saving…' : doneLabel}
            </button>

            <div className="mt-6">
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
