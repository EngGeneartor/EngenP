/**
 * dna-analyzer.ts
 * School Exam DNA Analysis Service — server-side only.
 *
 * Analyzes uploaded past exam paper images using Claude Vision to extract
 * the school's unique exam "DNA": question type preferences, difficulty
 * patterns, grammar focus areas, vocabulary style, distractor patterns, etc.
 *
 * Public API:
 *   analyzeExamDna(examFiles, metadata?) → SchoolDnaProfile
 */

import path from 'path'
import fs from 'fs/promises'
import Anthropic from '@anthropic-ai/sdk'
import { extractJsonFromText, AnthropicServiceError } from './anthropic'
import type { SchoolDnaProfile } from '@/lib/types'

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

const PROMPTS_DIR = path.join(process.cwd(), 'data', 'prompts')
const DNA_MODEL = 'claude-sonnet-4-20250514'
const DNA_MAX_TOKENS = 8192

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export interface ExamFileInput {
  /** Base64-encoded image data (for image files) */
  base64?: string
  mediaType?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  /** Public URL for document files (PDF, DOCX) — fetched server-side */
  url?: string
  /** MIME type for URL-based files */
  urlMediaType?: 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

export interface ExamMetadata {
  school_name?: string
  school_id?: string
  grade?: number
  exam_papers?: Array<{
    semester: number
    exam_type: 'midterm' | 'final'
    year: number
    image_index: number
  }>
}

export class DnaAnalyzerError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = 'DnaAnalyzerError'
  }
}

// -----------------------------------------------------------
// Client singleton
// -----------------------------------------------------------

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (_client) return _client

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new AnthropicServiceError(
      'ANTHROPIC_API_KEY environment variable is not set.',
      'MISSING_API_KEY'
    )
  }

  _client = new Anthropic({ apiKey })
  return _client
}

// -----------------------------------------------------------
// Prompt loader
// -----------------------------------------------------------

let _dnaPromptCache: string | null = null

async function loadDnaPrompt(): Promise<string> {
  if (_dnaPromptCache) return _dnaPromptCache
  const filePath = path.join(PROMPTS_DIR, 'analyze_exam_dna.txt')
  _dnaPromptCache = await fs.readFile(filePath, 'utf-8')
  return _dnaPromptCache
}

// -----------------------------------------------------------
// Fetch a URL and return its base64 content + mime type
// -----------------------------------------------------------

async function fetchFileAsBase64(
  url: string
): Promise<{ base64: string; mediaType: string }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new DnaAnalyzerError(
      `Failed to fetch file from URL: ${response.status} ${response.statusText}`,
      'FETCH_FAILED'
    )
  }
  const arrayBuffer = await response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
  return { base64, mediaType: contentType.split(';')[0].trim() }
}

// -----------------------------------------------------------
// Build multimodal user message with all exam files
// -----------------------------------------------------------

async function buildDnaUserMessage(
  examFiles: ExamFileInput[],
  metadata?: ExamMetadata
): Promise<Anthropic.Messages.MessageParam> {
  const contentBlocks: Anthropic.Messages.ContentBlockParam[] = []

  let imageCount = 0
  let docCount = 0

  // Add all exam files (images or documents)
  for (let i = 0; i < examFiles.length; i++) {
    const file = examFiles[i]

    if (file.base64 && file.mediaType) {
      // Direct base64 image
      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: file.mediaType,
          data: file.base64,
        },
      })
      imageCount++
    } else if (file.url) {
      const isPdf = file.urlMediaType === 'application/pdf' ||
        file.url.toLowerCase().endsWith('.pdf')

      if (isPdf) {
        // Fetch PDF and embed as base64 document block
        const { base64 } = await fetchFileAsBase64(file.url)
        contentBlocks.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64,
          },
        } as unknown as Anthropic.Messages.ContentBlockParam)
        docCount++
      } else {
        // DOCX or other: fetch text content and embed as text description
        contentBlocks.push({
          type: 'text',
          text: `[Document file ${i + 1}: ${file.url} — this is a Word document (.docx) exam paper. Analyze its content as an exam paper.]`,
        })
        docCount++
      }
    }
  }

  // Add text instruction with optional metadata
  const totalFiles = imageCount + docCount
  let textContent = `Exam paper file(s) provided above (${totalFiles} file(s) total: ${imageCount} image(s), ${docCount} document(s)).`

  if (metadata) {
    textContent += `\n\nExam Metadata (INPUT 2):\n\`\`\`json\n${JSON.stringify(metadata, null, 2)}\n\`\`\``
  }

  textContent += '\n\nAnalyze the provided exam paper file(s) and output the Exam DNA profile JSON as instructed.'

  contentBlocks.push({
    type: 'text',
    text: textContent,
  })

  return {
    role: 'user',
    content: contentBlocks,
  }
}

