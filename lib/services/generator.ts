/**
 * generator.ts
 * Question Generation Service — server-side only.
 *
 * Takes a StructuredPassage and GenerationOptions, loads the appropriate
 * question-type templates from data/question_types/, assembles a rich
 * prompt, calls Claude, and returns a validated array of GeneratedQuestion.
 *
 * Includes a self-correction loop: after initial generation, questions are
 * validated by Claude and any that fail are regenerated (up to MAX_CORRECTION_ROUNDS).
 *
 * Public API:
 *   generateQuestions(passage, options) → GeneratedQuestion[]
 */

import path from 'path'
import fs from 'fs/promises'
import {
  createGenerateRequest,
  createValidateRequest,
  extractJsonFromText,
  AnthropicServiceError,
} from './anthropic'
import type {
  StructuredPassage,
  GeneratedQuestion,
  GenerationOptions,
  ValidationResult,
  QuestionTypeTemplate,
  QuestionTypeId,
} from '@/lib/types'

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

/** Path to the directory containing question-type JSON templates */
const QUESTION_TYPES_DIR = path.join(process.cwd(), 'data', 'question_types')

/** Path to the directory containing system prompts (reserved for future use) */
// const PROMPTS_DIR = path.join(process.cwd(), 'data', 'prompts')

/** Maximum validation + regeneration rounds before giving up */
const MAX_CORRECTION_ROUNDS = 2

/** Maximum retries for a single Claude API call */
const MAX_RETRIES = 3

/** Base delay (ms) for exponential back-off */
const RETRY_BASE_DELAY_MS = 800

// -----------------------------------------------------------
// Error class
// -----------------------------------------------------------

export class GeneratorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message)
    this.name = 'GeneratorError'
  }
}

// -----------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generic retry wrapper with exponential back-off.
 */
async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const isRetryable =
        (err instanceof AnthropicServiceError && err.retryable) ||
        (err instanceof GeneratorError && err.retryable)

      if (!isRetryable || attempt === MAX_RETRIES) break

      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
      console.warn(
        `[generator] ${label} failed (attempt ${attempt}/${MAX_RETRIES}), ` +
          `retrying in ${delay}ms…`,
        err
      )
      await sleep(delay)
    }
  }
  throw lastError
}

// -----------------------------------------------------------
// Template loading
// -----------------------------------------------------------

/** In-process cache for loaded templates (avoid repeated disk reads) */
const templateCache: Map<QuestionTypeId, QuestionTypeTemplate> = new Map()

/**
 * Load a single question-type template from disk.
 * Results are cached in memory for the lifetime of the process.
 */
async function loadTemplate(typeId: QuestionTypeId): Promise<QuestionTypeTemplate> {
  if (templateCache.has(typeId)) {
    return templateCache.get(typeId)!
  }

  const filePath = path.join(QUESTION_TYPES_DIR, `${typeId}.json`)
  let raw: string
  try {
    raw = await fs.readFile(filePath, 'utf-8')
  } catch (err) {
    throw new GeneratorError(
      `Question type template not found: "${typeId}" (expected at ${filePath})`,
      'TEMPLATE_NOT_FOUND'
    )
  }

  let template: QuestionTypeTemplate
  try {
    template = JSON.parse(raw) as QuestionTypeTemplate
  } catch (err) {
    throw new GeneratorError(
      `Failed to parse template JSON for type "${typeId}": ${(err as Error).message}`,
      'TEMPLATE_PARSE_ERROR'
    )
  }

  // Basic sanity check
  if (!template.type_id || !template.generation_rules || !template.output_schema) {
    throw new GeneratorError(
      `Template for type "${typeId}" is missing required fields (type_id, generation_rules, output_schema)`,
      'TEMPLATE_INVALID'
    )
  }

  templateCache.set(typeId, template)
  return template
}

/**
 * Load all templates required for the given options.
 * Falls back gracefully: if a template is missing it is logged and skipped.
 */
