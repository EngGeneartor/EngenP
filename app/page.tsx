"use client"

import Link from "next/link"
import { Zap, Upload, Sparkles, FileDown, ArrowRight, BookOpen, Brain, Target, Shield, Clock, ChevronRight, Star, GraduationCap, BarChart3, MessageCircle } from "lucide-react"
import { AmbientBackground } from "@/components/ambient-background"
import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"

function FadeIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isInView } = useInView(0.1)
  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function SlideIn({ children, className, direction = "left", delay = 0 }: { children: React.ReactNode; className?: string; direction?: "left" | "right"; delay?: number }) {
  const { ref, isInView } = useInView(0.1)
  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        isInView
          ? "opacity-100 translate-x-0"
          : direction === "left"
            ? "opacity-0 -translate-x-12"
            : "opacity-0 translate-x-12",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

const features = [
  {
    icon: Brain,
    title: "VLM 기반 지문 분석",
    desc: "이미지/PDF에서 지문, 문제, 선지, 정답을 AI가 자동으로 JSON 구조화합니다.",
    color: "from-purple-500 to-violet-600",
    glow: "purple",
  },
  {
    icon: Target,
    title: "학교 기출 DNA 분석",
    desc: "기출문제의 출제 패턴, 선호 어법, 오답 구성 방식을 분석하여 맞춤형 문제를 생성합니다.",
    color: "from-indigo-500 to-blue-600",
    glow: "indigo",
  },
  {
    icon: Sparkles,
    title: "10가지 표준 유형",
    desc: "어법, 어휘, 빈칸 추론, 순서 배열 등 내신에 필요한 모든 유형을 지원합니다.",
    color: "from-violet-500 to-fuchsia-600",
    glow: "violet",
  },
  {
    icon: Shield,
    title: "Self-Correction 검증",
    desc: "생성된 문항이 원문을 벗어나지 않는지 AI가 2차 검증하여 품질을 보장합니다.",
    color: "from-fuchsia-500 to-pink-600",
    glow: "fuchsia",
  },
]

const steps = [
  { num: "01", icon: Upload, title: "지문 업로드", desc: "모의고사, 교과서, 추가지문을 PDF나 이미지로 업로드" },
  { num: "02", icon: Brain, title: "AI 분석 & 생성", desc: "Claude가 지문을 분석하고 선택한 유형의 변형 문제를 생성" },
  { num: "03", icon: FileDown, title: "워드 파일 추출", desc: "문제 + 정답 해설이 분리된 .docx 파일을 다운로드" },
]

const stats = [
  { value: "10+", label: "문제 유형" },
  { value: "5단계", label: "난이도 조절" },
  { value: "< 30초", label: "생성 속도" },
  { value: "99%", label: "정확도 목표" },
]

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      <AmbientBackground />

      {/* ═══ Navigation ═══ */}
      <nav className="fixed top-0 z-50 w-full sidebar-glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-600 glow-sm">
              <Zap className="size-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-gradient-bright">EngenP</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[13px] font-medium text-foreground/65 transition-smooth hover:text-foreground/80">기능</a>
            <a href="#how-it-works" className="text-[13px] font-medium text-foreground/65 transition-smooth hover:text-foreground/80">사용 방법</a>
            <a href="#pricing" className="text-[13px] font-medium text-foreground/65 transition-smooth hover:text-foreground/80">요금</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13px] font-semibold text-foreground/60 transition-smooth hover:text-foreground/90 px-4 py-2">
              로그인
            </Link>
            <Link
              href="/login"
              className="btn-shine rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-purple-500/20 transition-smooth hover:shadow-purple-500/30 hover:brightness-110"
            >
              시작하기
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ Hero ═══ */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pt-20 text-center">
        <FadeIn>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/[0.06] px-4 py-1.5">
            <Sparkles className="size-3.5 text-purple-400" />
            <span className="text-[12px] font-semibold text-purple-300">AI 기반 영어 내신 대비 솔루션</span>
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <h1 className="max-w-4xl text-5xl font-extrabold leading-[1.15] tracking-tight md:text-7xl">
            <span className="text-foreground/90">시험 지문을 넣으면</span>
            <br />
            <span className="text-gradient">변형 문제가 나온다</span>
          </h1>
        </FadeIn>

        <FadeIn delay={200}>
          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-foreground/60 md:text-lg">
            모의고사, 교과서, 추가지문을 업로드하면 AI가 분석하여
            <br className="hidden md:block" />
            고품질 변형 문제, 워크북, 동형 모의고사를 자동으로 생성합니다.
          </p>
        </FadeIn>

        <FadeIn delay={300}>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="btn-shine group flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-8 py-4 text-[15px] font-bold text-white shadow-xl shadow-purple-500/20 transition-smooth hover:shadow-purple-500/35 hover:brightness-110 active:scale-[0.98]"
            >
              무료로 시작하기
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-2xl border border-border/40 bg-muted/20 px-8 py-4 text-[15px] font-semibold text-foreground/60 transition-smooth hover:bg-muted/40 hover:text-foreground/80"
            >
              데모 체험하기
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={450}>
          <p className="mt-5 text-[12px] text-foreground/40">카드 등록 없이 무료로 시작 · 매월 10회 무료 생성</p>
        </FadeIn>

        {/* Hero Dashboard Preview */}
        <FadeIn delay={500} className="mt-16 w-full max-w-5xl">
          <div className="gradient-border rounded-2xl overflow-hidden glow-lg">
            <div className="glass-card rounded-2xl p-1">
              <div className="rounded-xl bg-background/60 overflow-hidden">
                {/* Mock browser chrome */}
                <div className="flex items-center gap-2 border-b border-border/20 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="size-2.5 rounded-full bg-red-500/40" />
                    <div className="size-2.5 rounded-full bg-yellow-500/40" />
                    <div className="size-2.5 rounded-full bg-green-500/40" />
                  </div>
                  <div className="ml-4 flex-1 rounded-lg bg-muted/30 px-4 py-1.5">
                    <span className="text-[11px] text-muted-foreground/40">app.engenp.com/dashboard</span>
                  </div>
                </div>
                {/* Mock dashboard */}
                <div className="flex h-[340px] md:h-[420px]">
                  {/* Mock sidebar */}
                  <div className="hidden sm:flex w-[200px] shrink-0 flex-col border-r border-border/15 p-4">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="size-6 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600" />
                      <span className="text-[11px] font-bold text-foreground/65">EngenP</span>
                    </div>
                    <div className="space-y-2">
                      <div className="rounded-lg bg-purple-500/10 px-3 py-2"><span className="text-[10px] text-purple-300">타겟 지문 업로드</span></div>
                      <div className="rounded-lg bg-muted/20 px-3 py-2"><span className="text-[10px] text-foreground/30">기출 스타일 분석</span></div>
                      <div className="rounded-lg bg-muted/20 px-3 py-2"><span className="text-[10px] text-foreground/30">출제 옵션</span></div>
                    </div>
                    <div className="mt-auto">
                      <div className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-2 text-center">
                        <span className="text-[10px] font-bold text-white">문제 생성하기</span>
                      </div>
                    </div>
                  </div>
                  {/* Mock main */}
                  <div className="flex-1 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="pill border border-purple-500/20 bg-purple-500/8 text-purple-400">EBS 수능특강</span>
                      <span className="pill border border-emerald-500/20 bg-emerald-500/8 text-emerald-400">3문항 생성</span>
                    </div>
                    <div className="mb-3 text-[13px] font-bold text-foreground/70">Cultural Intelligence in a Globalized World</div>
                    <div className="space-y-2">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="flex items-center gap-3 rounded-xl bg-muted/15 border border-border/10 p-3">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 text-[11px] font-bold text-white">{n}</div>
                          <div className="flex-1">
                            <div className="h-2 w-3/4 rounded bg-foreground/8" />
                            <div className="mt-1.5 h-2 w-1/2 rounded bg-foreground/5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Scroll indicator */}
        <div className="mt-12 animate-bounce">
          <div className="mx-auto h-8 w-5 rounded-full border-2 border-foreground/15 p-1">
            <div className="mx-auto h-2 w-1 rounded-full bg-foreground/25 animate-[scroll-dot_2s_ease-in-out_infinite]" />
          </div>
        </div>
      </section>

      {/* ═══ Stats Bar ═══ */}
      <section className="relative z-10 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <FadeIn>
            <div className="glass-card rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className="text-3xl font-extrabold tracking-tight text-gradient">{stat.value}</p>
                    <p className="mt-1 text-[12px] font-medium text-muted-foreground/70">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ Features ═══ */}
      <section id="features" className="relative z-10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn className="text-center">
            <span className="pill border border-purple-500/20 bg-purple-500/[0.06] text-purple-400">핵심 기능</span>
            <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-foreground/90 md:text-5xl">
              내신 대비의 모든 것을<br /><span className="text-gradient">AI가 해결합니다</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] text-foreground/55">
              수동으로 문제를 만드는 시대는 끝났습니다. 지문을 넣기만 하면 됩니다.
            </p>
          </FadeIn>

          <div className="mt-16 grid gap-5 md:grid-cols-2">
            {features.map((f, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="glass-card hover-lift group rounded-2xl p-7">
                  <div className={`mb-5 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color} glow-sm transition-smooth group-hover:glow-md`}>
                    <f.icon className="size-5 text-white" />
                  </div>
                  <h3 className="text-[17px] font-bold text-foreground/85">{f.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/60">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section id="how-it-works" className="relative z-10 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <FadeIn className="text-center">
            <span className="pill border border-indigo-500/20 bg-indigo-500/[0.06] text-indigo-400">사용 방법</span>
            <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-foreground/90 md:text-5xl">
              <span className="text-gradient">3단계</span>로 끝나는 문제 생성
            </h2>
          </FadeIn>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <FadeIn key={i} delay={i * 150}>
                <div className="relative text-center">
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div className="absolute right-0 top-12 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-purple-500/20 to-transparent md:block" />
                  )}
                  <div className="relative mx-auto mb-6 flex size-24 items-center justify-center">
                    {/* Ring */}
                    <div className="absolute inset-0 rounded-full border border-purple-500/15" />
                    <div className="absolute inset-2 rounded-full border border-purple-500/10" />
                    <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/15 to-indigo-500/15">
                      <step.icon className="size-7 text-purple-400" />
                    </div>
                    <span className="absolute -right-1 -top-1 flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-[11px] font-extrabold text-white shadow-lg shadow-purple-500/30">
                      {step.num.replace('0', '')}
                    </span>
                  </div>
                  <h3 className="text-[16px] font-bold text-foreground/85">{step.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-foreground/55">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Who Is It For ═══ */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <SlideIn direction="left">
              <span className="pill border border-violet-500/20 bg-violet-500/[0.06] text-violet-400">누구를 위한 서비스인가요?</span>
              <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-foreground/90 md:text-4xl">
                선생님도, 학생도<br /><span className="text-gradient">더 이상 시간 낭비 없이</span>
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-foreground/55">
                기존에 몇 시간이 걸리던 변형 문제 제작을 몇 분으로 단축합니다.
                학생들은 자기 학교 스타일에 맞는 문제로 효율적으로 대비할 수 있습니다.
              </p>
            </SlideIn>
            <SlideIn direction="right" delay={150}>
              <div className="space-y-4">
                {[
                  { icon: GraduationCap, title: "영어 내신 단과 강사", desc: "변형 문제, 워크북 제작 시간을 90% 단축" },
                  { icon: BookOpen, title: "독학하는 학생", desc: "학교 기출 스타일에 맞춘 맞춤형 연습 문제" },
                  { icon: BarChart3, title: "학원 운영자", desc: "대량의 문제를 일관된 품질로 빠르게 생산" },
                ].map((item, i) => (
                  <div key={i} className="glass-card hover-lift flex items-start gap-4 rounded-2xl p-5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/15 to-indigo-500/15">
                      <item.icon className="size-5 text-purple-400/80" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-foreground/80">{item.title}</h4>
                      <p className="mt-1 text-[12.5px] text-foreground/55">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SlideIn>
          </div>
        </div>
      </section>

      {/* ═══ Pricing ═══ */}
      <section id="pricing" className="relative z-10 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <FadeIn className="text-center">
            <span className="pill border border-fuchsia-500/20 bg-fuchsia-500/[0.06] text-fuchsia-400">요금제</span>
            <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-foreground/90 md:text-5xl">
              심플한 <span className="text-gradient">요금제</span>
            </h2>
          </FadeIn>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {/* Free */}
            <FadeIn delay={0}>
              <div className="glass-card rounded-2xl p-8">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground/70">Free</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground/90">₩0</span>
                  <span className="text-[13px] text-muted-foreground/40">/월</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {["매월 10회 생성", "5가지 기본 유형", "PDF/JPG 업로드", ".docx 추출"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-[13px] text-foreground/55">
                      <Star className="size-3.5 text-purple-400/60" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="mt-8 flex w-full items-center justify-center rounded-xl border border-border/30 bg-muted/20 py-3 text-[13px] font-semibold text-foreground/60 transition-smooth hover:bg-muted/40">
                  무료로 시작
                </Link>
              </div>
            </FadeIn>

            {/* Pro */}
            <FadeIn delay={100}>
              <div className="gradient-border glass-card relative rounded-2xl p-8">
                <div className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-1 text-[11px] font-bold text-white shadow-lg shadow-purple-500/30">
                  추천
                </div>
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-purple-400">Pro</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gradient">₩29,900</span>
                  <span className="text-[13px] text-muted-foreground/40">/월</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {["무제한 생성", "10가지 전체 유형", "학교 기출 DNA 분석", "동형 모의고사 생성", "우선 처리 큐", "워크북 자동 생성"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-[13px] text-foreground/55">
                      <Star className="size-3.5 text-purple-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="btn-shine mt-8 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 py-3 text-[13px] font-bold text-white shadow-lg shadow-purple-500/20 transition-smooth hover:shadow-purple-500/30 hover:brightness-110">
                  Pro 시작하기
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <FadeIn>
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground/90 md:text-5xl">
              지금 바로<br /><span className="text-gradient">변형 문제를 만들어보세요</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] text-foreground/55">
              회원가입 후 바로 사용할 수 있습니다. 첫 10회는 완전 무료.
            </p>
            <Link
              href="/login"
              className="btn-shine mt-10 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-10 py-5 text-[16px] font-bold text-white shadow-xl shadow-purple-500/25 transition-smooth hover:shadow-purple-500/40 hover:brightness-110 active:scale-[0.98]"
            >
              Get Started — 무료로 시작
              <ArrowRight className="size-5" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="relative z-10 border-t border-border/20 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
              <Zap className="size-3.5 text-white" />
            </div>
            <span className="text-[14px] font-bold text-gradient-bright">EngenP</span>
          </div>
          <p className="text-[12px] text-muted-foreground/50">
            © 2026 EngenP. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-[12px] text-muted-foreground/50 transition-smooth hover:text-foreground/60">이용약관</a>
            <a href="#" className="text-[12px] text-muted-foreground/50 transition-smooth hover:text-foreground/60">개인정보처리방침</a>
            <a href="#" className="text-[12px] text-muted-foreground/50 transition-smooth hover:text-foreground/60">문의</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
