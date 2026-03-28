import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireAuth } from '@/app/api/_lib/auth'
import { createServerClient } from '@/lib/supabase-server'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
}

/**
 * POST /api/stripe/create-checkout
 *
 * Creates a Stripe Checkout session for the Pro plan.
 * Requires a valid Supabase JWT in the Authorization header.
 * Returns { url } — the Stripe-hosted checkout page URL.
 */
export async function POST(request: NextRequest) {
  // Authenticate user
  let user: { id: string; email?: string }
  try {
    user = await requireAuth(request)
  } catch (errorResponse) {
    return errorResponse as Response
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID
  if (!priceId) {
    return NextResponse.json(
      { error: 'Stripe price ID is not configured' },
      { status: 500 }
    )
  }

  // Determine the base URL for redirect URLs
  const origin =
    request.headers.get('origin') ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'

  // Look up existing Stripe customer ID if the user has one
  const db = createServerClient()
  const { data: subscription } = await db
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  const existingCustomerId = subscription?.stripe_customer_id ?? undefined

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: existingCustomerId,
      customer_email: existingCustomerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?upgraded=true`,
      cancel_url: `${origin}/#pricing`,
      metadata: {
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/create-checkout] error:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
