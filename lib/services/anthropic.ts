/**
 * anthropic.ts
 * Low-level wrapper around the Anthropic SDK.
 * All functions in this module are server-side only.
 *
 * Three primary request builders:
 *   createStructurizeRequest  – sends an image to Claude Vision and returns a StructuredPassage JSON
 *   createGenerateRequest     – sends a passage + question-type rules to Claude and returns questions
 *   createValidateRequest     – asks Claude to validate a batch of generated questions
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  StructuredPassage,
  GeneratedQuestion,
  GenerationOptions,
  ValidationResult,
  QuestionTypeTemplate,
} from '@/lib/types'

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

const STRUCTURIZE_MODEL = 'claude-sonnet-4-6-20250514' // vision-capable model
const GENERATION_MODEL = 'claude-sonnet-4-6-20250514'
const VALIDATION_MODEL = 'claude-sonnet-4-6-20250514'

const MAX_TOKENS_STRUCTURIZE = 4096
const MAX_TOKENS_GENERATE = 8192
const MAX_TOKENS_VALIDATE = 4096

// -----------------------------------------------------------
// Client singleton (created lazily so env var is read at runtime)
// -----------------------------------------------------------

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (_client) return _client

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new AnthropicServiceError(
      'ANTHROPIC_API_KEY environment variable is not set. ' +
        'Set it in .env.local for local development.',
      'MISSING_API_KEY'
    )
  }

  _client = new Anthropic({ apiKey })
  return _client
}

// -----------------------------------------------------------
// Error class
// -----------------------------------------------------------

export class AnthropicServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message)
    this.name = 'AnthropicServiceError'
  }
}

// -----------------------------------------------------------
// Helper: parse JSON from a Claude text response
// -----------------------------------------------------------

function extractJsonFromText(text: string): unknown {
  // Claude may wrap JSON in a markdown code fence
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1].trim())
  }
  // Otherwise try to parse the whole response as JSON
  return JSON.parse(text.trim())
}

// -----------------------------------------------------------
// 1. createStructurizeRequest
//    Sends a base64-encoded image to Claude Vision and returns
//    the raw text Claude produced (to be parsed upstream).
// -----------------------------------------------------------

export interface StructurizeRawResponse {
  raw: string
  usage: { input_tokens: number; output_tokens: number }
}

/**
 * Ask Claude to analyse an image of a reading passage and return
 * structured JSON matching the StructuredPassage interface.
 *
 * @param imageBase64  Base64-encoded image data (no data-URL prefix)
 * @param mediaType    MIME type of the image, e.g. "image/jpeg"
 * @param passageId    ID to embed in the returned JSON
 */
export async function createStructurizeRequest(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  passageId: string = crypto.randomUUID()
): Promise<StructurizeRawResponse> {
  const client = getClient()

  const systemPrompt = `You are an expert English reading passage analyser for Korean high-school exam preparation (수능 / 내신).
Your task is to extract and structure the reading passage visible in the image into a precise JSON object.

Return ONLY valid JSON — no prose, no markdown fences. The JSON must conform exactly to this TypeScript interface:

{
  "id": string,
  "title": string | null,
  "paragraphs": [
    {
      "index": number,         // 0-based paragraph index
      "sentences": [
        {
          "index": number,     // 0-based sentence index within the paragraph
          "text": string,      // exact sentence text as it appears in the image
          "marker": string     // circled number "①"–"⑤" if present, else omit
        }
      ],
      "rawText": string        // full paragraph text joined from sentences
    }
  ],
  "keyVocab": [
    {
      "word": string,
      "pos": string,           // "noun" | "verb" | "adjective" | "adverb" | "other"
      "definition": string,    // concise English definition
      "definitionKo": string,  // Korean definition
      "sentenceIndex": number  // 0-based index in the flattened sentence list
    }
  ],
  "fullText": string,          // complete passage text
  "wordCount": number,
  "estimatedDifficulty": number, // 1 (easy) – 5 (very hard), 수능 scale
  "topics": string[],          // 2-5 topic tags in English, e.g. ["environment","science"]
  "structurizedAt": string     // ISO 8601 timestamp
}

Rules:
- Preserve the exact original spelling and punctuation from the image.
- Identify 5-10 key vocabulary items per passage.
- Set "id" to the value "${passageId}".
- Set "structurizedAt" to the current UTC time.`

  const message = await client.messages.create({
    model: STRUCTURIZE_MODEL,
    max_tokens: MAX_TOKENS_STRUCTURIZE,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: 'Please analyse this reading passage image and return the structured JSON as instructed.',
          },
        ],
      },
    ],
  })

  const textBlock = message.content.find((b: { type: string }) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new AnthropicServiceError(
      'Claude returned no text content for structurize request',
      'EMPTY_RESPONSE'
    )
  }

  return {
    raw: textBlock.text,
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    },
  }
}

// -----------------------------------------------------------
// 2. createGenerateRequest
//    Sends a structured passage + question-type rules to Claude
//    and returns the raw text to be parsed upstream.
// -----------------------------------------------------------

export interface GenerateRawResponse {
  raw: string
  usage: { input_tokens: number; output_tokens: number }
}

