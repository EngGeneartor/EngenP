import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '../_lib/auth'
import type { StructuredPassage, GeneratedQuestion } from '@/lib/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatContext {
  passage?: StructuredPassage | null
  questions?: GeneratedQuestion[] | null
}

function buildSystemPrompt(context?: ChatContext): string {
  let system = `당신은 영어 내신 변형 문제 전문 AI 튜터 'Haean AI'입니다. 현재 사용자의 지문과 생성된 문제를 기반으로 도움을 줍니다.

당신의 역할:
- 영어 지문 분석 및 해설
- 변형 문제 수정 및 개선 제안
- 어법, 어휘, 빈칸 추론 등 문제 유형별 전문 지도
- 난이도 조절 및 문제 추가 제안
- 학생 수준에 맞는 상세한 해설 제공

응답 지침:
- 한국어로 친절하고 전문적으로 답변하세요
- 영어 문법 포인트는 한국어로 명확하게 설명하세요
- 구체적인 예시와 함께 설명하면 더욱 좋습니다`

  if (context?.passage) {
    const p = context.passage
    system += `\n\n## 현재 지문 정보\n`
    if (p.title) system += `제목: ${p.title}\n`
    system += `단어 수: ${p.wordCount}\n`
    system += `추정 난이도: ${p.estimatedDifficulty}/5\n`
    if (p.topics?.length) system += `주제: ${p.topics.join(', ')}\n`
    system += `\n지문 전체:\n${p.fullText}`
  }

  if (context?.questions?.length) {
    system += `\n\n## 현재 생성된 문제 목록 (총 ${context.questions.length}문항)\n`
    context.questions.forEach((q, idx) => {
      system += `\n### 문제 ${idx + 1} (${q.type_id}, 난이도 ${q.difficulty})\n`
      system += `지시문: ${q.instruction}\n`
      if (q.passage_with_markers) system += `지문: ${q.passage_with_markers}\n`
      if (q.choices) system += `선택지: ${q.choices.map((c, i) => `${i + 1}. ${c}`).join(' / ')}\n`
      system += `정답: ${q.answer}\n`
      system += `해설: ${q.explanation}\n`
      system += `출제 포인트: ${q.test_point}\n`
    })
  }

  return system
}

export async function POST(request: NextRequest) {
  // Auth check
  let user
  try {
    user = await requireAuth(request)
  } catch (errorResponse) {
    return errorResponse as Response
  }

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다. 환경 변수를 확인해주세요.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let messages: ChatMessage[]
  let context: ChatContext | undefined

  try {
    const body = await request.json()
    messages = body.messages
    context = body.context
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: 'messages 배열이 필요합니다' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Input size validation
  if (messages.length > 100) {
    return new Response(
      JSON.stringify({ error: 'messages array must not exceed 100 items' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
  for (const m of messages) {
    if (typeof m.content === 'string' && m.content.length > 50_000) {
      return new Response(
        JSON.stringify({ error: 'Each message content must not exceed 50000 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  const anthropic = new Anthropic()

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 2048,
      system: buildSystemPrompt(context),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
                )
              )
            }
          }
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Streaming error'
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ error: message })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Claude API 호출 실패'
    console.error('[/api/chat] Error for user', user.id, err)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
