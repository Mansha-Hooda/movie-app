import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Refresh the JWT with Auth when it expires within this window. */
const REFRESH_MARGIN_SEC = 120

/**
 * Route guard without a network round-trip on every request.
 * Uses the cookie JWT when it is still valid; calls getUser() only to refresh
 * a token that is expired or about to expire.
 */
async function getGuardUser(
  supabase: ReturnType<typeof createServerClient>,
) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return null
  }

  const expiresAt = session.expires_at ?? 0
  const now = Math.floor(Date.now() / 1000)
  if (expiresAt - now > REFRESH_MARGIN_SEC) {
    return session.user
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/** Refreshes the auth session when needed and enforces route protection. */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const user = await getGuardUser(supabase)

  const { pathname } = request.nextUrl
  const isLoginPage = pathname === '/login'
  const isAuthCallback = pathname.startsWith('/auth/callback')
  const isPublicRoute = isLoginPage || isAuthCallback

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
