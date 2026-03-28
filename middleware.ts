import { NextRequest, NextResponse } from 'next/server'

/**
 * Auth middleware — protects /dashboard and /api/* routes.
 *
 * Public routes that bypass authentication:
 *   /                    — landing page
 *   /login               — login page
 *   /auth/callback        — Supabase OAuth callback
 *   /api/stripe/webhook  — Stripe webhook (verified by signature, not JWT)
 *   /_next/*             — Next.js internals / static assets
 *   /favicon.ico         — favicon
 */

const PUBLIC_ROUTES = new Set(['/', '/login', '/auth/callback'])
const PUBLIC_API_ROUTES = new Set(['/api/stripe/webhook'])

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true
  if (PUBLIC_API_ROUTES.has(pathname)) return true
  // Allow Next.js internals and static files
  if (pathname.startsWith('/_next')) return true
  if (pathname.startsWith('/favicon')) return true
  // Allow non-protected routes (only /dashboard and /api need protection)
  if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/api')) return true
  return false
}

function getAuthToken(request: NextRequest): string | null {
  // 1. Check Authorization header
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim()
    if (token) return token
  }

  // 2. Check Supabase auth cookies (sb-*-auth-token or sb-access-token)
  for (const [name, cookie] of request.cookies.getAll().map(c => [c.name, c] as const)) {
    if (name.includes('-auth-token') || name === 'sb-access-token') {
      // Supabase stores the token as a base64 JSON array; the first element is the access token
      try {
        const parsed = JSON.parse(cookie.value)
        if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
          return parsed[0]
        }
      } catch {
        // May be a plain token string
        if (cookie.value) return cookie.value
      }
    }
  }

  return null
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes through
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  const token = getAuthToken(request)

  if (!token) {
    // API routes: return 401 JSON
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Page routes: redirect to /login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Token exists — let the request through.
  // Individual API routes still verify the token via requireAuth().
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files.
     * This ensures the middleware runs on page and API routes.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
