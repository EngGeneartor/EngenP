"use client"

import Link from "next/link"
import { ArrowLeft, Zap } from "lucide-react"
import { AmbientBackground } from "@/components/ambient-background"

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      <AmbientBackground />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-16">
        {/* Back */}
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 rounded-xl border border-border/30 bg-muted/20 px-4 py-2 text-[13px] font-medium text-foreground/60 transition-smooth hover:bg-muted/40 hover:text-foreground/80"
        >
          <ArrowLeft className="size-4" />
          홈으로 돌아가기
        </Link>

        <div className="glass-card rounded-2xl p-8 md:p-12">
          {/* Header */}
          <div className="mb-10 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-600 glow-sm">
              <Zap className="size-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground/90">개인정보처리방침</h1>
              <p className="text-[12px] text-muted-foreground/50">Haean - AI 내신 변형 문제 생성기</p>
            </div>
          </div>

          <p className="mb-8 text-[13px] text-foreground/50">시행일: 2026년 3월 28일</p>

          <div className="space-y-8 text-[13.5px] leading-[1.85] text-foreground/65">
            {/* 제1조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제1조 (개인정보의 수집 항목 및 수집 방법)</h2>
              <p className="mb-2">서비스는 다음과 같은 개인정보를 수집합니다:</p>
              <div className="rounded-xl border border-border/20 bg-muted/10 p-4 space-y-3">
                <div>
                  <p className="font-semibold text-foreground/75 mb-1">필수 수집 항목</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    <li>이메일 주소 (회원가입 및 로그인)</li>
                    <li>비밀번호 (암호화 저장)</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-foreground/75 mb-1">서비스 이용 시 자동 수집</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    <li>서비스 이용 기록 (문제 생성 횟수, 내보내기 횟수)</li>
                    <li>접속 로그, IP 주소, 브라우저 정보</li>
                    <li>업로드된 지문 데이터 (문제 생성 목적으로만 사용)</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-foreground/75 mb-1">결제 시 수집 (Stripe 처리)</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    <li>결제 카드 정보 (Stripe에서 직접 처리, 서비스 서버에 저장하지 않음)</li>
                    <li>결제 내역, 구독 상태</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 제2조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제2조 (개인정보의 수집 및 이용 목적)</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>회원 관리: 회원가입, 본인 확인, 서비스 이용 관리</li>
                <li>서비스 제공: AI 문제 생성, 사용량 추적, 내보내기 기능 제공</li>
                <li>결제 처리: 구독 관리, 결제 내역 확인, 환불 처리</li>
                <li>서비스 개선: 이용 패턴 분석을 통한 서비스 품질 향상</li>
                <li>고객 지원: 문의 응대, 공지사항 전달</li>
              </ul>
            </section>

            {/* 제3조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제3조 (개인정보의 제3자 제공 및 위탁)</h2>
              <p className="mb-2">서비스는 다음의 제3자에게 개인정보 처리를 위탁합니다:</p>
              <div className="rounded-xl border border-border/20 bg-muted/10 p-4">
                <div className="grid gap-3">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 rounded-lg bg-purple-500/10 px-2.5 py-1 text-[11px] font-bold text-purple-400">Supabase</span>
                    <p className="text-[12.5px]">데이터베이스 호스팅, 사용자 인증(Authentication), 파일 저장소 제공</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-[11px] font-bold text-indigo-400">Stripe</span>
                    <p className="text-[12.5px]">결제 처리, 구독 관리, 카드 정보 처리 (PCI DSS 준수)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 rounded-lg bg-violet-500/10 px-2.5 py-1 text-[11px] font-bold text-violet-400">Anthropic</span>
                    <p className="text-[12.5px]">AI 모델(Claude) API를 통한 문제 생성 처리</p>
                  </div>
                </div>
              </div>
              <p className="mt-3">
                위 서비스 제공자 외에는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
              </p>
            </section>

            {/* 제4조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제4조 (개인정보의 보유 및 이용 기간)</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>회원 탈퇴 시: 개인정보는 탈퇴 후 30일 이내에 파기합니다.</li>
                <li>업로드된 지문 데이터: 문제 생성 완료 후 24시간 이내에 서버에서 삭제합니다.</li>
                <li>결제 관련 정보: 관련 법률에 따라 5년간 보관합니다.</li>
                <li>서비스 이용 기록: 서비스 개선 목적으로 익명화 처리 후 보관할 수 있습니다.</li>
              </ul>
            </section>

            {/* 제5조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제5조 (개인정보의 파기 절차 및 방법)</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>전자적 파일: 복구 불가능한 방법으로 영구 삭제</li>
                <li>데이터베이스 기록: Supabase에서 완전 삭제 처리</li>
                <li>결제 정보: Stripe 내 고객 데이터 삭제 요청</li>
              </ul>
            </section>

            {/* 제6조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제6조 (이용자의 권리)</h2>
              <p>이용자는 언제든지 다음과 같은 권리를 행사할 수 있습니다:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>개인정보 열람, 정정, 삭제 요청</li>
                <li>개인정보 처리 정지 요청</li>
                <li>계정 탈퇴 및 데이터 삭제 요청</li>
                <li>개인정보 이동권 (데이터 다운로드 요청)</li>
              </ul>
              <p className="mt-2">
                위 요청은 <a href="mailto:support@haean.app" className="underline hover:text-foreground/80 transition-smooth">support@haean.app</a>으로 연락하시면 처리됩니다.
              </p>
            </section>

            {/* 제7조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제7조 (개인정보의 안전성 확보 조치)</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>비밀번호 암호화(bcrypt) 저장</li>
                <li>SSL/TLS를 통한 데이터 전송 암호화</li>
                <li>Supabase Row Level Security(RLS)를 통한 데이터 접근 제어</li>
                <li>정기적인 보안 점검 및 업데이트</li>
              </ul>
            </section>

            {/* 제8조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제8조 (쿠키 및 추적 기술)</h2>
              <p>
                서비스는 인증 세션 유지를 위해 필수 쿠키를 사용합니다.
                분석 목적의 쿠키는 별도 동의 후 사용됩니다.
                브라우저 설정에서 쿠키를 비활성화할 수 있으나, 일부 서비스 이용이 제한될 수 있습니다.
              </p>
            </section>

            {/* 제9조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제9조 (개인정보 보호책임자)</h2>
              <div className="rounded-xl border border-border/20 bg-muted/10 p-4">
                <p>이메일: <a href="mailto:support@haean.app" className="underline hover:text-foreground/80 transition-smooth">support@haean.app</a></p>
                <p className="mt-1">개인정보 관련 문의, 불만 처리, 피해 구제 등을 담당합니다.</p>
              </div>
            </section>

            {/* 제10조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제10조 (개인정보처리방침의 변경)</h2>
              <p>
                본 개인정보처리방침은 관련 법률 또는 서비스 정책 변경에 따라 수정될 수 있습니다.
                변경 시 시행일 7일 전에 서비스 내 공지 또는 이메일을 통해 안내합니다.
              </p>
            </section>

            <div className="divider-gradient mt-8" />
            <p className="text-[12px] text-foreground/40 pt-2">
              문의: <a href="mailto:support@haean.app" className="underline hover:text-foreground/60 transition-smooth">support@haean.app</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
