import { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware — protects API routes only.
 *
 * Page-level auth (e.g. /dashboard) is handled client-side by Supabase JS SDK.
 * Middleware only guards /api/* routes that need server-side token validation.
 */

const PUBLIC_API_ROUTES = new Set(['/api/payments/webhook'])

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /api routes (not pages)
  if (!pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Allow public API routes
  if (PUBLIC_API_ROUTES.has(pathname)) {
    return NextResponse.next()
  }

  // Check for auth token in API requests
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
