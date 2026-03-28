"use client"

/**
 * useGenerationStream
 *
 * React hook that drives the /api/generate-stream SSE endpoint and
 * exposes reactive state for every pipeline step.
 *
 * Usage:
 *   const { step, message, passage, questions, error, isStreaming, startGeneration } =
 *     useGenerationStream()
 *
 *   await startGeneration({
 *     fileUrl: 'https://…',          // or base64 + mediaType
 *     options: { types: ['vocabulary_choice'], difficulty: 3, count: 5 }
 *   })
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { StructuredPassage, GeneratedQuestion, GenerationOptions } from '@/lib/types'

// ---------------------------------------------------------------------------
// Step type — matches the SSE event shapes emitted by the route
// ---------------------------------------------------------------------------

export type GenerationStep =
  | 'idle'
  | 'structurizing'
  | 'structurized'
  | 'generating'
  | 'validating'
  | 'correcting'
  | 'completed'
  | 'error'

// ---------------------------------------------------------------------------
// Params accepted by startGeneration
// ---------------------------------------------------------------------------

export type GenerationParams =
  | { fileUrl: string; base64?: undefined; mediaType?: undefined; options?: Partial<GenerationOptions> }
  | { base64: string; mediaType: string; fileUrl?: undefined; options?: Partial<GenerationOptions> }

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseGenerationStreamReturn {
  /** Current pipeline step */
  step: GenerationStep
  /** Human-readable status message (Korean) */
  message: string
  /** Structured passage once the structurize step completes */
  passage: StructuredPassage | null
  /** Generated questions once the pipeline completes */
  questions: GeneratedQuestion[]
  /** Error message if step === 'error' */
  error: string | null
  /** True while the SSE stream is open */
  isStreaming: boolean
  /** Kick off a new generation run */
  startGeneration: (params: GenerationParams) => Promise<void>
  /** Reset all state back to idle */
  reset: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGenerationStream(): UseGenerationStreamReturn {
  const [step, setStep] = useState<GenerationStep>('idle')
  const [message, setMessage] = useState('')
  const [passage, setPassage] = useState<StructuredPassage | null>(null)
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)

  const reset = useCallback(() => {
    setStep('idle')
    setMessage('')
    setPassage(null)
    setQuestions([])
    setError(null)
    setIsStreaming(false)
  }, [])

  const startGeneration = useCallback(async (params: GenerationParams) => {
    // Reset previous run
    setStep('idle')
    setMessage('')
    setPassage(null)
    setQuestions([])
    setError(null)
    setIsStreaming(true)

    try {
      // Obtain the current auth token
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/generate-stream', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        let errMsg = `서버 오류 (${response.status})`
        try {
          const json = await response.json()
          if (json?.error) errMsg = json.error
        } catch {
          // ignore parse failure
        }
        throw new Error(errMsg)
      }

      if (!response.body) {
        throw new Error('응답 스트림을 받을 수 없습니다.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Accumulate chunks and process complete SSE lines
        buffer += decoder.decode(value, { stream: true })

        // Split on newlines, keep the last (potentially incomplete) chunk
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue

          const raw = trimmed.slice('data:'.length).trim()
          if (!raw) continue

          let event: Record<string, unknown>
          try {
            event = JSON.parse(raw)
          } catch {
            console.warn('[useGenerationStream] Could not parse SSE data:', raw)
            continue
          }

          const eventStep = event.step as GenerationStep
          const eventMessage = typeof event.message === 'string' ? event.message : ''

          setStep(eventStep)
          setMessage(eventMessage)

          if (eventStep === 'structurized' && event.data) {
            setPassage(event.data as StructuredPassage)
          }

          if (eventStep === 'completed' && event.data) {
            const { passage: completedPassage, questions: completedQuestions } = event.data as {
              passage: StructuredPassage
              questions: GeneratedQuestion[]
            }
            setPassage(completedPassage)
            setQuestions(completedQuestions)
          }

          if (eventStep === 'error') {
            setError(eventMessage)
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      setStep('error')
      setMessage(msg)
      setError(msg)
    } finally {
      setIsStreaming(false)
    }
  }, [])

  return { step, message, passage, questions, error, isStreaming, startGeneration, reset }
}
