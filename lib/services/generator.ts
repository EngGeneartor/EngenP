/**
 * generator.ts
 * Question Generation Service -- server-side only.
 *
 * Implements the full AI pipeline with:
 *   1. RAG: selectively load relevant question-type templates
 *   2. Prompt Assembly: static system prompt + dynamic RAG-injected user message
 *   3. Agent Loop: generate -> validate -> correct (with feedback)
 *   4. Passage Fairness: ensure all parts of the passage are utilized
 *
 * Uses:
 *   - rag.ts for selective template loading and few-shot examples
 *   - prompt-builder.ts for prompt assembly (file-based system prompts)
 *   - validator.ts for per-question detailed validation
 *   - anthropic.ts for Claude API calls
 *
 * Public API:
 *   generateQuestions(passage, options) -> GeneratedQuestion[]
 */

import {
  callClaude,
  extractJsonFromText,
  AnthropicServiceError,
} from './anthropic'
import { loadQuestionTypeContext, loadFewShotExamples } from './rag'
import {
  buildGenerateSystemPrompt,
  buildGenerateUserMessage,
  buildCorrectionMessage,
} from './prompt-builder'
import { validateQuestionsDetailed } from './validator'
import type {
  StructuredPassage,
  GeneratedQuestion,
  GenerationOptions,
  DetailedValidationResult,
  TypeContext,
  QuestionTypeId,
} from '@/lib/types'

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

/** Maximum validation + regeneration rounds before giving up */
const MAX_CORRECTION_ROUNDS = 2

/** Maximum retries for a single Claude API call */
const MAX_RETRIES = 3

/** Base delay (ms) for exponential back-off */
const RETRY_BASE_DELAY_MS = 800

/** Number of few-shot examples to include per type */
const FEW_SHOT_COUNT_PER_TYPE = 1

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
          `retrying in ${delay}ms...`,
        err
      )
      await sleep(delay)
    }
  }
  throw lastError
}

// -----------------------------------------------------------
// Output parsing
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

// -----------------------------------------------------------
// Self-correction loop helpers
// -----------------------------------------------------------

/**
 * Split questions into passing and failing subsets based on validation.
 */
function partitionByValidation(
  questions: GeneratedQuestion[],
  failedResults: DetailedValidationResult[]
): { valid: GeneratedQuestion[]; failed: GeneratedQuestion[] } {
  const failedNumbers = new Set(failedResults.map((r) => r.question_number))
  return {
    valid: questions.filter((q) => !failedNumbers.has(q.question_number)),
    failed: questions.filter((q) => failedNumbers.has(q.question_number)),
  }
}

/**
 * Re-number a set of questions so that their question_number values start
 * from `startNumber` and are sequential.
 */
function renumber(questions: GeneratedQuestion[], startNumber: number): GeneratedQuestion[] {
  return questions.map((q, idx) => ({ ...q, question_number: startNumber + idx }))
}

/**
 * Merge corrected questions back into the question list, replacing
 * the failed originals with the corrected versions.
 */
function mergeCorrections(
  allQuestions: GeneratedQuestion[],
  corrected: GeneratedQuestion[],
  failedNumbers: Set<number>
): GeneratedQuestion[] {
  const validOriginals = allQuestions.filter(
    (q) => !failedNumbers.has(q.question_number)
  )
  return renumber([...validOriginals, ...corrected], 1)
}

// -----------------------------------------------------------
// Passage fairness check
// -----------------------------------------------------------

/**
 * Check whether all paragraphs of the passage are utilized by at least
 * one question. If not, log a warning (future: could trigger regeneration
 * for underrepresented paragraphs).
 */
function checkPassageFairness(
  questions: GeneratedQuestion[],
  passage: StructuredPassage
): void {
  const totalParagraphs = passage.paragraphs.length
  if (totalParagraphs <= 1) return // nothing to check

  // Collect paragraph indices referenced in source_sentences
  const referencedParagraphs = new Set<number>()
  for (const q of questions) {
    const sources = (q as any).source_sentences as
      | Array<{ paragraph_index: number }>
      | undefined
    if (sources) {
      for (const s of sources) {
        referencedParagraphs.add(s.paragraph_index)
      }
    }
  }

  // Also check passage_with_markers for content from each paragraph
  for (const q of questions) {
    if (q.passage_with_markers) {
      for (const para of passage.paragraphs) {
        // Check if at least a significant portion of the paragraph appears
        const firstSentence = para.sentences[0]?.text
        if (firstSentence && q.passage_with_markers.includes(firstSentence.substring(0, 30))) {
          referencedParagraphs.add(para.index)
        }
      }
    }
  }

  const missingParagraphs = passage.paragraphs
    .filter((p) => !referencedParagraphs.has(p.index))
    .map((p) => p.index)

  if (missingParagraphs.length > 0) {
    console.warn(
      `[generator] Passage fairness: paragraphs ${missingParagraphs.join(', ')} ` +
        `are not referenced by any question. Consider adding questions that cover these sections.`
    )
  }
}

// -----------------------------------------------------------
// Core pipeline
// -----------------------------------------------------------

