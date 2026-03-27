"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Zap, Sparkles, PartyPopper } from "lucide-react"
import { AmbientBackground } from "@/components/ambient-background"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <AmbientBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-3 border-purple-500/20 border-t-purple-500" />
          <p className="text-[13px] text-foreground/50">로딩 중...</p>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}

function CallbackContent() {
  const [status, setStatus] = useState<"loading" | "signup" | "verified" | "error">("loading")
  const [countdown, setCountdown] = useState(4)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuth = async () => {
      const from = searchParams.get("from")

      // Case 1: 회원가입 직후
      if (from === "signup") {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setStatus("signup")
          return
        }
        // retry
        await new Promise(r => setTimeout(r, 500))
        const { data: { session: retry } } = await supabase.auth.getSession()
        if (retry) {
          setStatus("signup")
          return
        }
        // 세션 없어도 가입은 된 상태이므로 signup으로 표시
        setStatus("signup")
        return
      }

      // Case 2: 이메일 인증 콜백
      try {
        const code = searchParams.get("code")
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) { setStatus("error"); return }
          setStatus("verified")
          return
        }

        const hash = window.location.hash
        if (hash && hash.includes("access_token")) {
          setStatus("verified")
          return
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setStatus("verified")
          return
        }

        setStatus("error")
      } catch {
        setStatus("error")
      }
    }

    handleAuth()
  }, [searchParams])

  // Countdown → redirect
  useEffect(() => {
    if (status !== "signup" && status !== "verified") return

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
        {/* Loading */}
        {status === "loading" && (
          <div className="flex flex-col items-center gap-5">
            <div className="flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500/15 to-indigo-500/15">
              <div className="size-8 animate-spin rounded-full border-3 border-purple-500/20 border-t-purple-500" />
            </div>
            <h1 className="text-xl font-bold text-foreground/80">확인 중...</h1>
          </div>
        )}

        {/* 회원가입 완료 */}
        {status === "signup" && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-purple-500/15" style={{ animationDuration: "1.5s" }} />
              <div className="relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-600 shadow-xl shadow-purple-500/25">
                <PartyPopper className="size-12 text-white" strokeWidth={1.5} />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground/90">
                회원가입을 환영합니다!
              </h1>
              <p className="mt-2 text-[14px] text-foreground/50">
                Abyss와 함께 내신 변형 문제를 만들어보세요.
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

        {/* 이메일 인증 완료 */}
        {status === "verified" && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" style={{ animationDuration: "1.5s" }} />
              <div className="relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 shadow-xl shadow-emerald-500/25">
                <CheckCircle2 className="size-12 text-white" strokeWidth={2} />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground/90">
                인증이 완료되었습니다!
              </h1>
              <p className="mt-2 text-[14px] text-foreground/50">
                이메일 인증이 확인되었습니다. 이제 로그인할 수 있습니다.
              </p>
            </div>

            <div className="mt-4 flex flex-col items-center gap-3">
              <p className="text-[13px] text-foreground/40">
                <span className="font-bold text-purple-400">{countdown}초</span> 후 대시보드로 이동합니다
              </p>
              <button
                onClick={() => router.push("/dashboard/")}
                className="btn-shine rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-8 py-3 text-[13px] font-bold text-white shadow-lg shadow-purple-500/20 transition-smooth hover:shadow-purple-500/30 hover:brightness-110 active:scale-[0.98]"
              >
                대시보드로 이동
              </button>
            </div>
          </div>
        )}

        {/* 에러 */}
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
