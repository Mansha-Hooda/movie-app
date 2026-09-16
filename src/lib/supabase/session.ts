import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

/** Cookie JWT only — no Auth HTTP round-trip. */
export async function getSessionUser(): Promise<{
  user: User | null
}> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return { user: session?.user ?? null }
}
