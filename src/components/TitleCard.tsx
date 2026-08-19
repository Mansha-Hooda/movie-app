'use client'

import { useState } from 'react'
import { BookOpen, Clapperboard, Tv } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateTitleStatus } from '@/lib/titles/api'
import { TIME_COMMITMENTS, TITLE_STATUSES } from '@/lib/titles/constants'
import type { Title, TitleStatus } from '@/types/database'

type TitleCardProps = {
  title: Title
  onUpdate?: (title: Title) => void
}

function TypeIcon({ type }: { type: Title['media_type'] }) {
  const className = 'h-4 w-4 text-fg/80'
  if (type === 'show') return <Tv className={className} strokeWidth={1.75} />
  if (type === 'book') return <BookOpen className={className} strokeWidth={1.75} />
  return <Clapperboard className={className} strokeWidth={1.75} />
}

export function TitleCard({ title: initialTitle, onUpdate }: TitleCardProps) {
  const [title, setTitle] = useState(initialTitle)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  function commitUpdate(next: Title) {
    setTitle(next)
    onUpdate?.(next)
  }

  async function handleStatusChange(status: TitleStatus) {
    const previous = title
    setError(null)
    setUpdating(true)
    commitUpdate({ ...title, status })

    const supabase = createClient()
    const { error: updateError } = await updateTitleStatus(supabase, title.id, status)

    setUpdating(false)

    if (updateError) {
      commitUpdate(previous)
      setError(updateError.message)
    }
  }

  const timeLabel =
    TIME_COMMITMENTS.find((option) => option.value === title.time_commitment)?.label ??
    title.time_commitment

  return (
    <article className="active:scale-95 transition-transform duration-150 ease-out">
      <div className="relative mb-2.5 overflow-hidden rounded-xl bg-surface">
        {title.poster_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={title.poster_url}
            alt=""
            className="aspect-[2/3] w-full object-cover"
          />
        ) : (
          <div
            className="aspect-[2/3] w-full"
            style={{
              background:
                'linear-gradient(160deg, #2a2633 0%, #1c1a20 45%, #332f3d 100%)',
            }}
          />
        )}
        <span className="absolute top-2 right-2 rounded-full bg-page/55 p-1.5 backdrop-blur-[2px]">
          <TypeIcon type={title.media_type} />
        </span>
      </div>

      <h2 className="text-[0.95rem] font-medium leading-snug text-fg">{title.name}</h2>
      <p className="mt-0.5 text-sm text-muted">
        {timeLabel} · {title.media_type}
      </p>

      <label htmlFor={`status-${title.id}`} className="sr-only">
        Status
      </label>
      <select
        id={`status-${title.id}`}
        value={title.status}
        disabled={updating}
        onChange={(event) => handleStatusChange(event.target.value as TitleStatus)}
        className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1 text-xs text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/35 disabled:opacity-60"
      >
        {TITLE_STATUSES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p className="mt-1 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </article>
  )
}
