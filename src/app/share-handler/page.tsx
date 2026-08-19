import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShareHandlerClient } from '@/components/ShareHandlerClient'
import { createClient } from '@/lib/supabase/server'

export default async function ShareHandlerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-medium text-fg">From screenshot</h1>
        <Link href="/" className="text-sm text-accent transition-colors hover:brightness-110">
          Home
        </Link>
      </div>
      <ShareHandlerClient />
    </main>
  )
}
