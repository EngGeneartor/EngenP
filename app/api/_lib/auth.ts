import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkUsageLimit } from '@/lib/services/usage-tracker'
import type { UsageAction, UsageLimitResult } from '@/lib/services/usage-tracker'

export interface AuthUser {
  id: string
  email?: string
}

// Re-export so API routes don't need a second import
export type { UsageAction, UsageLimitResult }

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

/**
 * Check whether the authenticated user is within their usage limits for the
 * given action. Returns a 429 Response if the limit is exceeded; otherwise
 * returns the UsageLimitResult so the caller can include it in response
 * headers or log it.
 *
 * Intended usage in API routes:
 *
 *   const limitCheck = await checkUsageLimitMiddleware(user.id, 'generate')
 *   if (limitCheck instanceof Response) return limitCheck
 *   // proceed...
 */
export async function checkUsageLimitMiddleware(
  userId: string,
  action: UsageAction
): Promise<UsageLimitResult | Response> {
  const result = await checkUsageLimit(userId, action)

  if (!result.allowed) {
    return new NextResponse(
      JSON.stringify({
        error:
          action === 'generate'
            ? `이번 달 문제 생성 한도(${result.limit}회)에 도달했습니다. Pro 플랜으로 업그레이드하면 무제한으로 사용할 수 있습니다.`
            : `이번 달 내보내기 한도(${result.limit}회)에 도달했습니다. Pro 플랜으로 업그레이드하면 무제한으로 사용할 수 있습니다.`,
        used: result.used,
        limit: result.limit,
        plan: result.plan,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-Usage-Used': String(result.used),
          'X-Usage-Limit': String(result.limit),
          'X-Usage-Plan': result.plan,
          ...rateLimitHeaders(),
        },
      }
    )
  }

  return result
}
