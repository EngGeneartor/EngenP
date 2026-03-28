import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, rateLimitHeaders } from '../_lib/auth'
import { generateQuestions } from '@/lib/services/generator'
import type { StructuredPassage, GenerationOptions } from '@/lib/services/generator'

export async function POST(request: NextRequest) {
  // Auth
  let user
  try {
    user = await requireAuth(request)
  } catch (errorResponse) {
    return errorResponse as Response
  }

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

    return NextResponse.json(
      { data: questions },
      { status: 200, headers: rateLimitHeaders() }
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
