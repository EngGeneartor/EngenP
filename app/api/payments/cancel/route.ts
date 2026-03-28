import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/_lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { upsertSubscription } from '@/lib/services/subscription'

/**
 * POST /api/payments/cancel
 *
 * Cancels the user's Pro subscription.
 * The subscription remains active until the current period ends.
 */
export async function POST(request: NextRequest) {
  let user: { id: string; email?: string }
  try {
    user = await requireAuth(request)
  } catch (errorResponse) {
    return errorResponse as Response
  }

  const db = createServerClient()

  // Find active subscription
  const { data: subscription, error } = await db
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (error || !subscription) {
    return NextResponse.json(
      { error: '활성 구독이 없습니다.' },
      { status: 404 }
    )
  }

  try {
    // Mark subscription as canceled but keep current_period_end
    // so the user retains access until the period ends
    await upsertSubscription({
      userId: user.id,
      tossPaymentKey: subscription.toss_payment_key ?? '',
      tossOrderId: subscription.toss_order_id ?? '',
      plan: 'pro', // keep pro until period ends
      status: 'canceled',
      currentPeriodStart: new Date(subscription.current_period_start),
      currentPeriodEnd: new Date(subscription.current_period_end),
    })

    return NextResponse.json({
      success: true,
      message: '구독이 취소되었습니다. 현재 결제 기간이 끝날 때까지 Pro 기능을 사용할 수 있습니다.',
      activeUntil: subscription.current_period_end,
    })
  } catch (err) {
    console.error('[payments/cancel] error:', err)
    return NextResponse.json(
      { error: '구독 취소에 실패했습니다.' },
      { status: 500 }
    )
  }
}
