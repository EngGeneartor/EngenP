import { NextRequest, NextResponse } from 'next/server'
import { upsertSubscription } from '@/lib/services/subscription'
import { createServerClient } from '@/lib/supabase-server'

/**
 * POST /api/payments/webhook
 *
 * Handles incoming Toss Payments webhook events.
 * Toss sends POST requests with a JSON body containing payment status updates.
 *
 * Events handled:
 *   DONE       — payment completed successfully
 *   CANCELED   — payment was canceled
 *   ABORTED    — payment was aborted
 *   EXPIRED    — payment expired
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)

  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { eventType, data } = body

  // Toss webhook sends: { eventType, data: { paymentKey, orderId, status, ... } }
  if (!eventType || !data) {
    return NextResponse.json({ error: 'Missing eventType or data' }, { status: 400 })
  }

  try {
    const db = createServerClient()

    switch (eventType) {
      case 'PAYMENT_STATUS_CHANGED': {
        const { paymentKey, orderId, status } = data

        // Find the subscription by toss_payment_key or toss_order_id
        const { data: subscription } = await db
          .from('subscriptions')
          .select('user_id')
          .or(`toss_payment_key.eq.${paymentKey},toss_order_id.eq.${orderId}`)
          .limit(1)
          .maybeSingle()

        if (!subscription) {
          console.warn('[payments/webhook] No subscription found for paymentKey:', paymentKey)
          break
        }

        const mappedStatus = mapTossStatus(status)

        await upsertSubscription({
          userId: subscription.user_id,
          tossPaymentKey: paymentKey,
          tossOrderId: orderId,
          plan: mappedStatus === 'canceled' ? 'free' : 'pro',
          status: mappedStatus,
          currentPeriodStart: new Date(),
          currentPeriodEnd: (() => {
            const d = new Date()
            d.setMonth(d.getMonth() + 1)
            return d
          })(),
        })
        break
      }

      default:
        // Unhandled event — acknowledge receipt
        console.log('[payments/webhook] Unhandled event:', eventType)
        break
    }
  } catch (err) {
    console.error('[payments/webhook] handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapTossStatus(
  tossStatus: string
): 'active' | 'canceled' | 'past_due' | 'trialing' {
  switch (tossStatus) {
    case 'DONE':
    case 'IN_PROGRESS':
      return 'active'
    case 'CANCELED':
    case 'ABORTED':
    case 'EXPIRED':
      return 'canceled'
    case 'PARTIAL_CANCELED':
      return 'active'
    case 'WAITING_FOR_DEPOSIT':
      return 'active'
    default:
      return 'canceled'
  }
}
