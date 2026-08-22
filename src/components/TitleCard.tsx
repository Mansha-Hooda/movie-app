'use client'

import { useEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import { PosterImage } from '@/components/PosterImage'
import { commitmentLabel, formatAddedDate } from '@/lib/titles/constants'
import type { Title } from '@/types/database'

type TitleCardProps = {
  title: Title
  onOpen?: (title: Title) => void
  onDelete?: (title: Title) => void
}

export function TitleCard({ title, onOpen, onDelete }: TitleCardProps) {
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

  function handleDeleteClick() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    setMenuOpen(false)
    setConfirmDelete(false)
    onDelete?.(title)
  }

  return (
    <article className="flex h-full flex-col">
      <button
        type="button"
        onClick={() => onOpen?.(title)}
        className="mb-2.5 w-full text-left"
        aria-label={`Open ${title.name}`}
      >
        <PosterImage title={title} layoutId={`poster-${title.id}`} />
      </button>

      <h2 className="truncate text-[0.95rem] font-medium text-fg">{title.name}</h2>
      <p className="mt-0.5 text-sm text-muted">{commitmentLabel(title.time_commitment)}</p>

      <div className="mt-2 flex items-center gap-1.5">
        <p className="min-w-0 flex-1 truncate text-sm text-muted">
          {formatAddedDate(title.date_added)}
        </p>

        <div
          className="relative"
          ref={menuRef}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            aria-label="More actions"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((open) => !open)
              setConfirmDelete(false)
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted transition duration-150 hover:text-fg active:scale-95"
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
    </article>
  )
}
