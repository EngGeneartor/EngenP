import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, rateLimitHeaders } from '../_lib/auth'
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
  const validMediaTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    if (!f.base64 || typeof f.base64 !== 'string') {
      return NextResponse.json(
        { error: `files[${i}].base64 is required and must be a string` },
        { status: 400, headers: rateLimitHeaders() }
      )
    }
    if (!f.mediaType || !validMediaTypes.includes(f.mediaType)) {
      return NextResponse.json(
        { error: `files[${i}].mediaType must be one of: ${validMediaTypes.join(', ')}` },
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
