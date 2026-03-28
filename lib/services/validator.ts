/**
 * validator.ts
 * Question Validation Service -- server-side only.
 *
 * Uses file-based prompts from data/prompts/validate_question.txt
 * via prompt-builder.ts. Validates each question independently with
 * 7 granular checks, returning PASS/WARN/FAIL per check and an
 * overall quality score.
 *
 * Public API:
 *   validateQuestion(question, passage)    -> DetailedValidationResult
 *   validateQuestions(questions, passage)   -> ValidationResult
 *   validateQuestionsDetailed(questions, passage) -> DetailedValidationResult[]
 */

import {
  callClaude,
  extractJsonFromText,
  AnthropicServiceError,
} from './anthropic'
import {
  buildValidateSystemPrompt,
  buildValidateUserMessage,
} from './prompt-builder'
import type {
  GeneratedQuestion,
  StructuredPassage,
  ValidationResult,
  DetailedValidationResult,
} from '@/lib/types'

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 800

// -----------------------------------------------------------
// Error class
// -----------------------------------------------------------

export class ValidatorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message)
    this.name = 'ValidatorError'
  }
}

// -----------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const isRetryable =
        (err instanceof AnthropicServiceError && err.retryable) ||
        (err instanceof ValidatorError && err.retryable)

      if (!isRetryable || attempt === MAX_RETRIES) break

      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
      console.warn(
        `[validator] ${label} failed (attempt ${attempt}/${MAX_RETRIES}), ` +
          `retrying in ${delay}ms...`,
        err
      )
      await sleep(delay)
    }
  }
  throw lastError
}

/**
 * Parse the raw text from Claude into a DetailedValidationResult.
 */
function parseDetailedValidationResult(raw: string): DetailedValidationResult {
  let parsed: unknown
  try {
    parsed = extractJsonFromText(raw)
  } catch (err) {
    throw new ValidatorError(
      `Failed to parse validation result JSON: ${(err as Error).message}`,
      'JSON_PARSE_ERROR',
      /* retryable */ true
    )
  }

  const result = parsed as DetailedValidationResult

  if (!result.overall_verdict || !result.checks) {
    throw new ValidatorError(
      'Validation result missing "overall_verdict" or "checks" fields',
      'INVALID_SHAPE',
      /* retryable */ true
    )
  }

  // Ensure quality_score is present
  if (typeof result.quality_score !== 'number') {
    // Calculate from checks
    const failCount = Object.values(result.checks).filter(
      (c) => c.verdict === 'FAIL'
    ).length
    const warnCount = Object.values(result.checks).filter(
      (c) => c.verdict === 'WARN'
    ).length
    result.quality_score = Math.max(0, 100 - failCount * 20 - warnCount * 5)
  }

  // Ensure patch_suggestions is always an array
  if (!Array.isArray(result.patch_suggestions)) {
    result.patch_suggestions = []
  }

  return result
}

/**
 * Convert a DetailedValidationResult to the simpler ValidationResult
 * format used by the legacy API and the correction loop.
 */
function detailedToSimple(
  results: DetailedValidationResult[]
): ValidationResult {
  const issues = results.flatMap((r) => {
    return Object.entries(r.checks)
      .filter(([, check]) => check.verdict === 'FAIL' || check.verdict === 'WARN')
      .map(([checkName, check]) => ({
        questionNumber: r.question_number,
        field: checkName,
        severity: (check.verdict === 'FAIL' ? 'error' : 'warning') as
          | 'error'
          | 'warning',
        message: check.details,
      }))
  })

  const invalidQuestionNumbers = [
    ...new Set(
      results
        .filter((r) => r.overall_verdict === 'FAIL')
        .map((r) => r.question_number)
    ),
  ]

  return {
    valid: invalidQuestionNumbers.length === 0,
    issues,
    invalidQuestionNumbers,
  }
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Validate a single question with the detailed 7-check analysis.
 * Uses the file-based prompt from data/prompts/validate_question.txt.
 *
 * @param question  The question to validate
 * @param passage   The passage the question is based on
 */
export async function validateQuestion(
  question: GeneratedQuestion,
  passage: StructuredPassage
): Promise<DetailedValidationResult> {
  return withRetry(async () => {
    const systemPrompt = await buildValidateSystemPrompt()
    const userMessage = buildValidateUserMessage(question, passage)

    const { raw } = await callClaude(systemPrompt, userMessage, 'validate')
    return parseDetailedValidationResult(raw)
  }, `validateQuestion(#${question.question_number})`)
}

/**
 * Validate all questions with detailed per-question analysis.
 * Each question is validated independently for thorough 7-check analysis.
 *
 * @param questions  The questions to validate
 * @param passage    The passage the questions are based on
 */
export async function validateQuestionsDetailed(
  questions: GeneratedQuestion[],
  passage: StructuredPassage
): Promise<DetailedValidationResult[]> {
  if (questions.length === 0) return []

  const results: DetailedValidationResult[] = []

  // Validate each question independently for thorough analysis
  for (const question of questions) {
    try {
      const result = await validateQuestion(question, passage)
      results.push(result)
    } catch (err) {
      console.warn(
        `[validator] Failed to validate question #${question.question_number}:`,
        err
      )
      // Create a synthetic FAIL result so the correction loop can handle it
      results.push({
        validation_id: `val_${passage.id}_${question.question_number}_${Date.now()}`,
        passage_id: passage.id,
        question_number: question.question_number,
        question_type: question.type_id,
        overall_verdict: 'FAIL',
        corrective_action: 'REGENERATE',
        checks: {
          check_validation_error: {
            verdict: 'FAIL',
            details: `Validation API call failed: ${err instanceof Error ? err.message : 'unknown error'}`,
          },
        },
        patch_suggestions: [],
        quality_score: 0,
        validator_notes: 'Validation could not be completed due to an API error.',
      })
    }
  }

  return results
}

/**
 * Validate questions and return the simpler ValidationResult format.
 * This is the backward-compatible entry point used by API routes.
 *
 * @param questions  The GeneratedQuestion array to validate
 * @param passage    The StructuredPassage the questions are based on
 */
export async function validateQuestions(
  questions: GeneratedQuestion[],
  passage: StructuredPassage
): Promise<ValidationResult> {
  if (!questions.length) {
    return {
      valid: true,
      issues: [],
      invalidQuestionNumbers: [],
    }
  }

  const detailedResults = await validateQuestionsDetailed(questions, passage)
  return detailedToSimple(detailedResults)
}

// -----------------------------------------------------------
// Re-export types so API routes can import them from this module
// -----------------------------------------------------------
export type {
  GeneratedQuestion,
  StructuredPassage,
  ValidationResult,
  DetailedValidationResult,
} from '@/lib/types'
