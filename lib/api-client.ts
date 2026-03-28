/**
 * lib/api-client.ts
 *
 * Thin helpers that call the Next.js API routes from client components.
 * Each function:
 *   1. Gets the current Supabase session token.
 *   2. POSTs to the appropriate /api/* route with the token in the
 *      Authorization header.
 *   3. Returns the parsed response data (or an ArrayBuffer for binary exports).
 *
 * basePath-aware: reads __NEXT_PUBLIC_BASE_PATH at runtime so the fetch
 * URLs work both on localhost and under the /EngenP GitHub-Pages prefix.
 */

import { supabase } from '@/lib/supabase'
import type {
  StructuredPassage,
  GeneratedQuestion,
  GenerationOptions,
  QuestionTypeId,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve the basePath set in next.config.mjs at build time. */
function basePath(): string {
  // Next.js injects this constant during the build; falls back to '' in tests.
  return (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.runtimeConfig?.basePath)
    ? (window as any).__NEXT_DATA__.runtimeConfig.basePath
    : (process.env.NEXT_PUBLIC_BASE_PATH ?? '')
}

function apiUrl(path: string): string {
  return `${basePath()}${path}`
}

/** Get the current bearer token. Throws if the user is not authenticated. */
async function getToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('로그인이 필요합니다.')
  }
  return session.access_token
}

/** Core fetch wrapper used by all JSON-returning routes. */
async function apiFetch<T>(endpoint: string, body: unknown): Promise<T> {
  const token = await getToken()
  const res = await fetch(apiUrl(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    let message: string
    try {
      const errJson = await res.json()
      message = errJson?.error ?? res.statusText
    } catch {
      message = await res.text().catch(() => res.statusText)
    }
    throw new Error(message)
  }

  const json = await res.json()
  return json.data as T
}

/** Core fetch wrapper for binary-returning routes (e.g. /api/export). */
async function apiFetchBinary(endpoint: string, body: unknown): Promise<ArrayBuffer> {
  const token = await getToken()
  const res = await fetch(apiUrl(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    let message: string
    try {
      const errJson = await res.json()
      message = errJson?.error ?? res.statusText
    } catch {
      message = await res.text().catch(() => res.statusText)
    }
    throw new Error(message)
  }

  return res.arrayBuffer()
}

// ---------------------------------------------------------------------------
// Map sidebar question-type IDs → generator QuestionTypeId values
// ---------------------------------------------------------------------------

const SIDEBAR_TYPE_MAP: Record<string, QuestionTypeId> = {
  grammar: 'grammar_choice',
  vocabulary: 'vocabulary_choice',
  blank: 'blank_inference',
  order: 'sentence_ordering',
  insertion: 'sentence_insertion',
  title: 'topic_summary',
  purpose: 'topic_summary',
  summary: 'topic_summary',
  implication: 'vocabulary_choice',
  mood: 'vocabulary_choice',
}

export function mapSidebarTypes(sidebarTypes: string[]): QuestionTypeId[] {
  const mapped = sidebarTypes
    .map((t) => SIDEBAR_TYPE_MAP[t])
    .filter((t): t is QuestionTypeId => Boolean(t))

  // Deduplicate while preserving order
  return [...new Set(mapped)]
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Call /api/structurize with a public Supabase Storage URL.
 * Returns the structured passage.
 */
export async function structurizeFile(fileUrl: string): Promise<StructuredPassage> {
  return apiFetch<StructuredPassage>('/api/structurize', { fileUrl })
}

/**
 * Call /api/generate with the structured passage and user-selected options.
 * Returns an array of generated questions.
 *
 * @param passage         Result from structurizeFile()
 * @param options         Generation options (types, difficulty, count)
 */
export async function generateQuestions(
  passage: StructuredPassage,
  options: Partial<GenerationOptions>
): Promise<GeneratedQuestion[]> {
  return apiFetch<GeneratedQuestion[]>('/api/generate', { passage, options })
}

/**
 * Call /api/export to produce a .docx ArrayBuffer, then trigger a browser
 * download.  Returns true on success.
 *
 * @param questions   Array of GeneratedQuestion from generateQuestions()
 * @param passage     The StructuredPassage the questions were generated from
 * @param filename    Optional custom filename (default: "exam-questions.docx")
 */
export async function exportDocx(
  questions: GeneratedQuestion[],
  passage: StructuredPassage,
  filename = 'exam-questions.docx'
): Promise<void> {
  const buffer = await apiFetchBinary('/api/export', {
    questions,
    passage,
    format: 'docx',
  })

  // Trigger browser download
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
