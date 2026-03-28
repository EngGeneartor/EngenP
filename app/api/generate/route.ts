import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, rateLimitHeaders, checkUsageLimitMiddleware } from '../_lib/auth'
import { generateQuestions } from '@/lib/services/generator'
import { trackUsage } from '@/lib/services/usage-tracker'
import type { StructuredPassage, GenerationOptions, SchoolDnaProfile } from '@/lib/services/generator'

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
  let body: { passage?: StructuredPassage; options?: GenerationOptions; dnaProfile?: SchoolDnaProfile }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  const { passage, options, dnaProfile } = body

  if (!passage) {
    return NextResponse.json(
      { error: 'passage is required' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  // Input size validation
  if (passage.fullText && typeof passage.fullText === 'string' && passage.fullText.length > 50_000) {
    return NextResponse.json(
      { error: 'passage.fullText must not exceed 50000 characters' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }
  if (JSON.stringify(body).length > 500_000) {
    return NextResponse.json(
      { error: 'Request body is too large (max 500KB)' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  try {
    const questions = await generateQuestions(passage, options ?? {}, dnaProfile)

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
