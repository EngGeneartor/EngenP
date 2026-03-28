import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, rateLimitHeaders, checkUsageLimitMiddleware } from '../_lib/auth'
import { generateQuestions } from '@/lib/services/generator'
import { trackUsage } from '@/lib/services/usage-tracker'
import type { StructuredPassage, GenerationOptions } from '@/lib/services/generator'

export async function POST(request: NextRequest) {
  // Auth
  let user
  try {
    user = await requireAuth(request)
  } catch (errorResponse) {
    return errorResponse as Response
  }

  // Usage limit check
  const limitCheck = await checkUsageLimitMiddleware(user.id, 'generate')
  if (limitCheck instanceof Response) return limitCheck

  // Parse body
  let body: { passage?: StructuredPassage; options?: GenerationOptions }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  const { passage, options } = body

  if (!passage) {
    return NextResponse.json(
      { error: 'passage is required' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  try {
    const questions = await generateQuestions(passage, options ?? {})

    // Track usage after successful generation (non-blocking)
    trackUsage(user.id, 'generate', 0)

    return NextResponse.json(
      { data: questions },
      {
        status: 200,
        headers: {
          'X-Usage-Used': String(limitCheck.used + 1),
          'X-Usage-Limit': String(limitCheck.limit),
          'X-Usage-Plan': limitCheck.plan,
          ...rateLimitHeaders(),
        },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Question generation failed'
    console.error('[/api/generate] Error for user', user.id, err)
    return NextResponse.json(
      { error: message },
      { status: 500, headers: rateLimitHeaders() }
    )
  }
}
