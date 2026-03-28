'use server'

/**
 * structurizer.ts
 * Passage Structurization Service — server-side only.
 *
 * Fetches a file from a Supabase storage URL (or accepts raw base64),
 * forwards the image to Claude Vision via the anthropic service, and
 * returns a validated StructuredPassage object.
 *
 * Public API:
 *   structurizePassage({ fileUrl } | { base64, mediaType }) → StructuredPassage
 *   structurizeFromUrl(fileUrl)                              → StructuredPassage
 *   structurizeFromBase64(base64, mediaType, passageId)      → StructuredPassage
 */

import { createStructurizeRequest, extractJsonFromText, AnthropicServiceError } from './anthropic'
import type { StructuredPassage, UploadedFile } from '@/lib/types'

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

/** Maximum number of attempts before giving up */
const MAX_RETRIES = 3

/** Base delay (ms) for exponential back-off */
const RETRY_BASE_DELAY_MS = 1000

/** Supported image MIME types that can be sent directly to Claude Vision */
const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

// -----------------------------------------------------------
// Error class
// -----------------------------------------------------------

export class StructurizerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message)
    this.name = 'StructurizerError'
  }
}

// -----------------------------------------------------------
// Internal: Claude Vision response type (raw JSON from prompt)
// -----------------------------------------------------------

/**
 * Shape returned by Claude when given the structurize system prompt.
 * Fields here map to the full prompt schema defined in
 * data/prompts/structurize_passage.txt (richer than StructuredPassage).
 */
interface ClaudePassageResponse {
  passage_id: string
  source?: string
  exam_context?: string | null
  title?: string | null
  word_count: number
  overall_topic: string
  overall_difficulty: number
  dominant_grammar_points?: string[]
  dominant_vocab_themes?: string[]
  paragraphs: Array<{
    index: number
    text: string
    sentences: Array<{
      index: number
      text: string
      key_grammar?: string[]
      key_vocab?: Array<{
        word: string
        meaning: string
        pos: string
        synonyms?: string[]
        antonyms?: string[]
      }>
    }>
  }>
  ocr_warnings?: Array<{
    paragraph_index: number
    sentence_index: number
    original_text: string
    issue: string
  }>
  // Error shape returned by Claude when no passage is found
  error?: string
  message?: string
}

// -----------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------

/** Sleep for `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Exponential back-off retry wrapper.
 * Retries only when the underlying error is marked retryable OR when it
 * originates from a transient network / rate-limit problem.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err

      const isRetryable =
        (err instanceof AnthropicServiceError && err.retryable) ||
        (err instanceof StructurizerError && err.retryable)

      if (!isRetryable || attempt === MAX_RETRIES) break

      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
      console.warn(
        `[structurizer] ${label} failed (attempt ${attempt}/${MAX_RETRIES}), ` +
          `retrying in ${delay}ms…`,
        err
      )
      await sleep(delay)
    }
  }
  throw lastError
}

/**
 * Map MIME type string to the union accepted by the Anthropic SDK.
 */
function toAnthropicMediaType(
  mimeType: string
): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  if (SUPPORTED_IMAGE_TYPES.has(mimeType)) {
    return mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  }
  throw new StructurizerError(
    `Unsupported image type "${mimeType}". Supported: ${[...SUPPORTED_IMAGE_TYPES].join(', ')}`,
    'UNSUPPORTED_MEDIA_TYPE'
  )
}

/**
 * Convert the rich Claude response to the canonical StructuredPassage shape.
 * The Claude prompt returns more detail (grammar analysis, vocab themes, etc.)
 * than StructuredPassage requires; we normalise here and discard the surplus.
 */
