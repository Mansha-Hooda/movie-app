'use client'

import { useMemo, useState } from 'react'
import { MediaTypeTabs, type MediaTypeTab } from '@/components/MediaTypeTabs'
import { TitleGrid } from '@/components/TitleGrid'
import { UndoWatchedToast } from '@/components/UndoWatchedToast'
import { WatchedProgress } from '@/components/WatchedProgress'
import { useBacklogTitles } from '@/hooks/useBacklogTitles'
import { filterTitles } from '@/lib/titles/filter'
import type { Title } from '@/types/database'

type BacklogGridProps = {
  titles: Title[]
}

/** Full backlog list with media-type tabs (client-side filter only). */
export function BacklogGrid({ titles: initialTitles }: BacklogGridProps) {
  const {
    titles,
    handleTitleUpdate,
    undo,
    undoWatched,
    dismissUndo,
    watchedCount,
    totalCount,
  } = useBacklogTitles(initialTitles)
  const [mediaType, setMediaType] = useState<MediaTypeTab>('all')

  const filtered = useMemo(
    () => filterTitles(titles, { moods: [], mediaType }),
    [titles, mediaType],
  )

  const emptyMessage =
    mediaType === 'all'
      ? 'Your backlog is empty — add something to watch or read.'
      : `No ${mediaType === 'movie' ? 'movies' : mediaType === 'show' ? 'shows' : 'books'} in your backlog yet.`

  return (
    <div>
      <WatchedProgress watchedCount={watchedCount} totalCount={totalCount} />

      <div className="mb-6 mt-4">
        <MediaTypeTabs value={mediaType} onChange={setMediaType} />
      </div>

      <TitleGrid
        titles={filtered}
        emptyMessage={emptyMessage}
        emptyAction={
          mediaType === 'all'
            ? { href: '/add', label: 'Add your first title' }
            : { href: '/add', label: 'Add a title' }
        }
        onTitleUpdate={handleTitleUpdate}
      />

      <UndoWatchedToast undo={undo} onUndo={undoWatched} onDismiss={dismissUndo} />
    </div>
  )
}