// -----------------------------------------------------------
// Post-process: inject timestamp into profile_id
// -----------------------------------------------------------

function injectTimestamp(profile: SchoolDnaProfile): SchoolDnaProfile {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const schoolId = profile.school_id ?? 'unknown'
  const grade = profile.grade ?? 0

  return {
    ...profile,
    profile_id: `dna_${schoolId}_${grade}_${ts}`,
    analysis_basis: {
      ...profile.analysis_basis,
      analysis_date: new Date().toISOString(),
    },
  }
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Analyze exam DNA from uploaded past school exam images.
 *
 * Sends all exam images to Claude Vision in a single multimodal request,
 * using the analyze_exam_dna.txt system prompt to extract the school's
 * unique exam DNA profile.
 *
 * @param examFiles  Array of base64-encoded exam images with media types
 * @param metadata   Optional exam metadata (school name, grade, etc.)
 * @returns          Fully extracted SchoolDnaProfile
 */
export async function analyzeExamDna(
  examFiles: ExamFileInput[],
  metadata?: ExamMetadata
): Promise<SchoolDnaProfile> {
  if (!examFiles || examFiles.length === 0) {
    throw new DnaAnalyzerError(
      'At least one exam file must be provided for DNA analysis.',
      'NO_FILES'
    )
  }

  // Cap at 20 images to avoid hitting context limits
  const MAX_IMAGES = 20
  if (examFiles.length > MAX_IMAGES) {
    console.warn(
      `[dna-analyzer] ${examFiles.length} images provided; truncating to ${MAX_IMAGES}`
    )
    examFiles = examFiles.slice(0, MAX_IMAGES)
  }

  // Load the DNA analysis system prompt
  const systemPrompt = await loadDnaPrompt()

  // Build the multimodal user message (async — may fetch remote files)
  const userMessage = await buildDnaUserMessage(examFiles, metadata)

  // Call Claude Vision
  const client = getClient()

  let rawText: string
  try {
    const response = await client.messages.create({
      model: DNA_MODEL,
      max_tokens: DNA_MAX_TOKENS,
      system: systemPrompt,
      messages: [userMessage],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new DnaAnalyzerError(
        'Claude returned no text content for DNA analysis.',
        'EMPTY_RESPONSE'
      )
    }
    rawText = textBlock.text
  } catch (err) {
    if (err instanceof DnaAnalyzerError) throw err
    throw new DnaAnalyzerError(
      `Claude API call failed during DNA analysis: ${(err as Error).message}`,
      'API_ERROR'
    )
  }

  // Parse the JSON response
  let parsed: unknown
  try {
    parsed = extractJsonFromText(rawText)
  } catch (err) {
    throw new DnaAnalyzerError(
      `Failed to parse DNA analysis JSON response: ${(err as Error).message}`,
      'JSON_PARSE_ERROR'
    )
  }

  // Check for error response from Claude
  const maybeError = parsed as { error?: string; reason?: string }
  if (maybeError.error === 'ANALYSIS_FAILED') {
    throw new DnaAnalyzerError(
      maybeError.reason ?? 'DNA analysis failed: exam papers could not be recognized.',
      'ANALYSIS_FAILED'
    )
  }

  const profile = parsed as SchoolDnaProfile

  // Validate minimal required fields
  if (!profile.question_type_distribution || !profile.analysis_basis) {
    throw new DnaAnalyzerError(
      'DNA profile is missing required fields (question_type_distribution or analysis_basis).',
      'INVALID_PROFILE'
    )
  }

  // Inject actual timestamp into profile_id
  return injectTimestamp(profile)
}
