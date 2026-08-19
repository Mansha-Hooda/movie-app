'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleUser } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type AppHeaderProps = {
  email: string
}

export function AppHeader({ email }: AppHeaderProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function handleLogout() {
    setOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="relative mb-6 flex items-center justify-between">
      <Link href="/" className="text-lg font-medium tracking-tight text-fg">
        Backlog
      </Link>

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors duration-200 hover:border-accent hover:text-accent active:scale-95"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
        >
          <CircleUser className="h-5 w-5" strokeWidth={1.75} />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 z-40 mt-2 w-56 origin-top-right rounded-xl border border-border bg-surface py-1 shadow-lg"
          >
            <p className="truncate px-3 py-2.5 text-sm text-fg">{email || 'Signed in'}</p>
            <Link
              href="/history"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-sm text-fg transition-colors duration-150 hover:bg-page hover:text-accent"
            >
              History
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="block w-full px-3 py-2.5 text-left text-sm text-danger transition-colors duration-150 hover:bg-page"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
