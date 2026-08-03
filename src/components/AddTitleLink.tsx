import Link from 'next/link'

type AddTitleLinkProps = {
  variant?: 'fab' | 'link'
}

export function AddTitleLink({ variant = 'fab' }: AddTitleLinkProps) {
  if (variant === 'link') {
    return (
      <Link href="/add" className="text-sm text-gray-700 underline">
        Add title
      </Link>
    )
  }

  return (
    <Link
      href="/add"
      className="fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-2xl text-white shadow-md"
      aria-label="Add title"
    >
      +
    </Link>
  )
}
