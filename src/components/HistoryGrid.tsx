'use client'

import { useMemo, useState } from 'react'
import { MediaTypeTabs, type MediaTypeTab } from '@/components/MediaTypeTabs'
import { TitleGrid } from '@/components/TitleGrid'
import { useBacklogTitles } from '@/hooks/useBacklogTitles'
import type { Title } from '@/types/database'

type HistoryGridProps = {
  titles: Title[]
}

function historyEmptyMessage(mediaType: MediaTypeTab): string {
  if (mediaType === 'movie') return 'No movies marked as watched yet.'
  if (mediaType === 'show') return 'No shows marked as watched yet.'
  if (mediaType === 'book') return 'No books marked as read yet.'
  return 'Nothing marked as watched or read yet.'
}

/** Done titles only: movies/shows watched and books read. */
export function HistoryGrid({ titles: initialTitles }: HistoryGridProps) {
  const { titles, handleTitleUpdate } = useBacklogTitles(initialTitles)
  const [mediaType, setMediaType] = useState<MediaTypeTab>('all')

  const filtered = useMemo(() => {
    return titles.filter((title) => {
      if (title.status !== 'done') return false
      if (mediaType !== 'all' && title.media_type !== mediaType) return false
      return true
    })
  }, [titles, mediaType])

  return (
    <div>
      <div className="mb-6">
        <MediaTypeTabs value={mediaType} onChange={setMediaType} />
      </div>

      <TitleGrid
        titles={filtered}
        emptyMessage={historyEmptyMessage(mediaType)}
        emptyAction={null}
        onTitleUpdate={handleTitleUpdate}
      />
    </div>
  )
}
