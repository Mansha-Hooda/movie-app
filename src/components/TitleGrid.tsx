import Link from 'next/link'
import { TitleCard } from '@/components/TitleCard'
import type { Title } from '@/types/database'

type TitleGridProps = {
  titles: Title[]
  emptyMessage?: string
  /** Pass null to hide the empty-state action button. */
  emptyAction?: { href: string; label: string } | null
  onTitleUpdate?: (title: Title) => void
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
}: TitleGridProps) {
  if (titles.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="mb-4 text-gray-700">{emptyMessage}</p>
        {emptyAction && (
          <Link
            href={emptyAction.href}
            className="inline-block rounded-md bg-gray-900 px-4 py-2 text-sm text-white"
          >
            {emptyAction.label}
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {titles.map((title) => (
        <TitleCard key={title.id} title={title} onUpdate={onTitleUpdate} />
      ))}
    </div>
  )
}
