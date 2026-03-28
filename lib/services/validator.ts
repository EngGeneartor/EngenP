'use server'

/**
 * validator.ts
 * Question Validation Service — server-side only.
 *
 * Wraps the low-level createValidateRequest from the anthropic service
 * and exposes a clean validateQuestions() function for use in API routes.
 *
 * Public API:
 *   validateQuestions(questions, passage) → ValidationResult
 */

import {
  createValidateRequest,
  extractJsonFromText,
  AnthropicServiceError,
} from './anthropic'
import type {
  GeneratedQuestion,
  StructuredPassage,
  ValidationResult,
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
          `retrying in ${delay}ms…`,
        err
      )
      await sleep(delay)
    }
  }
  throw lastError
}

/**
 * Parse the raw text from Claude into a ValidationResult.
 */
function parseValidationResult(raw: string): ValidationResult {
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

  const result = parsed as ValidationResult

  if (typeof result.valid !== 'boolean') {
    throw new ValidatorError(
      'Validation result missing "valid" boolean field',
      'INVALID_SHAPE',
      /* retryable */ true
    )
  }

  if (!Array.isArray(result.issues)) {
    throw new ValidatorError(
      'Validation result missing "issues" array field',
      'INVALID_SHAPE',
      /* retryable */ true
    )
  }

  // Ensure invalidQuestionNumbers is always populated
  if (!Array.isArray(result.invalidQuestionNumbers)) {
    result.invalidQuestionNumbers = result.issues
      .filter((issue) => issue.severity === 'error')
      .map((issue) => issue.questionNumber)
      .filter((n, idx, arr) => arr.indexOf(n) === idx) // deduplicate
  }

  return result
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Validate a set of generated questions against the original passage.
 *
 * Sends the questions and passage to Claude for a structured quality review.
 * Returns a ValidationResult with:
 *   - `valid`: true if all questions passed
 *   - `issues`: list of errors/warnings per question and field
 *   - `invalidQuestionNumbers`: question_numbers that have at least one error
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

  return withRetry(async () => {
    const { raw } = await createValidateRequest(questions, passage)
    return parseValidationResult(raw)
  }, 'validateQuestions')
}

// -----------------------------------------------------------
// Re-export types so API routes can import them from this module
// -----------------------------------------------------------
export type { GeneratedQuestion, StructuredPassage, ValidationResult } from '@/lib/types'
