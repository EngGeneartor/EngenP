import { createServerClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// Plan limits
// ---------------------------------------------------------------------------

export interface PlanLimits {
  generations: number   // -1 means unlimited
  exports: number       // -1 means unlimited
  types: number
  dnaAnalysis: boolean
  prioritySupport: boolean
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    generations: 10,
    exports: 5,
    types: 5,
    dnaAnalysis: false,
    prioritySupport: false,
  },
  pro: {
    generations: -1,
    exports: -1,
    types: 10,
    dnaAnalysis: true,
    prioritySupport: true,
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the active plan for a user. Falls back to 'free' if no subscription row
 * exists or if the subscription is not in an active/trialing state.
 */
export async function getUserPlan(userId: string): Promise<'free' | 'pro'> {
  const db = createServerClient()

  const { data, error } = await db
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return 'free'
  if (data.status !== 'active' && data.status !== 'trialing') return 'free'
  return data.plan as 'free' | 'pro'
}

/**
 * Return the feature limits for the given plan string.
 */
export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
}

/**
 * Check whether a specific feature is available for a user based on their
 * current plan.
 *
 * Supported feature keys:
 *   'dna_analysis'       — school DNA analysis
 *   'priority_support'   — priority processing queue
 *   'generation'         — within monthly generation limit
 *   'export'             — within monthly export limit
 */
export async function isFeatureAllowed(
  userId: string,
  feature: string
): Promise<boolean> {
  const plan = await getUserPlan(userId)
  const limits = getPlanLimits(plan)

  switch (feature) {
    case 'dna_analysis':
      return limits.dnaAnalysis
    case 'priority_support':
      return limits.prioritySupport
    case 'generation': {
      if (limits.generations === -1) return true
      const count = await getMonthlyCount(userId, 'generate')
      return count < limits.generations
    }
    case 'export': {
      if (limits.exports === -1) return true
      const count = await getMonthlyCount(userId, 'export')
      return count < limits.exports
    }
    default:
      return true
  }
}

/**
 * Count usage_logs rows for the current calendar month.
 */
async function getMonthlyCount(userId: string, action: string): Promise<number> {
  const db = createServerClient()
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count, error } = await db
    .from('usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', startOfMonth.toISOString())

  if (error || count === null) return 0
  return count
}

/**
 * Upsert a subscription row from Stripe webhook data.
 * Uses the service-role client (no auth token needed).
 */
export async function upsertSubscription(params: {
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  plan: 'free' | 'pro'
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodStart: Date
  currentPeriodEnd: Date
}): Promise<void> {
  const db = createServerClient()

  const { error } = await db
    .from('subscriptions')
    .upsert(
      {
        user_id: params.userId,
        stripe_customer_id: params.stripeCustomerId,
        stripe_subscription_id: params.stripeSubscriptionId,
        plan: params.plan,
        status: params.status,
        current_period_start: params.currentPeriodStart.toISOString(),
        current_period_end: params.currentPeriodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[subscription] upsertSubscription error:', error)
    throw error
  }
}

/**
 * Look up a user_id from a Stripe customer ID.
 */
export async function getUserIdByCustomer(
  stripeCustomerId: string
): Promise<string | null> {
  const db = createServerClient()

  const { data, error } = await db
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .limit(1)
    .single()

  if (error || !data) return null
  return data.user_id
}
