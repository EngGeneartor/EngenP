"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"

/**
 * /payments/success
 *
 * Toss Payments redirects here after a successful payment.
 * URL contains: ?paymentKey=xxx&orderId=xxx&amount=xxx
 * This page calls /api/payments/confirm to finalize the payment server-side.
 */
export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey")
    const orderId = searchParams.get("orderId")
    const amount = searchParams.get("amount")

    if (!paymentKey || !orderId || !amount) {
      setStatus("error")
      setErrorMsg("결제 정보가 올바르지 않습니다.")
      return
    }

    const confirm = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          setStatus("error")
          setErrorMsg("로그인이 필요합니다.")
          return
        }

        const res = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
          }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? "결제 확인에 실패했습니다.")
        }

        setStatus("success")

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/dashboard?upgraded=true")
        }, 2000)
      } catch (err) {
        setStatus("error")
        setErrorMsg(err instanceof Error ? err.message : "오류가 발생했습니다.")
      }
    }

    confirm()
  }, [searchParams, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-3xl border border-border/30 bg-background p-8 text-center shadow-2xl shadow-purple-500/10">
        {/* Gradient top accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

        {status === "loading" && (
          <>
            <Loader2 className="mx-auto mb-4 size-12 animate-spin text-purple-400" />
            <h1 className="text-lg font-bold text-foreground/90">결제 확인 중...</h1>
            <p className="mt-2 text-sm text-foreground/55">잠시만 기다려 주세요.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 size-12 text-emerald-400" />
            <h1 className="text-lg font-bold text-foreground/90">결제 완료!</h1>
            <p className="mt-2 text-sm text-foreground/55">
              Pro 플랜이 활성화되었습니다. 대시보드로 이동합니다.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto mb-4 size-12 text-red-400" />
            <h1 className="text-lg font-bold text-foreground/90">결제 오류</h1>
            <p className="mt-2 text-sm text-red-400">{errorMsg}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-6 rounded-xl bg-muted/20 px-6 py-2.5 text-sm font-medium text-foreground/70 transition-all hover:bg-muted/30"
            >
              대시보드로 돌아가기
            </button>
          </>
        )}
      </div>
    </div>
  )
}
