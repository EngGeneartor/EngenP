/**
 * lib/services/usage-tracker.ts
 *
 * Tracks per-user usage events against the existing `usage_logs` table and
 * checks free-tier limits before allowing generation / export actions.
 *
 * Free tier limits (monthly):
 *   - generate : 10
 *   - export   : 5
 * Pro tier: unlimited
 */

import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UsageAction = 'structurize' | 'generate' | 'export' | 'validate'

export type Plan = 'free' | 'pro'

export interface UsageLimitResult {
  allowed: boolean
  used: number
  limit: number
  plan: Plan
}

export interface UsageStats {
  totalGenerations: number
  totalExports: number
  thisMonthGenerations: number
  thisMonthExports: number
  tokensUsed: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FREE_LIMITS: Record<string, number> = {
  generate: 10,
  export: 5,
}

// Actions that count against the monthly free tier limits.
const LIMITED_ACTIONS = new Set<UsageAction>(['generate', 'export'])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** ISO string for the first moment of the current UTC month, e.g. "2026-03-01T00:00:00.000Z" */
function startOfCurrentMonth(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

/**
 * Fetch the user's plan from the `subscriptions` table.
 * Falls back to 'free' if no active/trialing subscription row exists.
 */
async function getUserPlan(userId: string): Promise<Plan> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return 'free'
    if (data.status !== 'active' && data.status !== 'trialing') return 'free'
    return (data.plan as Plan) ?? 'free'
  } catch {
    return 'free'
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Insert a usage_log row for the given action.
 * Silently swallows errors so that a logging failure never blocks the user.
 */
export async function trackUsage(
  userId: string,
  action: UsageAction | string,
  tokensUsed = 0
): Promise<void> {
  try {
    await supabase.from('usage_logs').insert({
      user_id: userId,
      action,
      tokens_used: tokensUsed,
    })
  } catch {
    // Non-fatal — never block the primary action
    console.warn('[usage-tracker] Failed to log usage:', { userId, action })
  }
}

/**
 * Check whether the user is allowed to perform `action`.
 *
 * - Pro users are always allowed.
 * - Free users are counted against their monthly quota for `generate` and
 *   `export` actions.
 */
export async function checkUsageLimit(
  userId: string,
  action: UsageAction = 'generate'
): Promise<UsageLimitResult> {
  const plan = await getUserPlan(userId)

  // Pro users have no limits
  if (plan === 'pro') {
    return { allowed: true, used: 0, limit: Infinity, plan }
  }

  // Actions that are not subject to limits are always allowed
  if (!LIMITED_ACTIONS.has(action)) {
    return { allowed: true, used: 0, limit: Infinity, plan }
  }

  const limit = FREE_LIMITS[action] ?? Infinity
  const monthStart = startOfCurrentMonth()

  const { count, error } = await supabase
    .from('usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', monthStart)

  if (error) {
    // On DB error, allow — don't silently block the user
    return { allowed: true, used: 0, limit, plan }
  }

  const used = count ?? 0
  return {
    allowed: used < limit,
    used,
    limit,
    plan,
  }
}

/**
 * Return aggregated usage stats for display in the UI.
 */
export async function getUsageStats(userId: string): Promise<UsageStats> {
  const monthStart = startOfCurrentMonth()

  // Total counts by action (all time)
  const { data: allTime } = await supabase
    .from('usage_logs')
    .select('action, tokens_used')
    .eq('user_id', userId)

  // This-month counts
  const { data: thisMonth } = await supabase
    .from('usage_logs')
    .select('action')
    .eq('user_id', userId)
    .gte('created_at', monthStart)

  const totalGenerations = allTime?.filter((r) => r.action === 'generate').length ?? 0
  const totalExports = allTime?.filter((r) => r.action === 'export').length ?? 0
  const tokensUsed = allTime?.reduce((sum, r) => sum + (r.tokens_used ?? 0), 0) ?? 0
  const thisMonthGenerations = thisMonth?.filter((r) => r.action === 'generate').length ?? 0
  const thisMonthExports = thisMonth?.filter((r) => r.action === 'export').length ?? 0

  return {
    totalGenerations,
    totalExports,
    thisMonthGenerations,
    thisMonthExports,
    tokensUsed,
  }
}
