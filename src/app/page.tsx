import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AddTitleLink } from '@/components/AddTitleLink'
import { LogoutButton } from '@/components/LogoutButton'
import { WhatFitsNow } from '@/components/WhatFitsNow'
import { fetchUserTitles } from '@/lib/titles/api'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: titles, error } = await fetchUserTitles(supabase, user.id)

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-8">
        <p className="text-accent" role="alert">
          Failed to load titles: {error.message}
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-5 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <p className="truncate text-xs text-muted">{user.email}</p>
        <nav className="flex shrink-0 items-center gap-3 text-xs text-muted">
          <Link href="/share-handler" className="transition-colors hover:text-accent">
            Screenshot
          </Link>
          <Link href="/backlog" className="transition-colors hover:text-accent">
            Backlog
          </Link>
          <AddTitleLink variant="link" />
          <LogoutButton />
        </nav>
      </header>

      <WhatFitsNow initialTitles={titles ?? []} />
      <AddTitleLink />
    </main>
  )
}
