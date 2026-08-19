import { redirect } from 'next/navigation'
import { AddTitleLink } from '@/components/AddTitleLink'
import { AppHeader } from '@/components/AppHeader'
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
      <main className="mx-auto max-w-lg px-5 py-8">
        <AppHeader email={user.email ?? ''} />
        <p className="text-danger" role="alert">
          Failed to load titles: {error.message}
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-5 pb-24 pt-6">
      <AppHeader email={user.email ?? ''} />
      <WhatFitsNow initialTitles={titles ?? []} />
      <AddTitleLink />
    </main>
  )
}
