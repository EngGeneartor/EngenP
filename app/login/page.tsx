"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Zap, Mail, Lock, ArrowRight, Eye, EyeOff, Chrome } from "lucide-react"
import { AmbientBackground } from "@/components/ambient-background"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setTimeout(() => {
      router.push("/EngenP/dashboard/")
    }, 800)
  }

  const handleGoogleLogin = () => {
    setIsLoading(true)
    setTimeout(() => {
      router.push("/EngenP/dashboard/")
    }, 800)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-6">
      <AmbientBackground />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo */}
        <Link href="/" className="mb-10 flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-600 glow-lg shadow-xl shadow-purple-500/20">
            <Zap className="size-6 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-gradient-bright">EngenP</h1>
            <p className="mt-1 text-[13px] font-medium text-foreground/60">AI 영어 내신 변형 문제 생성기</p>
          </div>
        </Link>

        {/* Card */}
        <div className="glass-card gradient-border rounded-3xl p-8">
          {/* Tab */}
          <div className="mb-8 flex rounded-2xl bg-muted/30 p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold transition-smooth ${
                isLogin ? "bg-purple-500/20 text-purple-200 shadow-sm" : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold transition-smooth ${
                !isLogin ? "bg-purple-500/20 text-purple-200 shadow-sm" : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              회원가입
            </button>
          </div>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="mb-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-border/40 bg-muted/20 py-3.5 text-[13px] font-semibold text-foreground/80 transition-smooth hover:bg-muted/40 hover:text-white disabled:opacity-50"
          >
            <Chrome className="size-4" />
            Google로 {isLogin ? "로그인" : "회원가입"}
          </button>

          {/* Divider */}
          <div className="mb-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/50 to-transparent" />
            <span className="text-[11px] font-medium text-foreground/35">또는</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/50 to-transparent" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-[12px] font-bold text-foreground/70">이메일</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-foreground/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-border/40 bg-muted/20 py-3.5 pl-11 pr-4 text-[13px] text-white placeholder:text-foreground/30 transition-smooth focus:border-purple-500/50 focus:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[12px] font-bold text-foreground/70">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-foreground/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border/40 bg-muted/20 py-3.5 pl-11 pr-12 text-[13px] text-white placeholder:text-foreground/30 transition-smooth focus:border-purple-500/50 focus:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/35 transition-smooth hover:text-foreground/70"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex justify-end">
                <button type="button" className="text-[12px] font-medium text-purple-400/70 transition-smooth hover:text-purple-300">
                  비밀번호를 잊으셨나요?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-shine flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 py-4 text-[14px] font-bold text-white shadow-lg shadow-purple-500/25 transition-smooth hover:shadow-purple-500/35 hover:brightness-110 disabled:opacity-50 active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>잠시만요...</span>
                </div>
              ) : (
                <>
                  {isLogin ? "로그인" : "계정 만들기"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Bottom text */}
        <p className="mt-6 text-center text-[12px] text-foreground/40">
          {isLogin ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-bold text-purple-400/70 transition-smooth hover:text-purple-300"
          >
            {isLogin ? "회원가입" : "로그인"}
          </button>
        </p>

        <p className="mt-8 text-center text-[11px] text-foreground/30">
          계속 진행하면 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  )
}