/**
 * Ask Claude to generate exam questions based on a structured passage.
 *
 * @param passage        Structured passage produced by the structurizer
 * @param questionTypes  Loaded question-type templates from data/question_types/
 * @param options        Generation options (count, difficulty, …)
 */
export async function createGenerateRequest(
  passage: StructuredPassage,
  questionTypes: QuestionTypeTemplate[],
  options: GenerationOptions
): Promise<GenerateRawResponse> {
  const client = getClient()

  // Build a compact representation of each question type's rules
  const typeDescriptions = questionTypes
    .map(
      (qt) => `
### Question type: ${qt.type_id} (${qt.type_name_en} / ${qt.type_name_ko})
Description: ${qt.description}
Difficulty range: ${qt.difficulty_range[0]}–${qt.difficulty_range[1]}
Instruction template: "${qt.instruction_template}"
Generation rules:
${qt.generation_rules.map((r: string, i: number) => `  ${i + 1}. ${r}`).join('\n')}
Output schema fields:
${Object.entries(qt.output_schema)
  .map(([k, v]) => `  - ${k}: ${v ?? 'null'}`)
  .join('\n')}
Example:
${JSON.stringify(qt.examples[0], null, 2)}
`
    )
    .join('\n---\n')

  const systemPrompt = `You are an expert Korean high-school English exam question writer (수능 / 내신 준비).
You generate high-quality, authentic exam questions from English reading passages.

Follow ALL generation rules for each question type exactly.
Return ONLY a valid JSON array of question objects — no prose, no markdown fences.
Each object must include every field listed in the output schema for its type.
Assign sequential question_number values starting from 1.`

  const userPrompt = `## Reading Passage

Title: ${passage.title ?? '(untitled)'}
Word count: ${passage.wordCount}
Estimated difficulty: ${passage.estimatedDifficulty}/5
Topics: ${passage.topics.join(', ')}

Full text:
"""
${passage.fullText}
"""

---

## Question Types to Generate

${typeDescriptions}

---

## Generation Instructions

- Target difficulty: ${options.difficulty}/5
- Total questions to generate: ${options.count}
- Distribute evenly across the ${questionTypes.length} type(s): ${questionTypes.map((t) => t.type_id).join(', ')}
- Explanation language: ${options.explanationLanguage ?? 'Korean (한국어)'}
${options.topicHints?.length ? `- Topic hints: ${options.topicHints.join(', ')}` : ''}

Return a JSON array of ${options.count} question object(s) following the schemas above.`

  const message = await client.messages.create({
    model: GENERATION_MODEL,
    max_tokens: MAX_TOKENS_GENERATE,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = message.content.find((b: { type: string }) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new AnthropicServiceError(
      'Claude returned no text content for generate request',
      'EMPTY_RESPONSE'
    )
  }

  return {
    raw: textBlock.text,
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    },
  }
}

// -----------------------------------------------------------
// 3. createValidateRequest
//    Asks Claude to review generated questions and report issues.
// -----------------------------------------------------------

export interface ValidateRawResponse {
  raw: string
  usage: { input_tokens: number; output_tokens: number }
}

/**
 * Ask Claude to validate a set of generated questions against a passage.
 *
 * @param questions  Questions to validate
 * @param passage    The passage the questions are based on
 */
export async function createValidateRequest(
  questions: GeneratedQuestion[],
  passage: StructuredPassage
): Promise<ValidateRawResponse> {
  const client = getClient()

  const systemPrompt = `You are a senior English exam quality-control specialist.
Your job is to review generated exam questions and identify any errors or issues.

Return ONLY a valid JSON object — no prose, no markdown fences — that matches:
{
  "valid": boolean,
  "issues": [
    {
      "questionNumber": number,
      "field": string,          // e.g. "answer", "passage_with_markers", "explanation"
      "severity": "error" | "warning",
      "message": string         // concise description of the problem in English
    }
  ],
  "invalidQuestionNumbers": number[]  // question_numbers that have at least one "error"-severity issue
}`

  const userPrompt = `## Original Passage

${passage.fullText}

---

## Questions to Validate

${JSON.stringify(questions, null, 2)}

---

## Validation Criteria

For each question check:
1. The answer is factually correct and supported by the passage.
2. All circled-number markers (①–⑤) in passage_with_markers are present and match the answer.
3. The instruction matches the question type template.
4. The explanation correctly identifies why the answer is correct/incorrect.
5. Difficulty is appropriate for the content and complexity.
6. No answer choices are obviously wrong or duplicate.
7. Korean text (explanations, test_point) is grammatically correct.
8. The passage_with_markers text matches the original passage with only markers added.

Return the ValidationResult JSON.`

  const message = await client.messages.create({
    model: VALIDATION_MODEL,
    max_tokens: MAX_TOKENS_VALIDATE,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = message.content.find((b: { type: string }) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new AnthropicServiceError(
      'Claude returned no text content for validate request',
      'EMPTY_RESPONSE'
    )
  }

  return {
    raw: textBlock.text,
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    },
  }
}

// -----------------------------------------------------------
// Re-export the JSON extraction helper for use by higher-level services
// -----------------------------------------------------------
export { extractJsonFromText }
