"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { XCircle } from "lucide-react"

/**
 * /payments/fail
 *
 * Toss Payments redirects here when a payment fails.
 * URL contains: ?code=xxx&message=xxx&orderId=xxx
 */
export default function PaymentFailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const code = searchParams.get("code") ?? "UNKNOWN"
  const message = searchParams.get("message") ?? "결제에 실패했습니다."

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-3xl border border-border/30 bg-background p-8 text-center shadow-2xl shadow-purple-500/10">
        <XCircle className="mx-auto mb-4 size-12 text-red-400" />
        <h1 className="text-lg font-bold text-foreground/90">결제 실패</h1>
        <p className="mt-2 text-sm text-red-400">{message}</p>
        <p className="mt-1 text-xs text-foreground/40">오류 코드: {code}</p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl bg-muted/20 px-6 py-2.5 text-sm font-medium text-foreground/70 transition-all hover:bg-muted/30"
          >
            대시보드로 돌아가기
          </button>
          <button
            onClick={() => router.back()}
            className="rounded-xl px-6 py-2.5 text-sm font-medium text-foreground/50 transition-all hover:text-foreground/70"
          >
            다시 시도
          </button>
        </div>
      </div>
    </div>
  )
}
