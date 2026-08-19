import Link from 'next/link'

type AddTitleLinkProps = {
  variant?: 'fab' | 'link'
}

export function AddTitleLink({ variant = 'fab' }: AddTitleLinkProps) {
  if (variant === 'link') {
    return (
      <Link href="/add" className="text-xs text-muted transition-colors hover:text-accent">
        Add
      </Link>
    )
  }

  return (
    <Link
      href="/add"
      className="fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-2xl text-ink shadow-md transition duration-150 hover:brightness-110 active:scale-95"
      aria-label="Add title"
    >
      +
    </Link>
  )
}
