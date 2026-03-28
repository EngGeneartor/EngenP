"use client"

/**
 * components/usage-indicator.tsx
 *
 * A pill-shaped usage badge for the sidebar showing monthly generation and
 * export counts against free-tier limits. Shows an upgrade prompt when a
 * limit is reached.
 */

import { useEffect, useState } from "react"
import { Zap, TrendingUp, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { getUsageStats, checkUsageLimit } from "@/lib/services/usage-tracker"
import type { UsageStats } from "@/lib/services/usage-tracker"

const FREE_GEN_LIMIT = 10
const FREE_EXP_LIMIT = 5

interface UsageIndicatorProps {
  userId: string
  /** Called when "업그레이드" is clicked */
  onUpgradeClick?: () => void
  /** Extra Tailwind classes applied to the outermost wrapper */
  className?: string
}

interface LimitStatus {
  genAllowed: boolean
  expAllowed: boolean
}

export function UsageIndicator({ userId, onUpgradeClick, className }: UsageIndicatorProps) {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [limits, setLimits] = useState<LimitStatus>({ genAllowed: true, expAllowed: true })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const load = async () => {
      try {
        const [usageStats, genLimit, expLimit] = await Promise.all([
          getUsageStats(userId),
          checkUsageLimit(userId, "generate"),
          checkUsageLimit(userId, "export"),
        ])
        if (!cancelled) {
          setStats(usageStats)
          setLimits({ genAllowed: genLimit.allowed, expAllowed: expLimit.allowed })
        }
      } catch {
        // silently fail — never crash the sidebar
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  if (loading) {
    return (
      <div className={cn("flex flex-col gap-1.5 px-1", className)}>
        <div className="h-2 w-24 animate-pulse rounded-full bg-muted/30" />
        <div className="h-2 w-16 animate-pulse rounded-full bg-muted/20" />
      </div>
    )
  }

  if (!stats) return null

  const genUsed = stats.thisMonthGenerations
  const expUsed = stats.thisMonthExports
  const genPct = Math.min((genUsed / FREE_GEN_LIMIT) * 100, 100)
  const expPct = Math.min((expUsed / FREE_EXP_LIMIT) * 100, 100)
  const anyLimitReached = !limits.genAllowed || !limits.expAllowed

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Generation bar */}
      <UsageBar
        label="생성"
        used={genUsed}
        limit={FREE_GEN_LIMIT}
        pct={genPct}
        limitReached={!limits.genAllowed}
      />

      {/* Export bar */}
      <UsageBar
        label="내보내기"
        used={expUsed}
        limit={FREE_EXP_LIMIT}
        pct={expPct}
        limitReached={!limits.expAllowed}
      />

      {/* Upgrade prompt when any limit is reached */}
      {anyLimitReached && (
        <button
          onClick={onUpgradeClick}
          className="mt-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600/80 via-violet-600/80 to-indigo-600/80 px-3 py-2 text-[11px] font-bold text-white shadow-md shadow-purple-500/20 transition-all hover:brightness-110 active:scale-[0.97]"
        >
          <Zap className="size-3" strokeWidth={2.5} />
          Pro로 업그레이드
          <ArrowUpRight className="size-3" />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-component: single usage bar row
// ---------------------------------------------------------------------------

interface UsageBarProps {
  label: string
  used: number
  limit: number
  pct: number
  limitReached: boolean
}

function UsageBar({ label, used, limit, pct, limitReached }: UsageBarProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="size-3 text-foreground/30" />
          <span className="text-[11px] font-medium text-foreground/50">{label}</span>
        </div>
        <span
          className={cn(
            "text-[11px] font-bold tabular-nums",
            limitReached ? "text-red-400" : pct >= 70 ? "text-amber-400" : "text-purple-400"
          )}
        >
          {used}/{limit}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            limitReached
              ? "bg-gradient-to-r from-red-500 to-rose-400"
              : pct >= 70
                ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                : "bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
