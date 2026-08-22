'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import { TitleCard } from '@/components/TitleCard'
import { TitleDetail } from '@/components/TitleDetail'
import type { Title } from '@/types/database'

type TitleGridProps = {
  titles: Title[]
  emptyMessage?: string
  /** Pass null to hide the empty-state action button. */
  emptyAction?: { href: string; label: string } | null
  onTitleUpdate?: (title: Title) => void
  onTitleDelete?: (title: Title) => void
}

const DEFAULT_EMPTY_ACTION = {
  href: '/add',
  label: 'Add your first title',
}

export function TitleGrid({
  titles,
  emptyMessage = 'Your backlog is empty — add something to watch or read.',
  emptyAction = DEFAULT_EMPTY_ACTION,
  onTitleUpdate,
  onTitleDelete,
}: TitleGridProps) {
  const [selected, setSelected] = useState<Title | null>(null)
  const selectedRef = useRef<Title | null>(null)

  const closeDetail = useCallback(() => {
    if (selectedRef.current && window.history.state?.titleDetail) {
      window.history.back()
      return
    }

    selectedRef.current = null
    setSelected(null)
  }, [])

  useEffect(() => {
    function onPopState() {
      selectedRef.current = null
      setSelected(null)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function openDetail(title: Title) {
    selectedRef.current = title
    setSelected(title)
    window.history.pushState({ titleDetail: title.id }, '')
  }

  if (titles.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="mb-4 text-muted">{emptyMessage}</p>
        {emptyAction && (
          <Link
            href={emptyAction.href}
            className="inline-block rounded-full bg-accent px-4 py-2 text-sm text-ink transition duration-150 hover:brightness-110 active:scale-95"
          >
            {emptyAction.label}
          </Link>
        )}
      </div>
    )
  }

  const selectedTitle = selected
    ? (titles.find((title) => title.id === selected.id) ?? selected)
    : null

  return (
    <LayoutGroup>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6">
        {titles.map((title) => (
          <TitleCard
            key={title.id}
            title={title}
            onOpen={openDetail}
            onDelete={onTitleDelete}
          />
        ))}
      </div>

      <AnimatePresence>
        {selectedTitle && (
          <TitleDetail
            title={selectedTitle}
            onClose={closeDetail}
            onUpdate={onTitleUpdate}
          />
        )}
      </AnimatePresence>
    </LayoutGroup>
  )
}
