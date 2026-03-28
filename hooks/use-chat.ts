"use client"

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { StructuredPassage, GeneratedQuestion } from '@/lib/types'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ChatContext {
  passage?: StructuredPassage | null
  questions?: GeneratedQuestion[] | null
}

/** Callback when the AI provides updated questions via chat */
export type OnQuestionsUpdate = (questions: GeneratedQuestion[]) => void

/**
 * Extract <questions_update>...</questions_update> JSON from the assistant
 * response, parse it, and return the cleaned text + parsed questions (if any).
 */
function extractQuestionsUpdate(text: string): {
  cleanText: string
  questions: GeneratedQuestion[] | null
} {
  const regex = /<questions_update>\s*([\s\S]*?)\s*<\/questions_update>/
  const match = text.match(regex)
  if (!match) return { cleanText: text, questions: null }

  try {
    const parsed = JSON.parse(match[1])
    if (!Array.isArray(parsed) || parsed.length === 0) return { cleanText: text, questions: null }
    // Basic shape check
    const valid = parsed.every(
      (q: Record<string, unknown>) =>
        typeof q.question_number === 'number' &&
        typeof q.instruction === 'string' &&
        typeof q.answer === 'string'
    )
    if (!valid) return { cleanText: text, questions: null }

    // Remove the tag block from displayed text
    const cleanText = text.replace(regex, '').trim()
    return { cleanText, questions: parsed as GeneratedQuestion[] }
  } catch {
    return { cleanText: text, questions: null }
  }
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    '안녕하세요! 영어 내신 변형 문제 전문 AI 튜터 Haean AI입니다. 지문 분석, 문제 수정, 해설 요청 등 무엇이든 도와드리겠습니다.',
  timestamp: new Date(),
}

export function useChat(context?: ChatContext, onQuestionsUpdate?: OnQuestionsUpdate) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return

      setError(null)

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      // Prepare the placeholder assistant message for streaming
      const assistantId = `assistant-${Date.now()}`
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])

      try {
        // Get auth token
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }

        // Build the conversation history (excluding the empty placeholder)
        const history = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: history,
            context,
          }),
        })

        if (!response.ok) {
          let errMsg = `서버 오류 (${response.status})`
          try {
            const json = await response.json()
            if (json.error) errMsg = json.error
          } catch {
            // ignore parse error
          }
          throw new Error(errMsg)
        }

        if (!response.body) {
          throw new Error('응답 스트림을 받을 수 없습니다')
        }

        // Read SSE stream
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Process complete SSE lines
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue

            const data = trimmed.slice('data:'.length).trim()
            if (data === '[DONE]') {
              // Extract questions update from completed assistant message
              setMessages((prev) => {
                const last = prev.find((m) => m.id === assistantId)
                if (last && onQuestionsUpdate) {
                  const { cleanText, questions } = extractQuestionsUpdate(last.content)
                  if (questions) {
                    // Update displayed text (remove JSON block) and notify parent
                    setTimeout(() => onQuestionsUpdate(questions), 0)
                    return prev.map((m) =>
                      m.id === assistantId ? { ...m, content: cleanText } : m
                    )
                  }
                }
                return prev
              })
              setIsLoading(false)
              return
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.error) {
                throw new Error(parsed.error)
              }
              if (typeof parsed.text === 'string') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + parsed.text }
                      : m
                  )
                )
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== 'Unexpected token') {
                throw parseErr
              }
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다'
        setError(message)
        // Update the placeholder with error text
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `죄송합니다. 오류가 발생했습니다: ${message}`,
                }
              : m
          )
        )
      } finally {
        setIsLoading(false)
      }
    },
    [messages, isLoading, context, onQuestionsUpdate]
  )

  const clearMessages = useCallback(() => {
    setMessages([WELCOME_MESSAGE])
    setError(null)
  }, [])

  return { messages, isLoading, error, sendMessage, clearMessages }
}
