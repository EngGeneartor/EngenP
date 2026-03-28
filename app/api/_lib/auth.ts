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

// ---------------------------------------------------------------------------
// In-memory rate limiter (IP + userId combo, 60 requests per minute)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number
  resetAt: number // epoch ms
}

const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 60

/** Map keyed by "ip:userId" or just "ip" */
const rateLimitStore = new Map<string, RateLimitEntry>()

/** Periodically prune expired entries to prevent memory leaks. */
let lastPruneAt = Date.now()
function pruneExpired() {
  const now = Date.now()
  if (now - lastPruneAt < RATE_LIMIT_WINDOW_MS) return
  lastPruneAt = now
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) rateLimitStore.delete(key)
  }
}

/**
 * Check whether a request is within the rate limit.
 *
 * @param req  The incoming request (IP is extracted from headers)
 * @param userId  Optional authenticated user id for per-user tracking
 * @returns `{ allowed, headers }` — if not allowed the caller should
 *          return a 429 response with the provided headers.
 */
export function checkRateLimit(
  req: NextRequest,
  userId?: string
): { allowed: boolean; headers: Headers } {
  pruneExpired()

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  const key = userId ? `${ip}:${userId}` : ip
  const now = Date.now()

  let entry = rateLimitStore.get(key)
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
    rateLimitStore.set(key, entry)
  }

  entry.count += 1
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count)
  const allowed = entry.count <= RATE_LIMIT_MAX

  const headers = new Headers({
    'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.floor(entry.resetAt / 1000)),
  })

  return { allowed, headers }
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