function mapClaudeResponseToStructuredPassage(
  raw: ClaudePassageResponse,
  passageId: string,
  sourceFile?: UploadedFile
): StructuredPassage {
  // Build flat sentence list for global sentenceIndex in KeyVocab
  let globalSentenceIndex = 0
  const paragraphs: StructuredPassage['paragraphs'] = []
  const keyVocabMap: Map<string, StructuredPassage['keyVocab'][number]> = new Map()

  for (const para of raw.paragraphs) {
    const sentences: StructuredPassage['paragraphs'][number]['sentences'] = []

    for (const sent of para.sentences) {
      sentences.push({
        index: sent.index,
        text: sent.text,
        // marker: if the sentence text contains a circled number at the start, extract it
        ...(sent.text.match(/^[①②③④⑤⑥⑦⑧⑨⑩]/)
          ? { marker: sent.text.match(/^([①②③④⑤⑥⑦⑧⑨⑩])/)![1] }
          : {}),
      })

      // Collect vocab from every sentence, deduplicate by word lemma
      for (const v of sent.key_vocab ?? []) {
        if (!keyVocabMap.has(v.word)) {
          keyVocabMap.set(v.word, {
            word: v.word,
            pos: v.pos,
            definition: v.meaning, // Claude returns Korean meaning; use as definition
            definitionKo: v.meaning,
            sentenceIndex: globalSentenceIndex,
          })
        }
      }

      globalSentenceIndex++
    }

    paragraphs.push({
      index: para.index,
      sentences,
      rawText: para.text,
    })
  }

  // Derive fullText from the paragraph rawText fields
  const fullText = raw.paragraphs.map((p) => p.text).join('\n\n')

  // topics: use vocab themes if available, otherwise fall back to overall_topic words
  const topics: string[] =
    raw.dominant_vocab_themes && raw.dominant_vocab_themes.length > 0
      ? raw.dominant_vocab_themes
      : raw.overall_topic
        ? [raw.overall_topic]
        : []

  return {
    id: passageId,
    title: raw.title ?? undefined,
    paragraphs,
    keyVocab: [...keyVocabMap.values()],
    fullText,
    wordCount: raw.word_count,
    estimatedDifficulty: raw.overall_difficulty,
    topics,
    structurizedAt: new Date().toISOString(),
    ...(sourceFile ? { sourceFile } : {}),
  }
}

/**
 * Validate the parsed StructuredPassage and throw if it is structurally invalid.
 */
function validateStructuredPassage(passage: StructuredPassage): void {
  if (!passage.id) {
    throw new StructurizerError('StructuredPassage missing id', 'INVALID_OUTPUT')
  }
  if (!Array.isArray(passage.paragraphs) || passage.paragraphs.length === 0) {
    throw new StructurizerError(
      'StructuredPassage has no paragraphs — Claude may not have found a readable passage',
      'NO_PARAGRAPHS'
    )
  }
  if (!passage.fullText || passage.fullText.trim().length < 10) {
    throw new StructurizerError(
      'StructuredPassage fullText is too short to be valid',
      'EMPTY_PASSAGE'
    )
  }
  if (passage.wordCount < 1) {
    throw new StructurizerError(
      'StructuredPassage wordCount must be ≥ 1',
      'INVALID_WORD_COUNT'
    )
  }
  if (passage.estimatedDifficulty < 1 || passage.estimatedDifficulty > 5) {
    throw new StructurizerError(
      `estimatedDifficulty must be 1–5, got ${passage.estimatedDifficulty}`,
      'INVALID_DIFFICULTY'
    )
  }
}

/**
 * Core function: send base64 image to Claude, parse + validate the result.
 */
