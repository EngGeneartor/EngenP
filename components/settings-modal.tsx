"use client"

import { useEffect, useState } from "react"
import {
  X, User, Moon, Sun, Monitor, CreditCard, BarChart3,
  Zap, Star, ArrowUpRight, LogOut, Loader2, CheckCircle2,
  ChevronRight, Sparkles, FileDown, Mail, Calendar,
} from "lucide-react"
import { useTheme } from "next-themes"
import { supabase } from "@/lib/supabase"
import { getUsageStats } from "@/lib/services/usage-tracker"
import type { UsageStats } from "@/lib/services/usage-tracker"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

/* ═══ Constants ═══ */

const FREE_GEN_LIMIT = 10
const FREE_EXP_LIMIT = 5

/* ═══ Props ═══ */

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  userEmail?: string | null
  userId?: string | null
  userPlan?: "free" | "pro"
  createdAt?: string | null
  onSignOut: () => void
}

type Tab = "account" | "billing" | "usage" | "appearance"

/* ═══ Main Component ═══ */

export function SettingsModal({
  open,
  onClose,
  userEmail,
  userId,
  userPlan = "free",
  createdAt,
  onSignOut,
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("account")

  // Usage stats
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Stripe actions
  const [portalLoading, setPortalLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Load usage stats when modal opens
  useEffect(() => {
    if (!open || !userId) return
    setStatsLoading(true)
    getUsageStats(userId)
      .then(setUsageStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [open, userId])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open || !mounted) return null

  const isPro = userPlan === "pro"
  const genUsed = usageStats?.thisMonthGenerations ?? 0
  const expUsed = usageStats?.thisMonthExports ?? 0
  const genPct = isPro ? 0 : Math.min((genUsed / FREE_GEN_LIMIT) * 100, 100)
  const expPct = isPro ? 0 : Math.min((expUsed / FREE_EXP_LIMIT) * 100, 100)

  const openStripePortal = async () => {
    setPortalLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {} finally { setPortalLoading(false) }
  }

  const openCheckout = async () => {
    setCheckoutLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {} finally { setCheckoutLoading(false) }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "account", label: "계정", icon: <User className="size-4" /> },
    { id: "billing", label: "결제", icon: <CreditCard className="size-4" /> },
    { id: "usage", label: "사용량", icon: <BarChart3 className="size-4" /> },
    { id: "appearance", label: "화면", icon: <Sun className="size-4" /> },
  ]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/70 backdrop-blur-md" />

      {/* Modal */}
      <div className="relative z-10 flex h-[min(580px,85vh)] w-full max-w-[680px] overflow-hidden rounded-3xl border border-border/30 bg-background shadow-2xl shadow-purple-500/10">
        {/* Gradient top accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

        {/* Left: Tab navigation */}
        <div className="flex w-[180px] shrink-0 flex-col border-r border-border/20 bg-muted/10 py-5">
          <div className="px-5 mb-5">
            <h2 className="text-[15px] font-extrabold tracking-tight text-foreground/90">설정</h2>
          </div>
          <nav className="flex flex-col gap-0.5 px-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-smooth",
                  activeTab === tab.id
                    ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                    : "text-foreground/55 hover:bg-muted/30 hover:text-foreground/80"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Bottom: Sign out */}
          <div className="mt-auto px-3">
            <button
              onClick={onSignOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-foreground/50 transition-smooth hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="size-4" />
              로그아웃
            </button>
          </div>
        </div>

        {/* Right: Content */}
        <div className="relative flex-1">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-xl p-2 text-foreground/50 transition-smooth hover:bg-muted/30 hover:text-foreground/80"
          >
            <X className="size-4" />
          </button>

          <ScrollArea className="h-full">
            <div className="p-6 pr-8">

              {/* ═══ 계정 ═══ */}
              {activeTab === "account" && (
                <div>
                  <SectionHeader title="계정 정보" />
                  <div className="flex flex-col gap-0.5">
                    <InfoRow icon={<Mail className="size-4 text-purple-400" />} label="이메일" value={userEmail ?? "-"} />
                    <InfoRow icon={<Calendar className="size-4 text-indigo-400" />} label="가입일" value={createdAt ? new Date(createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "-"} />
                    <InfoRow
                      icon={isPro ? <Star className="size-4 text-purple-400" /> : <Zap className="size-4 text-foreground/50" />}
                      label="플랜"
                      value={
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[11px] font-bold",
                          isPro
                            ? "bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white"
                            : "bg-muted/40 text-foreground/70"
                        )}>
                          {isPro ? "Pro" : "Free"}
                        </span>
                      }
                    />
                  </div>
                </div>
              )}

              {/* ═══ 결제 ═══ */}
              {activeTab === "billing" && (
                <div>
                  <SectionHeader title="결제 관리" />
                  {isPro ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15 px-4 py-3">
                        <CheckCircle2 className="size-4 text-emerald-400" />
                        <p className="text-[13px] font-medium text-emerald-700 dark:text-emerald-300">Pro 플랜 이용 중</p>
                      </div>
                      <button
                        onClick={openStripePortal}
                        disabled={portalLoading}
                        className="flex items-center justify-between rounded-xl border border-border/30 bg-muted/15 px-4 py-3.5 text-[13px] font-medium text-foreground/70 transition-smooth hover:bg-muted/30 disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2.5">
                          <CreditCard className="size-4 text-foreground/50" />
                          결제 수단 변경 / 구독 관리
                        </div>
                        {portalLoading ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4 text-foreground/50" />}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.06] to-indigo-500/[0.06] p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="size-5 text-purple-400" />
                        <h4 className="text-[15px] font-bold text-foreground/90">Pro 플랜</h4>
                        <span className="text-[22px] font-extrabold text-gradient ml-auto">₩29,900</span>
                        <span className="text-[12px] text-foreground/50">/월</span>
                      </div>
                      <ul className="space-y-2 mb-4">
                        {["무제한 문제 생성", "무제한 내보내기", "10가지 전체 유형", "학교 기출 DNA 분석"].map((f) => (
                          <li key={f} className="flex items-center gap-2 text-[12px] text-foreground/70">
                            <CheckCircle2 className="size-3.5 text-purple-400" />{f}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={openCheckout}
                        disabled={checkoutLoading}
                        className="btn-shine flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 py-3 text-[13px] font-bold text-white shadow-lg shadow-purple-500/20 transition-smooth hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                      >
                        {checkoutLoading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpRight className="size-4" />}
                        업그레이드
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ 사용량 ═══ */}
              {activeTab === "usage" && (
                <div>
                  <SectionHeader title="이번 달 사용량" />
                  {statsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="size-5 animate-spin text-purple-400/50" />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <StatCard label="문제 생성" value={genUsed} limit={isPro ? "무제한" : String(FREE_GEN_LIMIT)} icon={<Sparkles className="size-4 text-purple-400" />} />
                        <StatCard label="내보내기" value={expUsed} limit={isPro ? "무제한" : String(FREE_EXP_LIMIT)} icon={<FileDown className="size-4 text-teal-400" />} />
                      </div>

                      {!isPro && (
                        <div className="flex flex-col gap-3 mb-5">
                          <ProgressBar label="생성" pct={genPct} used={genUsed} limit={FREE_GEN_LIMIT} />
                          <ProgressBar label="내보내기" pct={expPct} used={expUsed} limit={FREE_EXP_LIMIT} />
                        </div>
                      )}

                      {usageStats && (
                        <>
                          <SectionHeader title="전체 누적" className="mt-2" />
                          <div className="grid grid-cols-2 gap-3">
                            <MiniStat label="총 생성" value={usageStats.totalGenerations} />
                            <MiniStat label="총 내보내기" value={usageStats.totalExports} />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ═══ 화면 ═══ */}
              {activeTab === "appearance" && (
                <div>
                  <SectionHeader title="테마 설정" />
                  <p className="mb-4 text-[12px] text-foreground/55">화면 모드를 선택하세요.</p>
                  <div className="grid grid-cols-3 gap-2.5">
                    <ThemeCard
                      active={theme === "light"}
                      onClick={() => setTheme("light")}
                      icon={<Sun className="size-5" />}
                      label="라이트"
                      description="밝은 배경"
                    />
                    <ThemeCard
                      active={theme === "dark"}
                      onClick={() => setTheme("dark")}
                      icon={<Moon className="size-5" />}
                      label="다크"
                      description="어두운 배경"
                    />
                    <ThemeCard
                      active={theme === "system"}
                      onClick={() => setTheme("system")}
                      icon={<Monitor className="size-5" />}
                      label="시스템"
                      description="OS 설정 따름"
                    />
                  </div>
                </div>
              )}

            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

/* ═══ Sub-components ═══ */

function SectionHeader({ title, className }: { title: string; className?: string }) {
  return <h3 className={cn("mb-4 text-[16px] font-bold tracking-tight text-foreground/90", className)}>{title}</h3>
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl px-1 py-3 border-b border-border/10 last:border-0">
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-[13px] text-foreground/60">{label}</span>
      </div>
      <span className="text-[13px] font-medium text-foreground/80">{typeof value === "string" ? value : value}</span>
    </div>
  )
}

function StatCard({ label, value, limit, icon }: { label: string; value: number; limit: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/20 bg-muted/10 p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-[12px] font-semibold text-foreground/70">{label}</span></div>
      <p className="text-[24px] font-extrabold text-gradient">{value}</p>
      <p className="text-[11px] text-foreground/50">/ {limit}</p>
    </div>
  )
}

function ProgressBar({ label, pct, used, limit }: { label: string; pct: number; used: number; limit: number }) {
  const color = pct >= 100 ? "from-red-500 to-rose-400" : pct >= 70 ? "from-amber-500 to-yellow-400" : "from-purple-500 via-violet-500 to-indigo-500"
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-foreground/55">{label}</span>
        <span className={cn("text-[11px] font-bold tabular-nums", pct >= 100 ? "text-red-400" : pct >= 70 ? "text-amber-400" : "text-purple-400")}>{used}/{limit}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
        <div className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/15 border border-border/20 p-3 text-center">
      <p className="text-[20px] font-extrabold text-gradient">{value}</p>
      <p className="text-[11px] font-medium text-foreground/50">{label}</p>
    </div>
  )
}

function ThemeCard({ active, onClick, icon, label, description }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; description: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border p-5 transition-smooth",
        active
          ? "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 shadow-sm shadow-purple-500/10"
          : "border-border/20 bg-muted/10 text-foreground/50 hover:bg-muted/20 hover:text-foreground/70"
      )}
    >
      {icon}
      <span className="text-[13px] font-bold">{label}</span>
      <span className="text-[10px] text-foreground/50">{description}</span>
    </button>
  )
}