/**
 * The main generation pipeline with RAG, prompt assembly, and agent loop.
 *
 * @param passage         The structured passage to generate questions for
 * @param typeContexts    RAG-loaded type contexts (pre-loaded by caller or loaded here)
 * @param fewShotExamples Formatted few-shot examples string
 * @param options         Generation options
 */
async function generateWithCorrection(
  passage: StructuredPassage,
  typeContexts: TypeContext[],
  fewShotExamples: string,
  options: GenerationOptions
): Promise<GeneratedQuestion[]> {
  // --- Step 1: Build prompts ---
  const systemPrompt = await buildGenerateSystemPrompt()
  const userMessage = buildGenerateUserMessage(
    passage,
    typeContexts,
    fewShotExamples,
    options
  )

  // --- Step 2: Initial generation ---
  let questions = await withRetry(async () => {
    const { raw } = await callClaude(systemPrompt, userMessage, 'generate')
    return parseGeneratedQuestions(raw)
  }, 'initial generation')

  console.info(
    `[generator] Generated ${questions.length} questions ` +
      `(requested ${options.count}) for passage "${passage.id}"`
  )

  // --- Step 3: Validation + self-correction loop ---
  for (let round = 1; round <= MAX_CORRECTION_ROUNDS; round++) {
    // Validate current batch with detailed per-question analysis
    let validationResults: DetailedValidationResult[]
    try {
      validationResults = await validateQuestionsDetailed(questions, passage)
    } catch (err) {
      console.warn(
        `[generator] Validation round ${round} failed -- skipping correction:`,
        err
      )
      break
    }

    // Separate failed questions
    const failedResults = validationResults.filter(
      (v) => v.overall_verdict === 'FAIL'
    )

    if (failedResults.length === 0) {
      console.info(
        `[generator] All questions passed validation after round ${round - 1} correction(s)`
      )
      break
    }

    console.warn(
      `[generator] Correction round ${round}: ` +
        `${failedResults.length} question(s) failed validation ` +
        `(#${failedResults.map((r) => r.question_number).join(', ')})`
    )

    if (round === MAX_CORRECTION_ROUNDS) {
      // Last round -- accept valid ones and log the remaining failures
      const { valid: validQuestions } = partitionByValidation(
        questions,
        failedResults
      )
      console.error(
        `[generator] Max correction rounds reached. ` +
          `${failedResults.length} question(s) could not be corrected and will be excluded.`
      )
      questions = renumber(validQuestions, 1)
      break
    }

    // --- Step 4: Re-generate only failed questions with feedback ---
    const { valid: validQuestions, failed: failedQuestions } =
      partitionByValidation(questions, failedResults)

    // Build correction prompt with validation feedback
    const correctionUserMessage = buildCorrectionMessage(
      failedQuestions,
      failedResults,
      passage,
      typeContexts
    )

    let corrected: GeneratedQuestion[]
    try {
      corrected = await withRetry(async () => {
        const { raw } = await callClaude(
          systemPrompt,
          correctionUserMessage,
          'generate'
        )
        return parseGeneratedQuestions(raw)
      }, `correction round ${round}`)
    } catch (err) {
      console.error(
        `[generator] Correction round ${round} failed -- keeping originals:`,
        err
      )
      break
    }

    // Merge corrections and re-number
    const failedNumbers = new Set(failedResults.map((r) => r.question_number))
    questions = mergeCorrections(questions, corrected, failedNumbers)

    console.info(
      `[generator] After correction round ${round}: ${questions.length} question(s) in set`
    )
  }

  // --- Step 5: Passage fairness check ---
  checkPassageFairness(questions, passage)

  return questions
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
 * Full pipeline:
 *  1. RAG: Load only the relevant question-type templates and few-shot examples
 *  2. Prompt Assembly: Build system prompt (from file) + dynamic user message
 *  3. Generation: Call Claude with assembled prompts
 *  4. Validation: Per-question 7-check detailed validation
 *  5. Self-Correction: Re-generate failed questions with validation feedback
 *  6. Fairness Check: Ensure all passage parts are utilized
 *
 * @param passage   The structured passage to generate questions for
 * @param options   Generation options (types, difficulty, count, ...); can be partial
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

  // --- RAG Step: Load only the relevant type contexts and examples ---
  const typeContexts = await loadQuestionTypeContext(resolvedOptions.types)
  const fewShotExamples = await loadFewShotExamples(
    resolvedOptions.types,
    FEW_SHOT_COUNT_PER_TYPE
  )

  console.info(
    `[generator] RAG loaded: ${typeContexts.length} type context(s), ` +
      `few-shot examples for [${resolvedOptions.types.join(', ')}]`
  )

  // --- Run the generation pipeline with self-correction ---
  return generateWithCorrection(
    passage,
    typeContexts,
    fewShotExamples,
    resolvedOptions
  )
}

// -----------------------------------------------------------
// Re-export types so API routes can import them from this module
// -----------------------------------------------------------
export type {
  StructuredPassage,
  GeneratedQuestion,
  GenerationOptions,
  DetailedValidationResult,
  QuestionTypeId,
} from '@/lib/types'
