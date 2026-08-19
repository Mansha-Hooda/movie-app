import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/AppHeader'
import { HistoryGrid } from '@/components/HistoryGrid'
import { fetchUserTitles } from '@/lib/titles/api'
import { createClient } from '@/lib/supabase/server'

export default async function HistoryPage() {
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
          Failed to load history: {error.message}
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-5 pb-24 pt-6">
      <AppHeader email={user.email ?? ''} />
      <h1 className="mb-6 text-xl font-medium text-fg">History</h1>
      <HistoryGrid titles={titles ?? []} />
    </main>
  )
}
