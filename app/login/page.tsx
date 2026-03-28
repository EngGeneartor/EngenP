"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Zap, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, Check, X } from "lucide-react"
import { AmbientBackground } from "@/components/ambient-background"
import { ThemeToggle } from "@/components/theme-toggle"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/auth/callback/",
    },
  })
}

async function signInWithKakao() {
  await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: {
      redirectTo: window.location.origin + "/auth/callback/",
    },
  })
}

interface PasswordRule {
  label: string
  test: (pw: string) => boolean
}

const passwordRules: PasswordRule[] = [
  { label: "8자 이상", test: (pw) => pw.length >= 8 },
  { label: "영문 포함", test: (pw) => /[a-zA-Z]/.test(pw) },
  { label: "숫자 포함", test: (pw) => /[0-9]/.test(pw) },
  { label: "특수문자 포함 (!@#$%^&*)", test: (pw) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw) },
]

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSocialLoading, setIsSocialLoading] = useState<"google" | "kakao" | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const ruleResults = useMemo(() => passwordRules.map((r) => r.test(password)), [password])
  const passedCount = ruleResults.filter(Boolean).length
  const allPassed = passedCount === passwordRules.length
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const strengthPercent = (passedCount / passwordRules.length) * 100
  const strengthColor =
    strengthPercent <= 20 ? "bg-red-500" :
    strengthPercent <= 40 ? "bg-orange-500" :
    strengthPercent <= 60 ? "bg-amber-500" :
    strengthPercent <= 80 ? "bg-yellow-400" :
    "bg-emerald-500"
  const strengthLabel =
    strengthPercent <= 20 ? "매우 약함" :
    strengthPercent <= 40 ? "약함" :
    strengthPercent <= 60 ? "보통" :
    strengthPercent <= 80 ? "강함" :
    "매우 강함"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.")
      return
    }

    if (!isLogin) {
      if (!allPassed) {
        setError("비밀번호가 모든 조건을 충족하지 않습니다.")
        return
      }
      if (password !== confirmPassword) {
        setError("비밀번호가 일치하지 않습니다.")
        return
      }
    }

    setIsLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          if (error.message.includes("Invalid login")) {
            setError("이메일 또는 비밀번호가 올바르지 않습니다.")
          } else if (error.message.includes("Email not confirmed")) {
            setError("이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.")
          } else {
            setError(error.message)
          }
        } else {
          window.location.href = "/dashboard"
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback/`,
          },
        })
        if (error) {
          if (error.message.includes("already registered")) {
            setError("이미 가입된 이메일입니다.")
          } else {
            setError(error.message)
          }
        } else {
          setSuccess(`회원가입이 완료되었습니다! ${email}로 인증 메일을 보냈습니다. 메일함에서 인증 링크를 클릭하면 로그인할 수 있습니다.`)
        }
      }
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsLoading(false)
    }
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    setError("")
    setSuccess("")
    setPassword("")
    setConfirmPassword("")
  }

  const handleGoogleLogin = async () => {
    setError("")
    setIsSocialLoading("google")
    try {
      await signInWithGoogle()
    } catch {
      setError("Google 로그인 중 오류가 발생했습니다.")
      setIsSocialLoading(null)
    }
  }

  const handleKakaoLogin = async () => {
    setError("")
    setIsSocialLoading("kakao")
    try {
      await signInWithKakao()
    } catch {
      setError("카카오 로그인 중 오류가 발생했습니다.")
      setIsSocialLoading(null)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-6">
      <AmbientBackground />
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo */}
        <Link href="/" className="mb-10 flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-600 glow-lg shadow-xl shadow-purple-500/20">
            <Zap className="size-6 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-gradient-bright">Haean</h1>
            <p className="mt-1 text-[13px] font-medium text-foreground/60">AI 영어 내신 변형 문제 생성기</p>
          </div>
        </Link>

        {/* Card */}
        <div className="glass-card gradient-border rounded-3xl p-8">
          {/* Tab */}
          <div className="mb-8 flex rounded-2xl bg-muted/30 p-1">
            <button
              onClick={() => { if (!isLogin) switchMode() }}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold transition-smooth ${
                isLogin ? "bg-purple-500/20 text-purple-700 dark:text-purple-200 shadow-sm" : "text-foreground/60 hover:text-foreground/60"
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => { if (isLogin) switchMode() }}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold transition-smooth ${
                !isLogin ? "bg-purple-500/20 text-purple-700 dark:text-purple-200 shadow-sm" : "text-foreground/60 hover:text-foreground/60"
              }`}
            >
              회원가입
            </button>
          </div>

          {/* Error / Success Messages */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
              <p className="text-[12.5px] leading-relaxed text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
              <p className="text-[12.5px] leading-relaxed text-emerald-700 dark:text-emerald-300">{success}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label className="mb-2 block text-[12px] font-bold text-foreground/70">이메일</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-foreground/50" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-border/40 bg-muted/20 py-3.5 pl-11 pr-4 text-[13px] text-foreground placeholder:text-foreground/50 transition-smooth focus:border-purple-500/50 focus:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-[12px] font-bold text-foreground/70">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-foreground/50" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? "••••••••" : "8자 이상, 대소문자+숫자+특수문자"}
                  className="w-full rounded-xl border border-border/40 bg-muted/20 py-3.5 pl-11 pr-12 text-[13px] text-foreground placeholder:text-foreground/50 transition-smooth focus:border-purple-500/50 focus:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/55 transition-smooth hover:text-foreground/70"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              {/* Password Strength (signup only) */}
              {!isLogin && password.length > 0 && (
                <div className="mt-3 space-y-3">
                  {/* Strength bar */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-foreground/60">비밀번호 강도</span>
                      <span className={cn(
                        "text-[11px] font-bold",
                        strengthPercent <= 40 ? "text-red-400" :
                        strengthPercent <= 60 ? "text-amber-400" :
                        "text-emerald-400"
                      )}>
                        {strengthLabel}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500 ease-out", strengthColor)}
                        style={{ width: `${strengthPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Rules checklist */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {passwordRules.map((rule, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        {ruleResults[i] ? (
                          <Check className="size-3.5 text-emerald-400" strokeWidth={3} />
                        ) : (
                          <X className="size-3.5 text-foreground/45" strokeWidth={2} />
                        )}
                        <span className={cn(
                          "text-[11px] transition-smooth",
                          ruleResults[i] ? "text-emerald-400/80 font-medium" : "text-foreground/50"
                        )}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password (signup only) */}
            {!isLogin && (
              <div>
                <label className="mb-2 block text-[12px] font-bold text-foreground/70">비밀번호 확인</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-foreground/50" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호를 다시 입력해주세요"
                    className={cn(
                      "w-full rounded-xl border bg-muted/20 py-3.5 pl-11 pr-12 text-[13px] text-foreground placeholder:text-foreground/50 transition-smooth focus:bg-muted/30 focus:outline-none focus:ring-1",
                      confirmPassword.length > 0
                        ? passwordsMatch
                          ? "border-emerald-500/40 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                          : "border-red-500/40 focus:border-red-500/50 focus:ring-red-500/20"
                        : "border-border/40 focus:border-purple-500/50 focus:ring-purple-500/20"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/55 transition-smooth hover:text-foreground/70"
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={cn(
                    "mt-2 flex items-center gap-1.5 text-[11px] font-medium",
                    passwordsMatch ? "text-emerald-400" : "text-red-400"
                  )}>
                    {passwordsMatch ? (
                      <><Check className="size-3.5" strokeWidth={3} /> 비밀번호가 일치합니다</>
                    ) : (
                      <><X className="size-3.5" strokeWidth={2} /> 비밀번호가 일치하지 않습니다</>
                    )}
                  </p>
                )}
              </div>
            )}

            {isLogin && (
              <div className="flex justify-end">
                <button type="button" className="text-[12px] font-medium text-purple-500 dark:text-purple-400/70 transition-smooth hover:text-purple-700 dark:hover:text-purple-300">
                  비밀번호를 잊으셨나요?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (!isLogin && (!allPassed || !passwordsMatch))}
              className="btn-shine flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 py-4 text-[14px] font-bold text-white shadow-lg shadow-purple-500/25 transition-smooth hover:shadow-purple-500/35 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
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

          {/* ── Social login divider ─────────────────────────────── */}
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border/30" />
            <span className="text-[12px] font-medium text-foreground/55">또는</span>
            <div className="h-px flex-1 bg-border/30" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSocialLoading !== null || isLoading}
            className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-border/40 bg-white py-3.5 text-[13px] font-semibold text-gray-700 shadow-sm transition-smooth hover:bg-gray-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-border/30 dark:bg-white/95 dark:hover:bg-white"
          >
            {isSocialLoading === "google" ? (
              <div className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            ) : (
              <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            <span>Google로 계속하기</span>
          </button>

          {/* Kakao */}
          <button
            type="button"
            onClick={handleKakaoLogin}
            disabled={isSocialLoading !== null || isLoading}
            className="mt-3 flex w-full items-center justify-center gap-3 rounded-2xl border-0 bg-[#FEE500] py-3.5 text-[13px] font-semibold text-[#191919] shadow-sm transition-smooth hover:bg-[#F5DC00] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSocialLoading === "kakao" ? (
              <div className="size-4 animate-spin rounded-full border-2 border-[#3a1d1d]/30 border-t-[#191919]" />
            ) : (
              // Kakao logo mark
              <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true" fill="#191919">
                <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.736 1.634 5.133 4.1 6.538l-1.044 3.9a.375.375 0 0 0 .543.424l4.525-2.946A11.8 11.8 0 0 0 12 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
              </svg>
            )}
            <span>카카오로 계속하기</span>
          </button>
        </div>

        {/* Bottom text */}
        <p className="mt-6 text-center text-[12px] text-foreground/60">
          {isLogin ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}{" "}
          <button
            onClick={switchMode}
            className="font-bold text-purple-600 dark:text-purple-400/70 transition-smooth hover:text-purple-800 dark:hover:text-purple-300"
          >
            {isLogin ? "회원가입" : "로그인"}
          </button>
        </p>

        <p className="mt-8 text-center text-[11px] text-foreground/50">
          계속 진행하면 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  )
}
