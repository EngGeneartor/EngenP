import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, rateLimitHeaders, checkRateLimit } from '../_lib/auth'
import { analyzeExamDna, DnaAnalyzerError } from '@/lib/services/dna-analyzer'
import type { ExamFileInput, ExamMetadata } from '@/lib/services/dna-analyzer'

export async function POST(request: NextRequest) {
  // Auth
  let user
  try {
    user = await requireAuth(request)
  } catch (errorResponse) {
    return errorResponse as Response
  }

  // Rate limit
  const { allowed, headers: rlHeaders } = checkRateLimit(request, user.id)
  if (!allowed) {
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429, headers: Object.fromEntries(rlHeaders) })
  }

  // Parse body
  let body: { files?: ExamFileInput[]; metadata?: ExamMetadata }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  const { files, metadata } = body

  if (!files || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json(
      { error: 'files is required and must be a non-empty array' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  // Input size validation
  if (files.length > 20) {
    return NextResponse.json(
      { error: 'files array must not exceed 20 items' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  // Validate each file entry
  const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const validUrlTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const hasBase64 = f.base64 && typeof f.base64 === 'string'
    const hasUrl = f.url && typeof f.url === 'string'

    if (!hasBase64 && !hasUrl) {
      return NextResponse.json(
        { error: `files[${i}] must have either base64 (image) or url (PDF/DOCX)` },
        { status: 400, headers: rateLimitHeaders() }
      )
    }

    if (hasBase64 && (!f.mediaType || !validImageTypes.includes(f.mediaType))) {
      return NextResponse.json(
        { error: `files[${i}].mediaType must be one of: ${validImageTypes.join(', ')}` },
        { status: 400, headers: rateLimitHeaders() }
      )
    }

    if (hasUrl && f.urlMediaType && !validUrlTypes.includes(f.urlMediaType)) {
      return NextResponse.json(
        { error: `files[${i}].urlMediaType must be one of: ${validUrlTypes.join(', ')}` },
        { status: 400, headers: rateLimitHeaders() }
      )
    }
  }

  try {
    const profile = await analyzeExamDna(files, metadata)

    return NextResponse.json(
      { data: profile },
      { status: 200, headers: rateLimitHeaders() }
    )
  } catch (err) {
    const isDnaError = err instanceof DnaAnalyzerError
    const message = err instanceof Error ? err.message : 'unknown'
    const code = isDnaError ? (err as DnaAnalyzerError).code : 'UNKNOWN_ERROR'

    console.error('[/api/analyze-dna] Error:', message)

    const status =
      code === 'NO_FILES' || code === 'INVALID_PROFILE' ? 400 :
      code === 'ANALYSIS_FAILED' ? 422 :
      500

    return NextResponse.json(
      { error: 'DNA 분석 중 오류가 발생했습니다.', code },
      { status, headers: rateLimitHeaders() }
    )
  }
}