async function runStructurize(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  passageId: string,
  sourceFile?: UploadedFile
): Promise<StructuredPassage> {
  const { raw } = await createStructurizeRequest(imageBase64, mediaType, passageId)

  // Parse the JSON Claude returned
  let parsed: ClaudePassageResponse
  try {
    parsed = extractJsonFromText(raw) as ClaudePassageResponse
  } catch (parseErr) {
    throw new StructurizerError(
      `Failed to parse Claude JSON response: ${(parseErr as Error).message}`,
      'JSON_PARSE_ERROR',
      /* retryable */ true
    )
  }

  // Claude signals an error when it cannot find a passage
  if (parsed.error) {
    throw new StructurizerError(
      `Claude could not extract a passage: ${parsed.message ?? parsed.error}`,
      parsed.error,
      /* retryable */ false
    )
  }

  const structured = mapClaudeResponseToStructuredPassage(parsed, passageId, sourceFile)
  validateStructuredPassage(structured)
  return structured
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Structurize a passage from a publicly accessible file URL.
 *
 * The function fetches the file, converts it to base64, and forwards it to
 * Claude Vision. Only image formats (JPEG, PNG, GIF, WebP) are supported
 * directly; PDF handling must be done by the caller (e.g. with pdf.js in
 * the browser, rendering each page to a canvas and calling
 * structurizeFromBase64 for each page image).
 *
 * @param fileUrl   Public URL of the image file (e.g. a Supabase Storage URL)
 * @param passageId Optional ID to assign; a UUID is generated if omitted
 * @param sourceFile Optional UploadedFile metadata to embed in the result
 */
export async function structurizeFromUrl(
  fileUrl: string,
  passageId: string = crypto.randomUUID(),
  sourceFile?: UploadedFile
): Promise<StructuredPassage> {
  return withRetry(async () => {
    // Fetch the file
    let response: Response
    try {
      response = await fetch(fileUrl)
    } catch (fetchErr) {
      throw new StructurizerError(
        `Network error fetching file at "${fileUrl}": ${(fetchErr as Error).message}`,
        'FETCH_ERROR',
        /* retryable */ true
      )
    }

    if (!response.ok) {
      throw new StructurizerError(
        `Failed to fetch file at "${fileUrl}": HTTP ${response.status} ${response.statusText}`,
        'FETCH_HTTP_ERROR',
        /* retryable */ response.status >= 500
      )
    }

    const contentType = response.headers.get('content-type') ?? ''
    // Strip parameters like "; charset=utf-8"
    const mimeType = contentType.split(';')[0].trim()

    if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) {
      throw new StructurizerError(
        `File at "${fileUrl}" has unsupported MIME type "${mimeType}". ` +
          `For PDFs, render each page to an image first (e.g. with pdf.js) ` +
          `and call structurizeFromBase64 for each page image.`,
        'UNSUPPORTED_MEDIA_TYPE'
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const anthropicMediaType = toAnthropicMediaType(mimeType)

    return runStructurize(base64, anthropicMediaType, passageId, sourceFile)
  }, `structurizeFromUrl(${fileUrl})`)
}

/**
 * Structurize a passage from a raw base64-encoded image.
 *
 * Use this when you already have the image data (e.g. after rendering a PDF
 * page to a canvas in the browser and obtaining a data URL, or after a
 * server-side resize/conversion step).
 *
 * @param base64     Base64-encoded image data, WITHOUT the "data:…;base64," prefix
 * @param mediaType  MIME type string, e.g. "image/jpeg"
 * @param passageId  Optional ID; a UUID is generated if omitted
 * @param sourceFile Optional UploadedFile metadata to embed in the result
 */
export async function structurizeFromBase64(
  base64: string,
  mediaType: string,
  passageId: string = crypto.randomUUID(),
  sourceFile?: UploadedFile
): Promise<StructuredPassage> {
  const anthropicMediaType = toAnthropicMediaType(mediaType)

  return withRetry(
    () => runStructurize(base64, anthropicMediaType, passageId, sourceFile),
    `structurizeFromBase64(mediaType=${mediaType})`
  )
}

// -----------------------------------------------------------
// Unified dispatcher used by the /api/structurize route
// -----------------------------------------------------------

export type StructurizeInput =
  | { fileUrl: string; base64?: undefined; mediaType?: undefined }
  | { base64: string; mediaType: string; fileUrl?: undefined }

/**
 * Unified dispatcher: accepts either a remote file URL or raw base64 + mediaType.
 * This is the primary entry point used by the Next.js API route.
 *
 * @param input  Either `{ fileUrl }` or `{ base64, mediaType }`
 */
export async function structurizePassage(input: StructurizeInput): Promise<StructuredPassage> {
  if ('fileUrl' in input && input.fileUrl != null) {
    return structurizeFromUrl(input.fileUrl)
  }
  // Discriminated union: fileUrl branch is exhausted, base64 and mediaType are present
  const { base64, mediaType } = input as { base64: string; mediaType: string }
  return structurizeFromBase64(base64, mediaType)
}

// -----------------------------------------------------------
// Re-export types so API routes can import them from this module
// -----------------------------------------------------------
export type { StructuredPassage, UploadedFile } from '@/lib/types'
