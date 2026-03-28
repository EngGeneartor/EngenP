"use client"

/**
 * components/upgrade-prompt.tsx
 *
 * Modal dialog shown when the user hits a free-tier limit or manually
 * clicks an upgrade button.  Clicking "업그레이드" redirects to
 * Toss Payments checkout page.
 * Clicking "나중에" dismisses the dialog.
 */

import { useState } from "react"
import { X, Zap, Check, ArrowRight, Loader2, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

const PRO_FEATURES = [
  "무제한 문제 생성",
  "무제한 내보내기",
  "10가지 전체 유형",
  "학교 기출 DNA 분석",
  "우선 처리 큐",
  "워크북 자동 생성",
]

interface UpgradePromptProps {
  /** Whether to show the modal */
  open: boolean
  /** Called when the user dismisses the modal */
  onClose: () => void
  /** Optional message explaining why the limit was reached */
  reason?: string
}

export function UpgradePrompt({ open, onClose, reason }: UpgradePromptProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        // Not logged in — send to login page
        window.location.href = "/login"
        return
      }

      const clientKey = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY
      if (!clientKey) {
        throw new Error("결제 설정이 완료되지 않았습니다.")
      }

      const userId = session.user?.id ?? "unknown"
      const origin = window.location.origin
      const orderId = `pro-${userId.slice(0, 8)}-${Date.now()}`

      // Redirect to Toss Payments checkout page
      const params = new URLSearchParams({
        clientKey,
        orderId,
        orderName: "Haean Pro 월간 구독",
        amount: "29900",
        currency: "KRW",
        customerEmail: session.user?.email ?? "",
        successUrl: `${origin}/payments/success`,
        failUrl: `${origin}/payments/fail`,
        method: "카드",
      })

      window.location.href = `https://api.tosspayments.com/v1/payments?${params.toString()}`
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.")
      setLoading(false)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Dialog card */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-border/30 bg-background shadow-2xl shadow-purple-500/10">
        {/* Gradient top accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-foreground/50 transition-all hover:bg-muted/30 hover:text-foreground/60"
        >
          <X className="size-4" />
        </button>

        {/* Content */}
        <div className="px-8 pb-8 pt-8">
          {/* Icon + heading */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="relative mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-600 shadow-lg shadow-purple-500/30">
              <Zap className="size-7 text-white" strokeWidth={2.5} />
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-2xl ring-2 ring-purple-500/20 ring-offset-2 ring-offset-background" />
            </div>

            <h2 className="text-[22px] font-extrabold tracking-tight text-foreground/90">
              Pro 플랜으로 업그레이드
            </h2>

            {reason ? (
              <p className="mt-2 text-[13px] leading-relaxed text-foreground/55">{reason}</p>
            ) : (
              <p className="mt-2 text-[13px] leading-relaxed text-foreground/55">
                무제한으로 문제를 생성하고<br />모든 기능을 사용하세요.
              </p>
            )}
          </div>

          {/* Price */}
          <div className="mb-6 flex items-center justify-center gap-1.5">
            <span className="text-4xl font-extrabold text-gradient">₩29,900</span>
            <span className="text-[13px] text-muted-foreground/70">/월</span>
          </div>

          {/* Feature list */}
          <ul className="mb-6 space-y-2.5">
            {PRO_FEATURES.map((feat, i) => (
              <li key={i} className="flex items-center gap-3 text-[13px] text-foreground/70">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-500/15">
                  <Check className="size-3 text-purple-400" strokeWidth={2.5} />
                </span>
                {feat}
              </li>
            ))}
          </ul>

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[12px] text-red-400">
              {error}
            </div>
          )}

          {/* CTA buttons */}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className={cn(
              "btn-shine flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[14px] font-bold text-white shadow-xl shadow-purple-500/20 transition-all hover:brightness-110 active:scale-[0.98]",
              loading
                ? "cursor-not-allowed bg-purple-600/50"
                : "bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:shadow-purple-500/30"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                결제 페이지 열기...
              </>
            ) : (
              <>
                <Star className="size-4" />
                업그레이드
                <ArrowRight className="size-4" />
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="mt-3 flex w-full items-center justify-center rounded-xl py-3 text-[13px] font-medium text-foreground/60 transition-all hover:text-foreground/60"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  )
}
