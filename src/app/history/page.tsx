import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/AppHeader'
import { HistoryGrid } from '@/components/HistoryGrid'
import { PageSkeleton } from '@/components/PageSkeleton'
import { fetchUserTitles } from '@/lib/titles/api'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/session'

async function HistoryTitles({ userId }: { userId: string }) {
  const supabase = await createClient()
  const { data: titles, error } = await fetchUserTitles(supabase, userId)

  if (error) {
    return (
      <p className="text-danger" role="alert">
        Failed to load history: {error.message}
      </p>
    )
  }

  return <HistoryGrid titles={titles ?? []} />
}

export default async function HistoryPage() {
  const { user } = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="mx-auto max-w-lg px-5 pb-24 pt-6">
      <AppHeader email={user.email ?? ''} />
      <h1 className="mb-6 text-xl font-medium text-fg">History</h1>
      <Suspense fallback={<PageSkeleton heading="History" showHeader={false} />}>
        <HistoryTitles userId={user.id} />
      </Suspense>
    </main>
  )
}
