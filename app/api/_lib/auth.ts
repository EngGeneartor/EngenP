import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export interface AuthUser {
  id: string
  email?: string
}

/**
 * Extract and verify the Supabase JWT from the Authorization header.
 * Returns the authenticated user or throws a Response with status 401.
 */
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Response(
      JSON.stringify({ error: 'Missing or invalid Authorization header' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const token = authHeader.slice('Bearer '.length).trim()

  if (!token) {
    throw new Response(
      JSON.stringify({ error: 'No token provided' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const client = createServerClient(token)
  const { data: { user }, error } = await client.auth.getUser()

  if (error || !user) {
    throw new Response(
      JSON.stringify({ error: 'Invalid or expired token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return { id: user.id, email: user.email }
}

/**
 * Standard rate-limiting headers to include on API responses.
 * Actual enforcement would require a Redis/KV store; these headers
 * signal intent to clients and proxies.
 */
export function rateLimitHeaders(): Record<string, string> {
  return {
    'X-RateLimit-Limit': '60',
    'X-RateLimit-Remaining': '59',
    'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60),
  }
}
