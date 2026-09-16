import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { AddTitleLink } from '@/components/AddTitleLink'
import { AppHeader } from '@/components/AppHeader'
import { PageSkeleton } from '@/components/PageSkeleton'
import { WhatFitsNow } from '@/components/WhatFitsNow'
import { fetchUserTitles } from '@/lib/titles/api'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/session'

async function HomeTitles({ userId }: { userId: string }) {
  const supabase = await createClient()
  const { data: titles, error } = await fetchUserTitles(supabase, userId)

  if (error) {
    return (
      <p className="text-danger" role="alert">
        Failed to load titles: {error.message}
      </p>
    )
  }

  return <WhatFitsNow userId={userId} initialTitles={titles ?? []} />
}

export default async function HomePage() {
  const { user } = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="mx-auto max-w-lg px-5 pb-24 pt-6">
      <AppHeader email={user.email ?? ''} />
      <Suspense fallback={<PageSkeleton showHeader={false} />}>
        <HomeTitles userId={user.id} />
      </Suspense>
      <AddTitleLink />
    </main>
  )
}
