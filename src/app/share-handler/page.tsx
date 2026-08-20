import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/AppHeader'
import { ShareHandlerClient } from '@/components/ShareHandlerClient'
import { fetchUserTitles } from '@/lib/titles/api'
import { createClient } from '@/lib/supabase/server'

export default async function ShareHandlerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: titles } = await fetchUserTitles(supabase, user.id)

  return (
    <main className="mx-auto max-w-md px-5 pb-12 pt-6">
      <AppHeader email={user.email ?? ''} />
      <h1 className="mb-6 text-xl font-medium text-fg">From screenshot</h1>
      <ShareHandlerClient existingTitles={titles ?? []} />
    </main>
  )
}
