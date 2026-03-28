/**
 * POST /api/generate-stream
 *
 * Server-Sent Events (SSE) endpoint that streams progress updates while
 * running the full question-generation pipeline:
 *   structurize → generate → validate → correct (up to 2 rounds)
 *
 * Event shapes:
 *   { step: 'structurizing',  message: string }
 *   { step: 'structurized',   data: StructuredPassage, message: string }
 *   { step: 'generating',     message: string }
 *   { step: 'validating',     message: string }
 *   { step: 'correcting',     message: string }   (once per correction round)
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
import {
  createGenerateRequest,
  createValidateRequest,
  extractJsonFromText,
  AnthropicServiceError,
} from '@/lib/services/anthropic'
import type {
  StructuredPassage,
  GeneratedQuestion,
  GenerationOptions,
  ValidationResult,
  QuestionTypeTemplate,
  QuestionTypeId,
} from '@/lib/types'
import path from 'path'
import fs from 'fs/promises'

// ---------------------------------------------------------------------------
// Constants (mirrored from generator.ts so we stay independent)
// ---------------------------------------------------------------------------

const QUESTION_TYPES_DIR = path.join(process.cwd(), 'data', 'question_types')
const MAX_CORRECTION_ROUNDS = 2
const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 800

const DEFAULT_OPTIONS: GenerationOptions = {
  types: ['vocabulary_choice'],
  difficulty: 3,
  count: 5,
  explanationLanguage: 'ko',
}

// ---------------------------------------------------------------------------
// Helpers (kept local so the route is self-contained)
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const retryable =
        (err instanceof AnthropicServiceError && err.retryable) ||
        (err instanceof Error && (err as any).retryable === true)
      if (!retryable || attempt === MAX_RETRIES) break
      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
      console.warn(`[generate-stream] ${label} attempt ${attempt} failed, retrying in ${delay}ms`, err)
      await sleep(delay)
    }
  }
  throw lastError
}

const templateCache = new Map<QuestionTypeId, QuestionTypeTemplate>()

async function loadTemplate(typeId: QuestionTypeId): Promise<QuestionTypeTemplate> {
  if (templateCache.has(typeId)) return templateCache.get(typeId)!
  const filePath = path.join(QUESTION_TYPES_DIR, `${typeId}.json`)
  const raw = await fs.readFile(filePath, 'utf-8')
  const template = JSON.parse(raw) as QuestionTypeTemplate
  templateCache.set(typeId, template)
  return template
}

async function loadTemplates(options: GenerationOptions): Promise<QuestionTypeTemplate[]> {
  const results: QuestionTypeTemplate[] = []
  for (const typeId of options.types) {
    try {
      results.push(await loadTemplate(typeId))
    } catch {
      console.error(`[generate-stream] Skipping unknown question type "${typeId}"`)
    }
  }
  if (results.length === 0) {
    throw new Error(`None of the requested question types could be loaded: ${options.types.join(', ')}`)
  }
  return results
}

function parseGeneratedQuestions(raw: string): GeneratedQuestion[] {
  const parsed = extractJsonFromText(raw)
  if (!Array.isArray(parsed)) {
    throw new Error('Expected a JSON array of questions from Claude')
  }
  return parsed as GeneratedQuestion[]
}

function parseValidationResult(raw: string): ValidationResult {
  const parsed = extractJsonFromText(raw) as ValidationResult
  if (typeof parsed.valid !== 'boolean' || !Array.isArray(parsed.issues)) {
    throw new Error('Unexpected validation result shape')
  }
  if (!Array.isArray(parsed.invalidQuestionNumbers)) {
    parsed.invalidQuestionNumbers = parsed.issues
      .filter((i) => i.severity === 'error')
      .map((i) => i.questionNumber)
  }
  return parsed
}

function partitionByValidation(
  questions: GeneratedQuestion[],
  invalidNumbers: number[]
): { valid: GeneratedQuestion[]; invalid: GeneratedQuestion[] } {
  const invalidSet = new Set(invalidNumbers)
  return {
    valid: questions.filter((q) => !invalidSet.has(q.question_number)),
    invalid: questions.filter((q) => invalidSet.has(q.question_number)),
  }
}

function buildRegenerationOptions(
  base: GenerationOptions,
  invalidQuestions: GeneratedQuestion[]
): GenerationOptions {
  return {
    ...base,
    types: [...new Set(invalidQuestions.map((q) => q.type_id))],
    count: invalidQuestions.length,
  }
}

function renumber(questions: GeneratedQuestion[], start: number): GeneratedQuestion[] {
  return questions.map((q, i) => ({ ...q, question_number: start + i }))
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

  const options: GenerationOptions = { ...DEFAULT_OPTIONS, ...rawOptions }

  // --- SSE stream ---
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // ── Step 1: Structurize ──────────────────────────────────────────
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
              : '지문 분석에 실패했습니다.'
          sendEvent({ step: 'error', message: msg })
          controller.close()
          return
        }

        sendEvent({ step: 'structurized', data: passage, message: '지문 분석 완료!' })

        // ── Step 2: Load templates + initial generation ──────────────────
        sendEvent({
          step: 'generating',
          message: `변형문제를 생성하고 있습니다... (${options.types.length}개 유형)`,
        })

        const templates = await loadTemplates(options)

        let questions: GeneratedQuestion[] = await withRetry(async () => {
          const { raw } = await createGenerateRequest(passage, templates, options)
          return parseGeneratedQuestions(raw)
        }, 'initial generation')

        // ── Steps 3-4: Validate + self-correction loop ───────────────────
        for (let round = 1; round <= MAX_CORRECTION_ROUNDS; round++) {
          sendEvent({
            step: 'validating',
            message: `생성된 문제를 검증하고 있습니다... (라운드 ${round}/${MAX_CORRECTION_ROUNDS})`,
          })

          let validationResult: ValidationResult
          try {
            validationResult = await withRetry(async () => {
              const { raw } = await createValidateRequest(questions, passage)
              return parseValidationResult(raw)
            }, `validation round ${round}`)
          } catch (err) {
            console.warn('[generate-stream] Validation failed — skipping correction:', err)
            break
          }

          if (validationResult.valid || validationResult.invalidQuestionNumbers.length === 0) {
            break
          }

          const { valid: validQuestions, invalid: invalidQuestions } = partitionByValidation(
            questions,
            validationResult.invalidQuestionNumbers
          )

          if (round === MAX_CORRECTION_ROUNDS) {
            // Last round — discard uncorrectable questions and move on
            console.error(
              `[generate-stream] Max correction rounds reached; ` +
                `${invalidQuestions.length} question(s) excluded`
            )
            questions = validQuestions
            break
          }

          sendEvent({
            step: 'correcting',
            message: `자동 수정 중... (라운드 ${round}/${MAX_CORRECTION_ROUNDS})`,
          })

          const regenOptions = buildRegenerationOptions(options, invalidQuestions)
          const regenTemplates = templates.filter((t) =>
            regenOptions.types.includes(t.type_id)
          )

          try {
            const regenQuestions = await withRetry(async () => {
              const { raw } = await createGenerateRequest(passage, regenTemplates, regenOptions)
              return parseGeneratedQuestions(raw)
            }, `regeneration round ${round}`)

            questions = renumber([...validQuestions, ...regenQuestions], 1)
          } catch (err) {
            console.error(`[generate-stream] Regeneration round ${round} failed:`, err)
            break
          }
        }

        // ── Done ─────────────────────────────────────────────────────────
        sendEvent({
          step: 'completed',
          data: { passage, questions },
          message: '생성 완료!',
        })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
        console.error('[/api/generate-stream] Unhandled error for user', user.id, err)
        sendEvent({ step: 'error', message })
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
