"use client"

import Link from "next/link"
import { ArrowLeft, Zap } from "lucide-react"
import { AmbientBackground } from "@/components/ambient-background"

export default function TermsPage() {
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
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground/90">이용약관</h1>
              <p className="text-[12px] text-muted-foreground/50">Haean - AI 내신 변형 문제 생성기</p>
            </div>
          </div>

          <p className="mb-8 text-[13px] text-foreground/50">시행일: 2026년 3월 28일</p>

          <div className="space-y-8 text-[13.5px] leading-[1.85] text-foreground/65">
            {/* 제1조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제1조 (목적)</h2>
              <p>
                본 약관은 Haean (이하 &ldquo;서비스&rdquo;)이 제공하는 AI 기반 영어 내신 변형 문제 생성 서비스의 이용과
                관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            {/* 제2조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제2조 (서비스의 내용)</h2>
              <p>서비스는 다음과 같은 기능을 제공합니다:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>모의고사, 교과서, 추가지문 등의 PDF/이미지 업로드 및 AI 분석</li>
                <li>VLM(Vision Language Model) 기반 지문 구조화 및 변형 문제 자동 생성</li>
                <li>어법, 어휘, 빈칸 추론, 순서 배열 등 10가지 문제 유형 지원</li>
                <li>생성된 문제의 .docx(워드) 파일 내보내기</li>
                <li>학교 기출 DNA 분석 및 맞춤형 문제 생성 (Pro 플랜)</li>
              </ul>
            </section>

            {/* 제3조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제3조 (계정 및 이용자 책임)</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>이용자는 회원가입 시 정확한 정보를 제공해야 하며, 허위 정보 입력으로 인한 불이익은 이용자의 책임입니다.</li>
                <li>계정의 아이디와 비밀번호 관리 책임은 이용자에게 있으며, 제3자에게 양도하거나 대여할 수 없습니다.</li>
                <li>이용자는 서비스를 이용하여 생성한 문제를 상업적으로 사용할 수 있으나, 원문 저작물의 저작권은 해당 권리자에게 있습니다.</li>
                <li>서비스를 불법적인 목적으로 사용하거나, 다른 이용자의 서비스 이용을 방해하는 행위를 금지합니다.</li>
              </ul>
            </section>

            {/* 제4조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제4조 (요금 및 결제)</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Free 플랜: 매월 10회 문제 생성, 5회 내보내기 가능 (무료)</li>
                <li>Pro 플랜: 월 ₩29,900, 무제한 생성 및 내보내기, 전체 기능 이용 가능</li>
                <li>결제는 Stripe를 통해 처리되며, 월 단위 자동 갱신됩니다.</li>
                <li>구독 취소는 언제든 가능하며, 취소 시 해당 결제 주기가 끝날 때까지 서비스를 이용할 수 있습니다.</li>
                <li>환불은 결제일로부터 7일 이내에 요청할 수 있으며, 서비스를 실질적으로 이용하지 않은 경우에 한합니다.</li>
              </ul>
            </section>

            {/* 제5조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제5조 (서비스 변경 및 중단)</h2>
              <p>
                서비스는 기술적 필요, 운영상 이유, 또는 법률적 요구에 따라 서비스의 전부 또는 일부를 변경하거나
                중단할 수 있습니다. 중대한 변경 사항은 사전에 공지합니다.
              </p>
            </section>

            {/* 제6조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제6조 (책임의 제한)</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>AI가 생성한 문제의 정확성, 적합성에 대해 서비스는 최선을 다하나, 완전한 정확성을 보장하지 않습니다.</li>
                <li>이용자는 생성된 문제를 사용하기 전에 내용을 검토할 책임이 있습니다.</li>
                <li>서비스 이용 중 발생하는 데이터 손실, 서비스 중단 등에 대해 서비스의 고의 또는 중과실이 없는 한 책임을 지지 않습니다.</li>
                <li>천재지변, 서버 장애, 네트워크 문제 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
              </ul>
            </section>

            {/* 제7조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제7조 (지적 재산권)</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>서비스의 소프트웨어, 디자인, 브랜드 등 모든 지적 재산권은 Haean에 귀속됩니다.</li>
                <li>이용자가 업로드한 원문 콘텐츠에 대한 권리는 이용자(또는 원 저작권자)에게 있습니다.</li>
                <li>AI가 생성한 변형 문제에 대한 이용권은 이용자에게 부여됩니다.</li>
              </ul>
            </section>

            {/* 제8조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제8조 (약관의 변경)</h2>
              <p>
                본 약관은 관련 법률의 변경이나 서비스 정책 변경에 따라 수정될 수 있습니다.
                약관 변경 시 시행일 7일 전에 서비스 내 공지 또는 이메일을 통해 안내합니다.
                변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.
              </p>
            </section>

            {/* 제9조 */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold text-foreground/85">제9조 (분쟁 해결)</h2>
              <p>
                본 약관과 관련된 분쟁은 대한민국 법률에 따라 해결하며,
                관할 법원은 서비스 소재지를 관할하는 법원으로 합니다.
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
