/**
 * POST /api/generate-stream
 *
 * Server-Sent Events (SSE) endpoint that streams progress updates while
 * running the full question-generation pipeline:
 *   structurize -> generate (with RAG + validation + correction)
 *
 * Event shapes:
 *   { step: 'structurizing',  message: string }
 *   { step: 'structurized',   data: StructuredPassage, message: string }
 *   { step: 'generating',     message: string }
 *   { step: 'completed',      data: { passage, questions }, message: string }
 *   { step: 'error',          message: string }
 *
 * Request body:
 *   { fileUrl?: string, base64?: string, mediaType?: string,
 *     options?: { types, difficulty, count, explanationLanguage, topicHints } }
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '../_lib/auth'
import { structurizePassage, StructurizerError } from '@/lib/services/structurizer'
import { generateQuestions, GeneratorError } from '@/lib/services/generator'
import { AnthropicServiceError } from '@/lib/services/anthropic'
import type {
  StructuredPassage,
  GenerationOptions,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS: GenerationOptions = {
  types: ['vocabulary_choice'],
  difficulty: 3,
  count: 5,
  explanationLanguage: 'ko',
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // --- Auth ---
  let user: Awaited<ReturnType<typeof requireAuth>>
  try {
    user = await requireAuth(request)
  } catch (errorResponse) {
    return errorResponse as Response
  }

  // --- Parse body ---
  let body: {
    fileUrl?: string
    base64?: string
    mediaType?: string
    options?: Partial<GenerationOptions>
  }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { fileUrl, base64, mediaType, options: rawOptions } = body

  if (!fileUrl && !(base64 && mediaType)) {
    return new Response(
      JSON.stringify({ error: 'Provide either fileUrl or both base64 and mediaType' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Input size validation
  if (fileUrl && (typeof fileUrl !== 'string' || fileUrl.length > 2048)) {
    return new Response(
      JSON.stringify({ error: 'fileUrl must be a string of at most 2048 characters' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
  if (base64 && (typeof base64 !== 'string' || base64.length > 10_000_000)) {
    return new Response(
      JSON.stringify({ error: 'base64 payload must not exceed 10 MB' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
  if (mediaType && (typeof mediaType !== 'string' || mediaType.length > 100)) {
    return new Response(
      JSON.stringify({ error: 'mediaType must be a string of at most 100 characters' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const options: GenerationOptions = { ...DEFAULT_OPTIONS, ...rawOptions }

  // --- SSE stream ---
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // -- Step 1: Structurize --
        sendEvent({ step: 'structurizing', message: '지문을 분석하고 있습니다...' })

        let passage: StructuredPassage
        try {
          passage = await structurizePassage(
            fileUrl ? { fileUrl } : { base64: base64!, mediaType: mediaType! }
          )
        } catch (err) {
          const msg =
            err instanceof StructurizerError || err instanceof Error
              ? err.message
              : 'unknown'
          console.error('[/api/generate-stream] Structurize error:', msg)
          sendEvent({ step: 'error', message: '스트리밍 중 오류가 발생했습니다.' })
          controller.close()
          return
        }

        sendEvent({ step: 'structurized', data: passage, message: '지문 분석 완료!' })

        // -- Step 2: Generate (includes RAG + validation + correction) --
        sendEvent({
          step: 'generating',
          message: `변형문제를 생성하고 있습니다... (${options.types.length}개 유형, RAG 로드 + 검증 + 자동수정 포함)`,
        })

        const questions = await generateQuestions(passage, options)

        // -- Done --
        sendEvent({
          step: 'completed',
          data: { passage, questions },
          message: `생성 완료! (${questions.length}문항)`,
        })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'unknown'
        console.error('[/api/generate-stream] Error:', message)
        sendEvent({ step: 'error', message: '스트리밍 중 오류가 발생했습니다.' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
