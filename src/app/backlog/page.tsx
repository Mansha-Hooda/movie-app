import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { AddTitleLink } from '@/components/AddTitleLink'
import { AppHeader } from '@/components/AppHeader'
import { BacklogGrid } from '@/components/BacklogGrid'
import { PageSkeleton } from '@/components/PageSkeleton'
import { fetchUserTitles } from '@/lib/titles/api'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/session'

async function BacklogTitles({ userId }: { userId: string }) {
  const supabase = await createClient()
  const { data: titles, error } = await fetchUserTitles(supabase, userId)

  if (error) {
    return (
      <p className="text-danger" role="alert">
        Failed to load titles: {error.message}
      </p>
    )
  }

  return <BacklogGrid titles={titles ?? []} />
}

export default async function BacklogPage() {
  const { user } = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="mx-auto max-w-lg px-5 pb-24 pt-6">
      <AppHeader email={user.email ?? ''} />
      <h1 className="mb-6 text-xl font-medium text-fg">Full backlog</h1>
      <Suspense fallback={<PageSkeleton heading="Full backlog" showHeader={false} />}>
        <BacklogTitles userId={user.id} />
      </Suspense>
      <AddTitleLink />
    </main>
  )
}
