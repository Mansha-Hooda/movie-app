import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function cookieOptions(options: Record<string, unknown> | undefined) {
  return {
    ...options,
    path: typeof options?.path === 'string' ? options.path : '/',
    sameSite: (options?.sameSite as 'lax' | 'strict' | 'none' | undefined) ?? 'lax',
    secure: typeof options?.secure === 'boolean' ? options.secure : process.env.NODE_ENV === 'production',
  }
}

/**
 * Exchanges the magic-link PKCE code for a session and redirects home.
 * Session cookies are written onto the redirect response so the following
 * request (including an Android PWA / Custom Tab hop) actually has them.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/'
  const next = nextParam.startsWith('/') ? nextParam : '/'

  const forwardedHost = request.headers.get('x-forwarded-host')
  const base =
    process.env.NODE_ENV === 'development'
      ? origin
      : `https://${forwardedHost ?? new URL(origin).host}`

  if (!code) {
    return NextResponse.redirect(`${base}/login?error=auth`)
  }

  const redirectResponse = NextResponse.redirect(`${base}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, cookieOptions(options))
          })
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${base}/login?error=auth`)
  }

  return redirectResponse
}
