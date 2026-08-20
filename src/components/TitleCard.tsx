'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpen, Check, Clapperboard, MoreVertical, Tv } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateTitleStatus } from '@/lib/titles/api'
import { MEDIA_TYPES, WATCH_LATER_OPTIONS } from '@/lib/titles/constants'
import type { Title } from '@/types/database'

type TitleCardProps = {
  title: Title
  onUpdate?: (title: Title) => void
  onDelete?: (title: Title) => void
}

function TypeIcon({ type }: { type: Title['media_type'] }) {
  const className = 'h-4 w-4 text-fg/80'
  if (type === 'show') return <Tv className={className} strokeWidth={1.75} />
  if (type === 'book') return <BookOpen className={className} strokeWidth={1.75} />
  return <Clapperboard className={className} strokeWidth={1.75} />
}

export function TitleCard({ title: initialTitle, onUpdate, onDelete }: TitleCardProps) {
  const [title, setTitle] = useState(initialTitle)
  const [updating, setUpdating] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
        setConfirmDelete(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [menuOpen])

  function commitUpdate(next: Title) {
    setTitle(next)
    onUpdate?.(next)
  }

  async function handleMarkDone() {
    if (updating) return

    const previous = title
    setUpdating(true)
    commitUpdate({ ...title, status: 'done' })

    const supabase = createClient()
    const { error: updateError } = await updateTitleStatus(supabase, title.id, 'done')

    setUpdating(false)

    if (updateError) {
      commitUpdate(previous)
    }
  }

  function handleDeleteClick() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    setMenuOpen(false)
    setConfirmDelete(false)
    onDelete?.(title)
  }

  const watchLaterLabel =
    WATCH_LATER_OPTIONS.find((option) => option.value === title.time_commitment)?.label ??
    title.time_commitment ??
    '—'
  const typeLabel =
    MEDIA_TYPES.find((option) => option.value === title.media_type)?.label ??
    title.media_type ??
    '—'
  const doneLabel = title.media_type === 'book' ? 'Read' : 'Watched'

  return (
    <article className="flex h-full flex-col">
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

        <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-page/85 via-page/40 to-transparent p-2 pt-8">
          <button
            type="button"
            disabled={updating}
            onClick={handleMarkDone}
            className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-accent/90 px-3 py-1.5 text-xs font-medium text-ink backdrop-blur-[2px] transition duration-150 hover:brightness-110 active:scale-95 disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
            {doneLabel}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="More actions"
              aria-expanded={menuOpen}
              onClick={() => {
                setMenuOpen((open) => !open)
                setConfirmDelete(false)
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-page/55 text-fg backdrop-blur-[2px] transition duration-150 hover:bg-page/75 active:scale-95"
            >
              <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 bottom-11 z-20 min-w-[9.5rem] overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
                {confirmDelete ? (
                  <div className="px-3 py-2">
                    <p className="mb-2 text-xs text-muted">Delete this title?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteClick}
                        className="text-xs text-danger transition-colors hover:brightness-110"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="text-xs text-muted transition-colors hover:text-fg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="block w-full px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-page"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <h2 className="h-[2.6em] text-[0.95rem] font-medium leading-snug text-fg line-clamp-2">
        {title.name}
      </h2>
      <p className="mt-0.5 text-sm text-muted">
        {watchLaterLabel} · {typeLabel}
      </p>
    </article>
  )
}
