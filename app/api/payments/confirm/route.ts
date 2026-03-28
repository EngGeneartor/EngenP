import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/_lib/auth'
import { confirmPayment, TossApiError } from '@/lib/toss'
import { upsertSubscription } from '@/lib/services/subscription'

/**
 * POST /api/payments/confirm
 *
 * Called from the /payments/success page after Toss redirects back.
 * Confirms the payment with Toss API and upserts the subscription.
 *
 * Body: { paymentKey, orderId, amount }
 */
export async function POST(request: NextRequest) {
  // Authenticate user
  let user: { id: string; email?: string }
  try {
    user = await requireAuth(request)
  } catch (errorResponse) {
    return errorResponse as Response
  }

  const body = await request.json().catch(() => null)
  if (!body?.paymentKey || !body?.orderId || !body?.amount) {
    return NextResponse.json(
      { error: 'paymentKey, orderId, amount are required' },
      { status: 400 }
    )
  }

  const { paymentKey, orderId, amount } = body

  // Verify amount matches the expected Pro plan price
  const PRO_AMOUNT = 29_900
  if (Number(amount) !== PRO_AMOUNT) {
    return NextResponse.json(
      { error: '결제 금액이 일치하지 않습니다.' },
      { status: 400 }
    )
  }

  try {
    // Confirm with Toss Payments
    const payment = await confirmPayment({ paymentKey, orderId, amount: PRO_AMOUNT })

    // Payment confirmed — upsert subscription
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    await upsertSubscription({
      userId: user.id,
      tossPaymentKey: payment.paymentKey,
      tossOrderId: orderId,
      plan: 'pro',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    })

    return NextResponse.json({ success: true, orderId })
  } catch (err) {
    if (err instanceof TossApiError) {
      console.error('[payments/confirm] Toss API error:', err.code, err.message)
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode >= 400 ? err.statusCode : 400 }
      )
    }
    console.error('[payments/confirm] error:', err)
    return NextResponse.json(
      { error: '결제 확인에 실패했습니다.' },
      { status: 500 }
    )
  }
}