async function loadTemplates(options: GenerationOptions): Promise<QuestionTypeTemplate[]> {
  const results: QuestionTypeTemplate[] = []
  for (const typeId of options.types) {
    try {
      results.push(await loadTemplate(typeId))
    } catch (err) {
      if (err instanceof GeneratorError && err.code === 'TEMPLATE_NOT_FOUND') {
        console.error(`[generator] Skipping unknown question type "${typeId}":`, err.message)
      } else {
        throw err
      }
    }
  }

  if (results.length === 0) {
    throw new GeneratorError(
      `None of the requested question types could be loaded: ${options.types.join(', ')}`,
      'NO_TEMPLATES'
    )
  }

  return results
}

// -----------------------------------------------------------
// Output parsing + validation
// -----------------------------------------------------------

/**
 * Parse the raw text from Claude into a GeneratedQuestion array.
 */
function parseGeneratedQuestions(raw: string): GeneratedQuestion[] {
  let parsed: unknown
  try {
    parsed = extractJsonFromText(raw)
  } catch (err) {
    throw new GeneratorError(
      `Failed to parse generated questions JSON: ${(err as Error).message}`,
      'JSON_PARSE_ERROR',
      /* retryable */ true
    )
  }

  if (!Array.isArray(parsed)) {
    throw new GeneratorError(
      'Expected Claude to return a JSON array of questions, but got a non-array value',
      'UNEXPECTED_SHAPE',
      /* retryable */ true
    )
  }

  const questions = parsed as GeneratedQuestion[]

  // Lightweight structural validation per question
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    if (typeof q.question_number !== 'number') {
      throw new GeneratorError(
        `Question at index ${i} is missing a numeric question_number`,
        'MISSING_QUESTION_NUMBER',
        /* retryable */ true
      )
    }
    if (!q.instruction || typeof q.instruction !== 'string') {
      throw new GeneratorError(
        `Question ${q.question_number} is missing an instruction string`,
        'MISSING_INSTRUCTION',
        /* retryable */ true
      )
    }
    if (!q.answer || typeof q.answer !== 'string') {
      throw new GeneratorError(
        `Question ${q.question_number} is missing an answer string`,
        'MISSING_ANSWER',
        /* retryable */ true
      )
    }
  }

  return questions
}

/**
 * Parse the raw text from Claude into a ValidationResult.
 */
function parseValidationResult(raw: string): ValidationResult {
  let parsed: unknown
  try {
    parsed = extractJsonFromText(raw)
  } catch (err) {
    throw new GeneratorError(
      `Failed to parse validation result JSON: ${(err as Error).message}`,
      'VALIDATION_JSON_PARSE_ERROR',
      /* retryable */ true
    )
  }

  const result = parsed as ValidationResult
  if (typeof result.valid !== 'boolean' || !Array.isArray(result.issues)) {
    throw new GeneratorError(
      'Validation result has unexpected shape (missing "valid" or "issues" fields)',
      'VALIDATION_SHAPE_ERROR',
      /* retryable */ true
    )
  }

  // Ensure invalidQuestionNumbers is always an array
  if (!Array.isArray(result.invalidQuestionNumbers)) {
    result.invalidQuestionNumbers = result.issues
      .filter((i) => i.severity === 'error')
      .map((i) => i.questionNumber)
  }

  return result
}

// -----------------------------------------------------------
// Self-correction loop helpers
// -----------------------------------------------------------

/**
 * Split a question list into passing and failing subsets.
 */
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

/**
 * Build GenerationOptions narrowed to the question types of the given
 * invalid questions, preserving count = number of invalid questions.
 */
function buildRegenerationOptions(
  baseOptions: GenerationOptions,
  invalidQuestions: GeneratedQuestion[]
): GenerationOptions {
  const types = [...new Set(invalidQuestions.map((q) => q.type_id))]
  return {
    ...baseOptions,
    types,
    count: invalidQuestions.length,
  }
}

/**
 * Re-number a set of questions so that their question_number values start
 * from `startNumber` and are sequential.
 */
function renumber(questions: GeneratedQuestion[], startNumber: number): GeneratedQuestion[] {
  return questions.map((q, idx) => ({ ...q, question_number: startNumber + idx }))
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/** Default generation options used when a caller omits them */
const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
  types: ['vocabulary_choice'],
  difficulty: 3,
  count: 5,
  explanationLanguage: 'ko',
}

