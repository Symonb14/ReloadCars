import { getSessionCookie } from 'better-auth/cookies'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Optimistic check: without a session cookie, go to /login. The real protection is
 * the API, which answers 401/403 on every /admin route.
 */
export function proxy(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === '/login'
  const hasSession = Boolean(getSessionCookie(request))

  if (!hasSession && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Everything except the API proxy, the MapLibre worker, Next internals and static files.
  matcher: [
    '/((?!backend|maplibre|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg)$).*)',
  ],
}
