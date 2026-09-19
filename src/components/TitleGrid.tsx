'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { AnimatePresence } from 'framer-motion'
import { TitleCard } from '@/components/TitleCard'
import type { Title } from '@/types/database'

const TitleDetail = dynamic(() => import('@/components/TitleDetail'), {
  ssr: false,
})

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
      <div className="rounded-xl bg-surface p-8 text-center">
        <p className="mb-4 text-muted">{emptyMessage}</p>
        {emptyAction && (
          <Link
            href={emptyAction.href}
            className="btn-primary"
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
    <>
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
        {selectedTitle ? (
          <TitleDetail
            key={selectedTitle.id}
            title={selectedTitle}
            onClose={closeDetail}
            onUpdate={onTitleUpdate}
          />
        ) : null}
      </AnimatePresence>
    </>
  )
}
