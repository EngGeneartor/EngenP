import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireAuth } from '@/app/api/_lib/auth'
import { createServerClient } from '@/lib/supabase-server'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
}

/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session so the user can manage their
 * subscription (cancel, change payment method, view invoices, etc.).
 * Requires a valid Supabase JWT in the Authorization header.
 * Returns { url } — the Stripe-hosted portal URL.
 */
export async function POST(request: NextRequest) {
  // Authenticate user
  let user: { id: string; email?: string }
  try {
    user = await requireAuth(request)
  } catch (errorResponse) {
    return errorResponse as Response
  }

  // Look up the user's Stripe customer ID
  const db = createServerClient()
  const { data: subscription } = await db
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No Stripe customer found for this user' },
      { status: 404 }
    )
  }

  const origin =
    request.headers.get('origin') ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'

  try {
    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (err) {
    console.error('[stripe/portal] error:', err)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
