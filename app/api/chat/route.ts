import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth, checkRateLimit } from '../_lib/auth'
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
- 구체적인 예시와 함께 설명하면 더욱 좋습니다

## 문제 수정 프로토콜

사용자가 문제 수정을 요청할 때 (예: "난이도 올려줘", "문제 추가해줘", "3번 문제 바꿔줘", "다른 유형으로 바꿔줘" 등):

1단계: 먼저 어떻게 수정할지 한국어로 설명하고, "이렇게 수정할까요?" 라고 확인을 구하세요.

2단계: 사용자가 "네", "좋아요", "해줘", "응", "ㅇㅇ", "ok" 등 동의하면, 수정된 문제를 다음과 같이 응답하세요:
- 먼저 수정 사항을 간단히 설명하는 텍스트를 작성하세요.
- 그 다음, 수정된 전체 문제 목록을 아래 형식의 JSON 블록으로 포함하세요:

<questions_update>
[
  {
    "question_number": 1,
    "type_id": "vocabulary_choice",
    "difficulty": 3,
    "instruction": "다음 글의 밑줄 친 낱말 중...",
    "passage_with_markers": "...",
    "choices": ["①...", "②...", "③...", "④...", "⑤..."],
    "answer": "③",
    "explanation": "...",
    "test_point": "..."
  }
]
</questions_update>

중요 규칙:
- <questions_update> 태그는 사용자가 명시적으로 동의한 후에만 포함하세요.
- 단순 질문이나 설명 요청에는 태그를 사용하지 마세요.
- 수정하지 않은 문제도 전체 목록에 포함해서 반환하세요 (부분 업데이트 불가).
- JSON은 반드시 유효한 JSON이어야 합니다.
- 기존 문제의 question_number 순서를 유지하세요.`

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

  // Rate limit
  const { allowed, headers: rlHeaders } = checkRateLimit(request, user.id)
  if (!allowed) {
    return new Response(JSON.stringify({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(rlHeaders) },
    })
  }

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[/api/chat] ANTHROPIC_API_KEY is not configured')
    return new Response(
      JSON.stringify({ error: 'AI 채팅 중 오류가 발생했습니다.' }),
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
          const message = err instanceof Error ? err.message : 'unknown'
          console.error('[/api/chat] Stream error:', message)
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ error: 'AI 채팅 중 오류가 발생했습니다.' })}\n\n`
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
    const message = err instanceof Error ? err.message : 'unknown'
    console.error('[/api/chat] Error:', message)
    return new Response(
      JSON.stringify({ error: 'AI 채팅 중 오류가 발생했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
