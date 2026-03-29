/**
 * anthropic.ts
 * Low-level wrapper around the Anthropic SDK.
 * All functions in this module are server-side only.
 *
 * This module provides thin request builders that accept pre-assembled
 * prompts (built by prompt-builder.ts) and return raw text + usage stats.
 *
 * Primary request builders:
 *   callClaude            – generic: send system + user prompt, get raw text
 *   callClaudeWithVision  – vision: send system prompt + image, get raw text
 */

import Anthropic from '@anthropic-ai/sdk'

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

const STRUCTURIZE_MODEL = 'claude-sonnet-4-20250514' // vision-capable model
const GENERATION_MODEL = 'claude-sonnet-4-20250514'
const VALIDATION_MODEL = 'claude-sonnet-4-20250514'

const MAX_TOKENS_STRUCTURIZE = 4096
const MAX_TOKENS_GENERATE = 8192
const MAX_TOKENS_VALIDATE = 4096

export type TaskType = 'structurize' | 'generate' | 'validate'

const MODEL_MAP: Record<TaskType, string> = {
  structurize: STRUCTURIZE_MODEL,
  generate: GENERATION_MODEL,
  validate: VALIDATION_MODEL,
}

const MAX_TOKENS_MAP: Record<TaskType, number> = {
  structurize: MAX_TOKENS_STRUCTURIZE,
  generate: MAX_TOKENS_GENERATE,
  validate: MAX_TOKENS_VALIDATE,
}

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
// Response types
// -----------------------------------------------------------

export interface ClaudeRawResponse {
  raw: string
  usage: { input_tokens: number; output_tokens: number }
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
// Helper: extract text from Claude response content blocks
// -----------------------------------------------------------

function extractTextFromContent(
  content: Anthropic.Messages.ContentBlock[]
): string {
  const textBlock = content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new AnthropicServiceError(
      'Claude returned no text content',
      'EMPTY_RESPONSE'
    )
  }
  return textBlock.text
}

// -----------------------------------------------------------
// 1. callClaude
//    Generic text-only request: system prompt + user message.
//    Used by generator (Stage 2) and validator (Stage 3).
// -----------------------------------------------------------

/**
 * Send a system prompt and user message to Claude, returning the raw text.
 *
 * @param systemPrompt  Static system instructions (from prompt-builder)
 * @param userMessage   Dynamic user message with RAG-injected content
 * @param task          Task type to select model and token limits
 */
export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  task: TaskType = 'generate'
): Promise<ClaudeRawResponse> {
  const client = getClient()

  const message = await client.messages.create({
    model: MODEL_MAP[task],
    max_tokens: MAX_TOKENS_MAP[task],
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  return {
    raw: extractTextFromContent(message.content),
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    },
  }
}

// -----------------------------------------------------------
// 2. callClaudeWithVision
//    Vision request: system prompt + image + optional text.
//    Used by structurizer (Stage 1).
// -----------------------------------------------------------

/**
 * Send a system prompt and an image to Claude Vision, returning raw text.
 *
 * @param systemPrompt  The structurize system prompt (from prompt-builder)
 * @param imageBase64   Base64-encoded image data (no data-URL prefix)
 * @param mediaType     MIME type of the image
 * @param userText      Optional user text to accompany the image
 */
export async function callClaudeWithVision(
  systemPrompt: string,
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  userText: string = 'Please analyse this reading passage image and return the structured JSON as instructed.'
): Promise<ClaudeRawResponse> {
  const client = getClient()

  const message = await client.messages.create({
    model: MODEL_MAP.structurize,
    max_tokens: MAX_TOKENS_MAP.structurize,
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
            text: userText,
          },
        ],
      },
    ],
  })

  return {
    raw: extractTextFromContent(message.content),
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
