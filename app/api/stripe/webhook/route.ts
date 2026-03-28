import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { upsertSubscription, getUserIdByCustomer } from '@/lib/services/subscription'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
}

/**
 * POST /api/stripe/webhook
 *
 * Handles incoming Stripe webhook events.
 * Verifies the Stripe-Signature header before processing.
 * No user authentication required — verified by Stripe signature.
 *
 * Handled events:
 *   checkout.session.completed        — provision Pro after successful payment
 *   customer.subscription.updated     — sync plan/status changes
 *   customer.subscription.deleted     — downgrade to free on cancellation
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  // Read raw body for signature verification
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const userId =
          (session.metadata?.user_id as string | undefined) ?? null
        if (!userId) {
          console.error('[stripe/webhook] checkout.session.completed: no user_id in metadata')
          break
        }

        // Retrieve the full subscription object
        const stripeSubscription = await getStripe().subscriptions.retrieve(
          session.subscription as string
        )

        await upsertSubscription({
          userId,
          stripeCustomerId: stripeSubscription.customer as string,
          stripeSubscriptionId: stripeSubscription.id,
          plan: 'pro',
          status: mapStatus(stripeSubscription.status),
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        })
        break
      }

      case 'customer.subscription.updated': {
        const stripeSubscription = event.data.object as Stripe.Subscription
        const userId = await getUserIdByCustomer(
          stripeSubscription.customer as string
        )
        if (!userId) {
          console.error('[stripe/webhook] customer.subscription.updated: unknown customer', stripeSubscription.customer)
          break
        }

        const isActive =
          stripeSubscription.status === 'active' ||
          stripeSubscription.status === 'trialing'

        await upsertSubscription({
          userId,
          stripeCustomerId: stripeSubscription.customer as string,
          stripeSubscriptionId: stripeSubscription.id,
          plan: isActive ? 'pro' : 'free',
          status: mapStatus(stripeSubscription.status),
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        })
        break
      }

      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data.object as Stripe.Subscription
        const userId = await getUserIdByCustomer(
          stripeSubscription.customer as string
        )
        if (!userId) {
          console.error('[stripe/webhook] customer.subscription.deleted: unknown customer', stripeSubscription.customer)
          break
        }

        await upsertSubscription({
          userId,
          stripeCustomerId: stripeSubscription.customer as string,
          stripeSubscriptionId: stripeSubscription.id,
          plan: 'free',
          status: 'canceled',
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        })
        break
      }

      default:
        // Unhandled event — acknowledge receipt
        break
    }
  } catch (err) {
    console.error('[stripe/webhook] handler error:', err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapStatus(
  stripeStatus: Stripe.Subscription.Status
): 'active' | 'canceled' | 'past_due' | 'trialing' {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return 'canceled'
  }
}
