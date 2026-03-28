import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, rateLimitHeaders } from '../_lib/auth'
import { exportDocument } from '@/lib/services/exporter'
import { trackUsage } from '@/lib/services/usage-tracker'
import type { GeneratedQuestion, StructuredPassage } from '@/lib/services/exporter'

export async function POST(request: NextRequest) {
  // Auth
  let user
  try {
    user = await requireAuth(request)
  } catch (errorResponse) {
    return errorResponse as Response
  }

  // Parse body
  let body: {
    questions?: GeneratedQuestion[]
    passage?: StructuredPassage
    format?: 'docx' | 'hwpx'
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  const { questions, passage, format = 'docx' } = body

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json(
      { error: 'questions array is required and must not be empty' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  // Input size validation
  if (questions.length > 100) {
    return NextResponse.json(
      { error: 'questions array must not exceed 100 items' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  if (!passage) {
    return NextResponse.json(
      { error: 'passage is required' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  if (format !== 'docx' && format !== 'hwpx') {
    return NextResponse.json(
      { error: `Unsupported format "${format}". Supported formats: docx, hwpx` },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  try {
    const fileBuffer = await exportDocument({ questions, passage, format })

    const mimeTypes: Record<string, string> = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      hwpx: 'application/hwp+zip',
    }

    // Track usage after successful export (non-blocking)
    trackUsage(user.id, 'export', 0)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeTypes[format],
        'Content-Disposition': `attachment; filename="exam-questions.${format}"`,
        ...rateLimitHeaders(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed'
    console.error('[/api/export] Error for user', user.id, err)
    return NextResponse.json(
      { error: message },
      { status: 500, headers: rateLimitHeaders() }
    )
  }
}
