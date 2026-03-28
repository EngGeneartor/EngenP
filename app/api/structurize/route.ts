import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, rateLimitHeaders } from '../_lib/auth'
import { structurizePassage } from '@/lib/services/structurizer'
import { trackUsage } from '@/lib/services/usage-tracker'

export async function POST(request: NextRequest) {
  // Auth
  let user
  try {
    user = await requireAuth(request)
  } catch (errorResponse) {
    return errorResponse as Response
  }

  // Parse body
  let body: { fileUrl?: string; base64?: string; mediaType?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  const { fileUrl, base64, mediaType } = body

  if (!fileUrl && !(base64 && mediaType)) {
    return NextResponse.json(
      { error: 'Provide either fileUrl or both base64 and mediaType' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  // Input size validation
  if (fileUrl && (typeof fileUrl !== 'string' || fileUrl.length > 2048)) {
    return NextResponse.json(
      { error: 'fileUrl must be a string of at most 2048 characters' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }
  if (base64 && (typeof base64 !== 'string' || base64.length > 10_000_000)) {
    return NextResponse.json(
      { error: 'base64 payload must not exceed 10 MB' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }
  if (mediaType && (typeof mediaType !== 'string' || mediaType.length > 100)) {
    return NextResponse.json(
      { error: 'mediaType must be a string of at most 100 characters' },
      { status: 400, headers: rateLimitHeaders() }
    )
  }

  try {
    const structured = await structurizePassage(
      fileUrl ? { fileUrl } : { base64: base64!, mediaType: mediaType! }
    )

    // Track usage after successful structurization (non-blocking)
    trackUsage(user.id, 'structurize', 0)

    return NextResponse.json(
      { data: structured },
      { status: 200, headers: rateLimitHeaders() }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Structurization failed'
    console.error('[/api/structurize] Error for user', user.id, err)
    return NextResponse.json(
      { error: message },
      { status: 500, headers: rateLimitHeaders() }
    )
  }
}