/**
 * Generate exam questions from a structured passage.
 *
 * Workflow:
 *  1. Load question-type templates from data/question_types/.
 *  2. Call Claude to generate questions.
 *  3. Parse and structurally validate Claude's output.
 *  4. Run a Claude validation pass (createValidateRequest).
 *  5. If any questions fail, regenerate only those (up to MAX_CORRECTION_ROUNDS).
 *  6. Return the final merged, re-numbered question list.
 *
 * @param passage   The structured passage to generate questions for
 * @param options   Generation options (types, difficulty, count, …); can be partial
 * @returns         Array of validated GeneratedQuestion objects
 */
export async function generateQuestions(
  passage: StructuredPassage,
  options: Partial<GenerationOptions> = {}
): Promise<GeneratedQuestion[]> {
  // Merge caller-supplied options with defaults
  const resolvedOptions: GenerationOptions = {
    ...DEFAULT_GENERATION_OPTIONS,
    ...options,
  }
  // --- Step 1: Load templates ---
  const templates = await loadTemplates(resolvedOptions)

  // --- Step 2: Generate initial questions ---
  let questions = await withRetry(async () => {
    const { raw } = await createGenerateRequest(passage, templates, resolvedOptions)
    return parseGeneratedQuestions(raw)
  }, 'initial generation')

  console.info(
    `[generator] Generated ${questions.length} questions ` +
      `(requested ${resolvedOptions.count}) for passage "${passage.id}"`
  )

  // --- Steps 3-5: Self-correction loop ---
  for (let round = 1; round <= MAX_CORRECTION_ROUNDS; round++) {
    // Validate current batch
    let validationResult: ValidationResult
    try {
      validationResult = await withRetry(async () => {
        const { raw } = await createValidateRequest(questions, passage)
        return parseValidationResult(raw)
      }, `validation round ${round}`)
    } catch (err) {
      console.warn(
        `[generator] Validation round ${round} failed — skipping correction:`,
        err
      )
      break
    }

    if (validationResult.valid || validationResult.invalidQuestionNumbers.length === 0) {
      console.info(`[generator] All questions valid after round ${round - 1} correction(s)`)
      break
    }

    const { valid: validQuestions, invalid: invalidQuestions } = partitionByValidation(
      questions,
      validationResult.invalidQuestionNumbers
    )

    console.warn(
      `[generator] Correction round ${round}: ` +
        `${invalidQuestions.length} question(s) failed validation ` +
        `(#${validationResult.invalidQuestionNumbers.join(', ')})`
    )

    if (round === MAX_CORRECTION_ROUNDS) {
      // Last round — accept valid ones and log the remaining failures
      console.error(
        `[generator] Max correction rounds reached. ` +
          `${invalidQuestions.length} question(s) could not be corrected and will be excluded.`
      )
      questions = validQuestions
      break
    }

    // Regenerate invalid questions
    const regenOptions = buildRegenerationOptions(resolvedOptions, invalidQuestions)
    const regenTemplates = templates.filter((t) =>
      regenOptions.types.includes(t.type_id)
    )

    let regenQuestions: GeneratedQuestion[]
    try {
      regenQuestions = await withRetry(async () => {
        const { raw } = await createGenerateRequest(passage, regenTemplates, regenOptions)
        return parseGeneratedQuestions(raw)
      }, `regeneration round ${round}`)
    } catch (err) {
      console.error(`[generator] Regeneration round ${round} failed — keeping originals:`, err)
      break
    }

    // Merge: keep valid originals + newly regenerated, then re-number sequentially
    const merged = [
      ...validQuestions,
      ...regenQuestions,
    ]
    questions = renumber(merged, 1)

    console.info(
      `[generator] After correction round ${round}: ${questions.length} question(s) in set`
    )
  }

  return questions
}

/**
 * Clear the in-memory template cache.
 * Useful in tests or when templates are updated at runtime.
 */
export function clearTemplateCache(): void {
  templateCache.clear()
}

// -----------------------------------------------------------
// Re-export types so API routes can import them from this module
// -----------------------------------------------------------
export type {
  StructuredPassage,
  GeneratedQuestion,
  GenerationOptions,
  ValidationResult,
  QuestionTypeTemplate,
  QuestionTypeId,
} from '@/lib/types'
