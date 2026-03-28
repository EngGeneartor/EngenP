import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, rateLimitHeaders } from '../_lib/auth'
import { validateQuestions } from '@/lib/services/validator'
import type { GeneratedQuestion, StructuredPassage } from '@/lib/services/validator'

export async function POST(request: NextRequest) {
  // Auth
  let user
  try {
    user = await requireAuth(request)
  } catch (errorResponse) {
    return errorResponse as Response
  }

  // Parse body
  let body: { questions?: GeneratedQuestion[]; passage?: StructuredPassage }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  const { questions, passage } = body

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json(
      { error: 'questions array is required and must not be empty' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  // Input size validation
  if (questions.length > 100) {
    return NextResponse.json(
      { error: 'questions array must not exceed 100 items' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  if (!passage) {
    return NextResponse.json(
      { error: 'passage is required' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  if (passage.fullText && typeof passage.fullText === 'string' && passage.fullText.length > 50_000) {
    return NextResponse.json(
      { error: 'passage.fullText must not exceed 50000 characters' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  try {
    const results = await validateQuestions(questions, passage)

    return NextResponse.json(
      { data: results },
      { status: 200, headers: rateLimitHeaders() }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Validation failed'
    console.error('[/api/validate] Error for user', user.id, err)
    return NextResponse.json(
      { error: message },
      { status: 500, headers: rateLimitHeaders() }
    )
  }
}
