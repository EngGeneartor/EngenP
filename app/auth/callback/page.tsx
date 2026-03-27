"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Zap, Sparkles } from "lucide-react"
import { AmbientBackground } from "@/components/ambient-background"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [countdown, setCountdown] = useState(3)
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Check if already logged in
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setStatus("success")
          return
        }

        // Try to exchange code if present in URL (email verification flow)
        const params = new URLSearchParams(window.location.search)
        const code = params.get("code")
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setStatus("error")
            return
          }
          setStatus("success")
          return
        }

        // Check hash params (older flow)
        const hash = window.location.hash
        if (hash && hash.includes("access_token")) {
          setStatus("success")
          return
        }

        // No session found
        setStatus("error")
      } catch {
        setStatus("error")
      }
    }

    handleAuth()
  }, [])

  useEffect(() => {
    if (status !== "success") return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push("/dashboard/")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [status, router])

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-6">
      <AmbientBackground />

      <div className="relative z-10 w-full max-w-md text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-5">
            <div className="flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500/15 to-indigo-500/15">
              <div className="size-8 animate-spin rounded-full border-3 border-purple-500/20 border-t-purple-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground/80">확인 중...</h1>
              <p className="mt-2 text-[13px] text-foreground/45">잠시만 기다려주세요.</p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" style={{ animationDuration: "1.5s" }} />
              <div className="relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 shadow-xl shadow-emerald-500/25">
                <CheckCircle2 className="size-12 text-white" strokeWidth={2} />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground/90">
                로그인 완료!
              </h1>
              <p className="mt-2 text-[14px] text-foreground/50">
                환영합니다! 이제 Abyss의 모든 기능을 사용할 수 있습니다.
              </p>
            </div>

            <div className="glass-card mt-2 flex items-center gap-4 rounded-2xl px-6 py-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-600 glow-sm">
                <Sparkles className="size-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-bold text-foreground/75">AI 변형 문제 생성 준비 완료</p>
                <p className="text-[11px] text-foreground/40">지문을 업로드하면 바로 시작할 수 있어요</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col items-center gap-3">
              <p className="text-[13px] text-foreground/40">
                <span className="font-bold text-purple-400">{countdown}초</span> 후 대시보드로 이동합니다
              </p>
              <button
                onClick={() => router.push("/dashboard/")}
                className="btn-shine rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-8 py-3 text-[13px] font-bold text-white shadow-lg shadow-purple-500/20 transition-smooth hover:shadow-purple-500/30 hover:brightness-110 active:scale-[0.98]"
              >
                지금 바로 시작하기
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-5">
            <div className="flex size-20 items-center justify-center rounded-3xl bg-red-500/10">
              <Zap className="size-10 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground/80">인증에 실패했습니다</h1>
              <p className="mt-2 text-[13px] text-foreground/45">
                링크가 만료되었거나 유효하지 않습니다. 다시 시도해주세요.
              </p>
            </div>
            <button
              onClick={() => router.push("/login/")}
              className="mt-2 rounded-2xl border border-border/30 bg-muted/20 px-8 py-3 text-[13px] font-semibold text-foreground/60 transition-smooth hover:bg-muted/40"
            >
              로그인 페이지로 돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
