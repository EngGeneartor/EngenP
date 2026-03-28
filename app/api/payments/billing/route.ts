import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/_lib/auth'
import { issueBillingKey, chargeBilling, TossApiError } from '@/lib/toss'
import { upsertSubscription } from '@/lib/services/subscription'
import { createServerClient } from '@/lib/supabase-server'

/**
 * POST /api/payments/billing
 *
 * Issues a billing key from the authKey returned by Toss card registration,
 * then immediately charges the first month.
 *
 * Body: { authKey, customerKey }
 */
export async function POST(request: NextRequest) {
  let user: { id: string; email?: string }
  try {
    user = await requireAuth(request)
  } catch (errorResponse) {
    return errorResponse as Response
  }

  const body = await request.json().catch(() => null)
  if (!body?.authKey || !body?.customerKey) {
    return NextResponse.json(
      { error: 'authKey and customerKey are required' },
      { status: 400 }
    )
  }

  const PRO_AMOUNT = 29_900

  try {
    // 1. Issue billing key
    const billing = await issueBillingKey({
      authKey: body.authKey,
      customerKey: body.customerKey,
    })

    // 2. Store billing key in subscription record
    const db = createServerClient()
    await db.from('subscriptions').upsert(
      {
        user_id: user.id,
        toss_billing_key: billing.billingKey,
        toss_customer_key: body.customerKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    // 3. Charge first month
    const orderId = `pro-${user.id.slice(0, 8)}-${Date.now()}`
    const charge = await chargeBilling({
      billingKey: billing.billingKey,
      customerKey: body.customerKey,
      amount: PRO_AMOUNT,
      orderId,
      orderName: 'Abyss Pro 월간 구독',
      customerEmail: user.email,
    })

    // 4. Upsert subscription
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    await upsertSubscription({
      userId: user.id,
      tossPaymentKey: charge.paymentKey,
      tossOrderId: orderId,
      plan: 'pro',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    })

    return NextResponse.json({ success: true, orderId })
  } catch (err) {
    if (err instanceof TossApiError) {
      console.error('[payments/billing] Toss API error:', err.code, err.message)
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode >= 400 ? err.statusCode : 400 }
      )
    }
    console.error('[payments/billing] error:', err)
    return NextResponse.json(
      { error: '자동결제 등록에 실패했습니다.' },
      { status: 500 }
    )
  }
}
