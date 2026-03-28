#!/usr/bin/env python3
"""
Notion 작업 일지 업데이트 스크립트
1) v3 전체 문서화 페이지 신규 생성
2) 기존 하위 페이지들에 구현 내용 채워넣기
"""

import json
import time
import requests

TOKEN = "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"
PARENT_PAGE_ID = "330f2793d19281d890fdf5ebc44f10f1"  # 작업 일지 메인 페이지
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}
BASE = "https://api.notion.com/v1"

# 기존 하위 페이지 ID들
SUBPAGES = {
    "vlm": "330f2793d1928142a90ef4e2734e7092",           # VLM 지문 구조화
    "upload_pipeline": "330f2793d19281a28061f95b7a8611e9", # 파일 업로드 → VLM 파이프라인
    "mvp_5types": "330f2793d19281909f56cd086f84e6d2",      # 변형문제 5개 유형 MVP
    "ai_copilot": "330f2793d19281a2ae95fdd703bea9c7",      # AI Co-pilot 채팅
    "docx_export": "330f2793d192815c9375e646bfcdc9e3",     # .docx 출력 모듈
    "vercel_deploy": "330f2793d19281bbb182c62c4e7d090c",   # Vercel 배포 전환
    "subscription": "330f2793d1928127bb0cc12a996c5c75",    # 구독 결제 시스템
}


def append_blocks(parent_id, blocks):
    """Append blocks in batches of 100"""
    for i in range(0, len(blocks), 100):
        batch = blocks[i:i+100]
        r = requests.patch(
            f"{BASE}/blocks/{parent_id}/children",
            headers=HEADERS,
            json={"children": batch},
        )
        if r.status_code != 200:
            print(f"  Error batch {i//100}: {r.status_code} - {r.text[:300]}")
        else:
            print(f"  Batch {i//100 + 1} OK ({len(batch)} blocks)")
        time.sleep(0.35)


def create_page(parent_id, title, icon="📄"):
    """Create a new child page under a parent page"""
    r = requests.post(
        f"{BASE}/pages",
        headers=HEADERS,
        json={
            "parent": {"type": "page_id", "page_id": parent_id},
            "icon": {"type": "emoji", "emoji": icon},
            "properties": {
                "title": [{"type": "text", "text": {"content": title}}]
            },
        },
    )
    if r.status_code == 200:
        page_id = r.json()["id"]
        print(f"  Page created: {title} -> {page_id}")
        return page_id
    else:
        print(f"  Error creating page: {r.status_code} - {r.text[:300]}")
        return None


def get_children(block_id):
    blocks = []
    cursor = None
    while True:
        url = f"{BASE}/blocks/{block_id}/children?page_size=100"
        if cursor:
            url += f"&start_cursor={cursor}"
        r = requests.get(url, headers=HEADERS)
        data = r.json()
        blocks.extend(data.get("results", []))
        if not data.get("has_more"):
            break
        cursor = data.get("next_cursor")
    return blocks


def delete_block(block_id):
    r = requests.delete(f"{BASE}/blocks/{block_id}", headers=HEADERS)
    return r.status_code


def clear_page(page_id):
    """Clear all blocks from a page"""
    children = get_children(page_id)
    count = 0
    for b in children:
        delete_block(b["id"])
        count += 1
        if count % 15 == 0:
            time.sleep(0.4)
    print(f"  Cleared {count} blocks from {page_id}")


# --- Block builders ---
def h1(text):
    return {"type": "heading_1", "heading_1": {"rich_text": rt(text)}}

def h2(text):
    return {"type": "heading_2", "heading_2": {"rich_text": rt(text)}}

def h3(text):
    return {"type": "heading_3", "heading_3": {"rich_text": rt(text)}}

def para(text):
    return {"type": "paragraph", "paragraph": {"rich_text": rt(text)}}

def bold_para(bold_text, normal_text=""):
    parts = [{"type": "text", "text": {"content": bold_text}, "annotations": {"bold": True}}]
    if normal_text:
        parts.append({"type": "text", "text": {"content": normal_text}})
    return {"type": "paragraph", "paragraph": {"rich_text": parts}}

def bullet(text):
    return {"type": "bulleted_list_item", "bulleted_list_item": {"rich_text": rt(text)}}

def numbered(text):
    return {"type": "numbered_list_item", "numbered_list_item": {"rich_text": rt(text)}}

def todo(text, checked=False):
    return {"type": "to_do", "to_do": {"rich_text": rt(text), "checked": checked}}

def divider():
    return {"type": "divider", "divider": {}}

def callout(text, icon="💡"):
    return {"type": "callout", "callout": {"rich_text": rt(text), "icon": {"type": "emoji", "emoji": icon}}}

def quote(text):
    return {"type": "quote", "quote": {"rich_text": rt(text)}}

def code_block(text, lang="plain text"):
    return {"type": "code", "code": {"rich_text": rt(text), "language": lang}}

def toggle(text, children=None):
    block = {"type": "toggle", "toggle": {"rich_text": rt(text)}}
    if children:
        block["toggle"]["children"] = children
    return block

def rt(text):
    if len(text) <= 2000:
        return [{"type": "text", "text": {"content": text}}]
    parts = []
    for i in range(0, len(text), 2000):
        parts.append({"type": "text", "text": {"content": text[i:i+2000]}})
    return parts

def table_row(cells):
    return {
        "type": "table_row",
        "table_row": {
            "cells": [[{"type": "text", "text": {"content": c}}] for c in cells]
        }
    }

def table(width, rows):
    return {
        "type": "table",
        "table": {
            "table_width": width,
            "has_column_header": True,
            "has_row_header": False,
            "children": rows,
        }
    }


# ============================================================
# 새 페이지: v3 전체 문서화
# ============================================================
def build_v3_doc_blocks():
    blocks = []

    blocks.append(callout("Haean v3 — AI 영어 내신 변형 문제 자동 생성 SaaS\n최종 업데이트: 2026-03-29 | 작성: Claude Code 자동 문서화", "🚀"))
    blocks.append(para("배포 URL: https://haean.vercel.app"))
    blocks.append(divider())

    # 프로젝트 개요
    blocks.append(h1("📋 프로젝트 개요"))
    blocks.append(para("학교 프린트/모의고사 지문(JPG, PDF)을 업로드하면 VLM(Claude)이 분석하여 변형 문제, 워크북, 동형 모의고사를 자동 생성하고 .docx/.hwpx로 출력하는 구독형 웹 서비스."))
    blocks.append(bold_para("타겟 사용자: ", "영어 내신 단과 강사, 독학 학생"))
    blocks.append(bold_para("브랜드: ", "Abyss → Haean (v3에서 전면 리브랜딩)"))
    blocks.append(divider())

    # 기술 스택
    blocks.append(h1("🛠️ 기술 스택"))
    blocks.append(table(3, [
        table_row(["영역", "기술", "비고"]),
        table_row(["프론트엔드", "Next.js 15.5.14 + React 19 + TypeScript", "App Router"]),
        table_row(["UI", "Tailwind CSS 4 + shadcn/ui + Radix UI", "다크/라이트/시스템 테마"]),
        table_row(["AI/LLM", "Claude API (claude-sonnet-4-6-20250514)", "Vision 입력 지원"]),
        table_row(["DB", "Supabase (PostgreSQL + Auth + RLS)", "Row Level Security"]),
        table_row(["결제", "토스페이먼츠", "카드/카카오페이/네이버페이/토스페이"]),
        table_row(["배포", "Vercel", "자동 배포 + HTTPS"]),
        table_row(["인증", "Supabase Auth (이메일 + Google OAuth)", "JWT 기반"]),
        table_row(["문서출력", "docx (npm) + JSZip (hwpx)", ".docx / .hwpx"]),
    ]))
    blocks.append(divider())

    # v2 → v3 변경사항
    blocks.append(h1("🔄 v2 → v3 변경사항 총정리"))

    blocks.append(h2("브랜드 리뉴얼"))
    blocks.append(bullet("Abyss → Haean 브랜드 전면 변경 (서비스명, 로고, 메타데이터, 푸터)"))
    blocks.append(bullet("랜딩페이지 카피 전면 재작성 (한국어)"))
    blocks.append(bullet("다크 퍼플 + 인디고 컬러 시스템, 라이트모드 추가"))
    blocks.append(bullet("OG 메타태그 + metadataBase 설정 (카카오톡 공유 대응)"))

    blocks.append(h2("AI 파이프라인 완성"))
    blocks.append(bullet("구조화: Claude Vision API 6단계 분석 (OCR→단락→문법→어휘→주제→JSON)"))
    blocks.append(bullet("생성: 10개 유형 + 자기수정 루프(생성→7항목 검증→피드백 재생성, 최대 2라운드)"))
    blocks.append(bullet("RAG: 유형별 템플릿 선택적 로딩 + few-shot 예시 주입"))
    blocks.append(bullet("검증: 7항목(정답/오답/지문/지시문/난이도/형식/해설) + PASS/WARN/FAIL 3단계"))
    blocks.append(bullet("DNA 분석: 학교별 기출 시험지 최대 20장 분석, 맞춤형 문제 생성"))
    blocks.append(bullet("AI 채팅: 지문/문제 컨텍스트 SSE 스트리밍"))

    blocks.append(h2("결제 시스템 전환"))
    blocks.append(bullet("Stripe → 토스페이먼츠 전환"))
    blocks.append(bullet("Free(무료, 월10회) / Pro(₩29,900/월, 무제한)"))
    blocks.append(bullet("정기결제(빌링키) + 일회결제 + 웹훅 실시간 동기화"))

    blocks.append(h2("배포 환경 전환"))
    blocks.append(bullet("GitHub Pages → Vercel 전환"))
    blocks.append(bullet("Next.js 15.5.14 (CVE-2025-66478 패치)"))

    blocks.append(h2("UI/UX 대규모 개선"))
    blocks.append(bullet("다크모드 가독성 전면 개선 (10개 파일, 101라인 수정)"))
    blocks.append(bullet("파티클 메시 애니메이션 배경 (Canvas, 마우스 인터랙션)"))
    blocks.append(bullet("별빛 효과 강화 (글로우 + 트윙클 + 120개 입자)"))
    blocks.append(bullet("애니메이션 그라디언트 텍스트, 노이즈 오버레이, 회전 보더"))
    blocks.append(bullet("GPT 스타일 설정 모달 (계정/결제/사용량/테마 4탭)"))
    blocks.append(bullet("숫자 카운트업, 소셜 프루프, Pro 배지 글로우"))

    blocks.append(h2("인증 강화"))
    blocks.append(bullet("이메일 + Google OAuth"))
    blocks.append(bullet("비밀번호 강도 실시간 표시 (5단계)"))
    blocks.append(bullet("OAuth 가입 시 자동 Free 구독 (DB 트리거)"))
    blocks.append(divider())

    # 보안 점검
    blocks.append(h1("🔒 보안 점검 내역"))
    blocks.append(h2("인증 & 권한"))
    blocks.append(bullet("Supabase JWT 검증 (requireAuth)"))
    blocks.append(bullet("Row Level Security 전 테이블"))
    blocks.append(bullet("middleware.ts: /dashboard, /api/* 보호"))

    blocks.append(h2("API 보안"))
    blocks.append(bullet("Rate Limiting: 60req/min per IP+user"))
    blocks.append(bullet("Usage Limit: generate 월간 제한"))
    blocks.append(bullet("입력 검증: fileUrl(2048자), base64(10MB), fullText(50K자), messages(100개)"))
    blocks.append(bullet("에러 메시지 위생처리 (7개 라우트)"))
    blocks.append(bullet("SSRF 차단: private IP, localhost, metadata endpoint"))

    blocks.append(h2("키 & 시크릿"))
    blocks.append(bullet("하드코딩 키 제거 + 환경변수 필수화"))
    blocks.append(bullet(".claude/ .gitignore + Stripe Origin 취약점 수정"))

    blocks.append(h2("HTTP 보안 헤더"))
    blocks.append(bullet("X-Content-Type-Options, X-Frame-Options, X-XSS-Protection"))
    blocks.append(bullet("HSTS, CSP, Referrer-Policy, Permissions-Policy"))

    blocks.append(h2("CVE 패치"))
    blocks.append(bullet("Next.js 15.3.4 → 15.5.14 (CVE-2025-66478)"))
    blocks.append(divider())

    # API 엔드포인트
    blocks.append(h1("🌐 API 엔드포인트 (12개)"))
    blocks.append(table(4, [
        table_row(["엔드포인트", "메서드", "설명", "인증"]),
        table_row(["/api/structurize", "POST", "지문 구조화", "필수"]),
        table_row(["/api/generate", "POST", "문제 일괄 생성", "필수"]),
        table_row(["/api/generate-stream", "POST", "SSE 스트리밍 생성", "필수"]),
        table_row(["/api/validate", "POST", "문제 검증", "필수"]),
        table_row(["/api/export", "POST", "DOCX/HWPX 내보내기", "필수"]),
        table_row(["/api/chat", "POST", "AI 채팅 (SSE)", "필수"]),
        table_row(["/api/analyze-dna", "POST", "기출 DNA 분석", "필수"]),
        table_row(["/api/payments/confirm", "POST", "토스 결제 확인", "필수"]),
        table_row(["/api/payments/billing", "POST", "정기결제 빌링키", "필수"]),
        table_row(["/api/payments/webhook", "POST", "토스 웹훅", "불필요"]),
        table_row(["/api/payments/cancel", "POST", "구독 취소", "필수"]),
    ]))
    blocks.append(divider())

    # 페이지 구조
    blocks.append(h1("📄 프론트엔드 페이지 (9개)"))
    blocks.append(table(3, [
        table_row(["경로", "설명", "주요 기능"]),
        table_row(["/", "랜딩 페이지", "히어로, 기능소개, 가격, CTA, 파티클"]),
        table_row(["/login", "로그인/회원가입", "이메일+Google OAuth"]),
        table_row(["/dashboard", "메인 대시보드", "3패널: 사이드바+메인+AI채팅"]),
        table_row(["/payments/success", "결제 성공", "확인 후 대시보드 리다이렉트"]),
        table_row(["/payments/fail", "결제 실패", "에러 표시 + 재시도"]),
        table_row(["/terms", "이용약관", "서비스 이용 약관"]),
        table_row(["/privacy", "개인정보처리방침", "개인정보 수집/처리"]),
        table_row(["/not-found", "404", "커스텀 404"]),
        table_row(["/error", "에러", "글로벌 에러 바운더리"]),
    ]))
    blocks.append(divider())

    # 서비스 모듈
    blocks.append(h1("⚙️ 핵심 서비스 모듈"))
    blocks.append(table(3, [
        table_row(["모듈", "파일", "역할"]),
        table_row(["Claude API", "anthropic.ts (215줄)", "callClaude + callClaudeWithVision"]),
        table_row(["구조화", "structurizer.ts (532줄)", "이미지→JSON, SSRF 방어, 멀티페이지"]),
        table_row(["생성기", "generator.ts (468줄)", "RAG+생성+검증+자기수정"]),
        table_row(["검증기", "validator.ts (272줄)", "7항목 검증, 품질 점수"]),
        table_row(["DNA 분석", "dna-analyzer.ts (256줄)", "학교별 기출 패턴"]),
        table_row(["프롬프트", "prompt-builder.ts (455줄)", "프롬프트 동적 조립"]),
        table_row(["RAG", "rag.ts (197줄)", "템플릿+few-shot 로딩"]),
        table_row(["DOCX", "exporter.ts (948줄)", "커버+문제+정답 포맷팅"]),
        table_row(["HWPX", "hwpx-exporter.ts (628줄)", "한글 XML+ZIP"]),
        table_row(["구독", "subscription.ts (175줄)", "플랜/한도/결제"]),
        table_row(["사용량", "usage-tracker.ts (187줄)", "월간 쿼터"]),
        table_row(["결제", "toss.ts (166줄)", "토스 API 래퍼"]),
    ]))
    blocks.append(divider())

    # DB 스키마
    blocks.append(h1("🗄️ 데이터베이스 스키마"))
    blocks.append(table(3, [
        table_row(["테이블", "용도", "RLS"]),
        table_row(["passages", "구조화된 지문", "✅"]),
        table_row(["question_sets", "문제 세트", "✅"]),
        table_row(["questions", "개별 문제", "✅"]),
        table_row(["exports", "내보내기 이력", "✅"]),
        table_row(["usage_logs", "API 사용량", "✅"]),
        table_row(["subscriptions", "구독/결제", "✅"]),
    ]))
    blocks.append(bullet("마이그레이션: 001_initial_schema.sql + 002_subscriptions.sql + 003_oauth_user_init.sql"))
    blocks.append(divider())

    # 파이프라인
    blocks.append(h1("🔬 AI 파이프라인 흐름"))
    blocks.append(code_block(
        "[사용자 업로드: 모의고사/추가지문 (PDF, JPG)]\n"
        "    ↓\n"
        "[1] VLM(Claude) → 지문 JSON 구조화 (structurizer.ts)\n"
        "    ↓\n"
        "[2] RAG 템플릿 로딩 + 프롬프트 조립 (rag.ts + prompt-builder.ts)\n"
        "    ↓\n"
        "[3] 문제 생성 + 자기수정 루프 (generator.ts + validator.ts)\n"
        "    - 생성 → 7항목 검증 → 실패 시 피드백 재생성 (최대 2회)\n"
        "    ↓\n"
        "[4] .docx / .hwpx 출력 (exporter.ts / hwpx-exporter.ts)"
    ))
    blocks.append(divider())

    # 프로젝트 구조
    blocks.append(h1("📁 프로젝트 파일 구조"))
    blocks.append(code_block(
        "engenp/\n"
        "├── app/                          # Next.js App Router\n"
        "│   ├── layout.tsx, page.tsx      # 레이아웃 + 랜딩\n"
        "│   ├── login/, dashboard/        # 로그인, 대시보드\n"
        "│   ├── payments/                 # 결제 결과 페이지\n"
        "│   ├── terms/, privacy/          # 법적 페이지\n"
        "│   └── api/                      # 12개 API 라우트\n"
        "├── components/                   # UI 컴포넌트 (10개)\n"
        "├── lib/services/                 # 12개 서비스 모듈\n"
        "├── lib/ (api-client, supabase, toss, env)\n"
        "├── hooks/                        # 5개 커스텀 훅\n"
        "├── data/prompts/                 # 4개 프롬프트 템플릿\n"
        "├── data/question_types/          # 10개 유형 JSON\n"
        "├── dataset/                      # 모델 데이터셋 + 지침서\n"
        "├── supabase/migrations/          # DB 스키마 3개\n"
        "├── middleware.ts                 # 인증 미들웨어\n"
        "├── next.config.mjs              # 보안 헤더\n"
        "├── PROJECT_PLAN.md              # 기획서\n"
        "└── CHANGELOG-v3.md              # 변경 로그"
    ))
    blocks.append(divider())

    # Git 히스토리
    blocks.append(h1("📜 Git 커밋 히스토리"))
    commits = [
        "b750580 chore: GitHub Pages 워크플로우 삭제 (Vercel 전환)",
        "4d5df5b fix: 대시보드 인증 체크 수정 — 세션 복구 대기",
        "c39c8b5 style: 파티클 별빛 효과 강화 — 글로우+트윙클+120입자",
        "e23e33b fix: 로그인 수정 — session 체크 강화",
        "10ba34d docs: 결제 시스템 설정 가이드",
        "f3d1daf fix: 결제 페이지 Suspense 래핑",
        "3617d39 feat: Stripe → 토스페이먼츠 전환",
        "9ff0a17 fix: 랜딩 다크 배경 인라인 스타일",
        "a2cd43e fix: 로그인 후 대시보드 이동 안정화",
        "0d4fa7c style: 랜딩 다크 보라색 프리미엄 테마",
        "268b626 feat: Google OAuth 연동 완료",
        "9831f5a style: 랜딩 프리미엄 리디자인",
        "72ed17c fix: 카카오톡 OG 메타태그",
        "c34de49 feat: 보안 최종 강화 + UI 프리미엄 + v3 변경 로그",
        "ce38b80 security: 하드코딩 키 제거 + 에러 메시지 위생처리",
        "875f3f6 feat: 404/에러페이지 + 보안 9항목",
        "54c71cf feat: RAG 데이터 강화 — 실제 모델 데이터셋",
        "05bcf8f feat: Abyss→Haean 브랜드 변경 + 라이트모드",
        "a3007be fix: Next.js 15.5.14 CVE 패치",
        "66dcc70 fix: Next.js 15.3.4 CVE-2025-66478",
        "946640e chore: GitHub Pages → Vercel 전환",
        "8cc8b84 feat: 설정 모달 (계정/결제/사용량/테마)",
        "1b327cf fix: 다크 모드 텍스트 가독성 개선",
        "eeeef7b feat: 전체 기능 구현 완료 (12 API + 5 페이지)",
        "b382954 feat: Stripe 결제 + 프로젝트 이력 DB",
        "c40e7ff feat: DNA 분석 + OAuth/결제/사용량/hwpx",
        "2aa1d69 feat: 미완성 기능 일괄 구현",
        "7f1f448 feat: 프론트↔API 완전 연동",
        "c2a0ef5 feat: 캔버스 파티클 메쉬 배경",
        "4768f68 feat: 프론트↔API + AI 채팅 + SSE + RAG",
        "56d13a9 feat: 기출 DNA 분석 프롬프트",
        "0138080 feat: Core 서비스 모듈 완성",
        "ae4cc00 feat: 핵심 백엔드 + 라이트모드 대규모 구현",
    ]
    for c in commits:
        blocks.append(bullet(c))
    blocks.append(divider())

    # 환경 변수
    blocks.append(h1("🔑 환경 변수"))
    blocks.append(code_block(
        "# 필수\n"
        "NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co\n"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...\n\n"
        "# 선택\n"
        "ANTHROPIC_API_KEY=sk-ant-...\n"
        "SUPABASE_SERVICE_ROLE_KEY=eyJ...\n"
        "TOSS_PAYMENTS_SECRET_KEY=test_sk_...\n"
        "NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY=test_ck_...\n"
        "NEXT_PUBLIC_APP_URL=https://haean.vercel.app"
    ))
    blocks.append(divider())

    # 제한사항
    blocks.append(h1("⚠️ 알려진 제한사항"))
    blocks.append(bullet("Rate limiter: 인메모리 (서버 재시작 시 초기화)"))
    blocks.append(bullet("검증 7항목 전부 AI 기반 (정적 검증 미구현)"))
    blocks.append(bullet("검증 순차 실행 (병렬화 미구현)"))
    blocks.append(bullet("최종 수정 라운드 후 재검증 미구현"))
    blocks.append(bullet("토큰 버짓 명시적 관리 미구현"))
    blocks.append(divider())

    # TODO
    blocks.append(h1("📌 TODO"))
    blocks.append(h2("즉시 필요"))
    blocks.append(todo("사업자등록번호 발급 → 토스 실계정"))
    blocks.append(todo("토스 API 키 발급 → Vercel 환경변수"))
    blocks.append(todo("Supabase 프로덕션 설정"))
    blocks.append(todo("커스텀 도메인 (Vercel)"))
    blocks.append(h2("기능 보완"))
    blocks.append(todo(".hwpx 출력 테스트"))
    blocks.append(todo("검증 병렬화"))
    blocks.append(todo("Rate limiter Redis 전환"))
    blocks.append(todo("TypeScript 빌드 에러 해결"))
    blocks.append(h2("런칭"))
    blocks.append(todo("베타 테스트 (강사 5~10명)"))
    blocks.append(todo("피드백 수집 + 프롬프트 튜닝"))
    blocks.append(todo("가격 정책 최종 결정"))
    blocks.append(divider())

    # .md 파일
    blocks.append(h1("📚 프로젝트 .md 파일"))
    blocks.append(table(3, [
        table_row(["파일", "위치", "내용"]),
        table_row(["PROJECT_PLAN.md", "루트", "프로젝트 기획서 + 기술스택 + 코딩 지침"]),
        table_row(["CHANGELOG-v3.md", "루트", "v2→v3 변경사항 총정리"]),
        table_row(["README.md", "루트", "프로젝트 소개 + 시작 가이드"]),
        table_row(["payment-setup-guide.md", "docs/", "결제 플랫폼 비교 + 설정 가이드"]),
        table_row(["전처리_지침서_1.md", "dataset/", "VLM 전처리 가이드 (264줄)"]),
        table_row(["제작_지침서.md", "dataset/", "변형문제+동형모의고사 가이드 (819줄)"]),
    ]))
    blocks.append(divider())

    # 의존성
    blocks.append(h1("📦 주요 의존성"))
    blocks.append(table(3, [
        table_row(["패키지", "버전", "용도"]),
        table_row(["next", "15.5.14", "프레임워크"]),
        table_row(["react", "19.2.4", "UI"]),
        table_row(["@anthropic-ai/sdk", "0.80.0", "Claude API"]),
        table_row(["@supabase/supabase-js", "2.100.1", "DB+Auth"]),
        table_row(["docx", "9.6.1", "DOCX 생성"]),
        table_row(["jszip", "3.10.1", "HWPX ZIP"]),
        table_row(["tailwindcss", "4.2.2", "CSS"]),
        table_row(["zod", "3.24.1", "검증"]),
    ]))
    blocks.append(divider())

    blocks.append(callout("이 문서는 Claude Code에 의해 자동 생성되었습니다.\n프로젝트 전체 파일, git 히스토리, 소스코드를 분석하여 작성.\n2026-03-29", "🤖"))

    return blocks


# ============================================================
# 하위 페이지 콘텐츠
# ============================================================

def build_vlm_blocks():
    """VLM 지문 구조화 프롬프트 설계"""
    blocks = []
    blocks.append(callout("구현 완료 ✅ | lib/services/structurizer.ts (532줄) + data/prompts/structurize_passage.txt", "✅"))
    blocks.append(divider())

    blocks.append(h2("개요"))
    blocks.append(para("Claude Vision API(claude-sonnet-4-6-20250514)를 사용하여 시험지 이미지(JPG/PNG/GIF/WebP)에서 지문을 추출하고 구조화된 JSON으로 변환하는 엔진."))
    blocks.append(divider())

    blocks.append(h2("구조화 6단계 파이프라인"))
    blocks.append(numbered("텍스트 추출 — OCR 기반 이미지 내 텍스트 인식"))
    blocks.append(numbered("단락 분리 — 논리적 단위로 텍스트 구분"))
    blocks.append(numbered("문법 포인트 추출 — 핵심 문법 요소 태깅"))
    blocks.append(numbered("어휘 분석 — 주요 어휘 + 한국어 뜻 매핑"))
    blocks.append(numbered("주제/난이도 추정 — 지문 레벨 판정"))
    blocks.append(numbered("JSON 출력 — StructuredPassage 형식 최종 변환"))
    blocks.append(divider())

    blocks.append(h2("입력 방식"))
    blocks.append(bullet("structurizeFromUrl() — 공개 HTTPS URL (SSRF 방어 적용)"))
    blocks.append(bullet("structurizeFromBase64() — base64 인코딩 이미지 (10MB 제한)"))
    blocks.append(bullet("structurizeMultiPage() — 여러 페이지 병합 처리 (단락 재인덱싱, 어휘 중복제거)"))
    blocks.append(divider())

    blocks.append(h2("출력 JSON 스키마 (StructuredPassage)"))
    blocks.append(code_block(
        '{\n'
        '  "title": "The Power of Habit",\n'
        '  "source": "추가지문",\n'
        '  "fullText": "Habits are the invisible...",\n'
        '  "paragraphs": [\n'
        '    {\n'
        '      "index": 0,\n'
        '      "text": "Habits are the invisible architecture...",\n'
        '      "sentences": [\n'
        '        {\n'
        '          "index": 0,\n'
        '          "text": "Habits are the invisible architecture of daily life.",\n'
        '          "key_grammar": ["metaphor", "subject-verb agreement"],\n'
        '          "key_vocab": [{"word": "invisible", "meaning": "눈에 보이지 않는"}]\n'
        '        }\n'
        '      ]\n'
        '    }\n'
        '  ],\n'
        '  "vocabulary": [...],\n'
        '  "topic": "습관의 힘",\n'
        '  "difficulty": 3\n'
        '}',
        "json"
    ))
    blocks.append(divider())

    blocks.append(h2("보안"))
    blocks.append(bullet("SSRF 방어: validateUrl() — private IP (10.x, 172.16-31.x, 192.168.x), localhost, 169.254.x (metadata) 차단"))
    blocks.append(bullet("HTTPS만 허용"))
    blocks.append(bullet("지원 MIME: image/jpeg, image/png, image/gif, image/webp"))
    blocks.append(divider())

    blocks.append(h2("프롬프트 템플릿"))
    blocks.append(para("data/prompts/structurize_passage.txt — VLM 구조화 전용 시스템 프롬프트"))
    blocks.append(para("prompt-builder.ts의 buildStructurizeSystemPrompt()에서 로딩 및 캐싱"))
    blocks.append(divider())

    blocks.append(h2("관련 커밋"))
    blocks.append(bullet("ae4cc00 feat: 핵심 백엔드 + 라이트모드 대규모 구현"))
    blocks.append(bullet("0138080 feat: Core 서비스 모듈 완성"))
    blocks.append(bullet("7f1f448 feat: 프론트↔API 완전 연동"))

    return blocks


def build_upload_pipeline_blocks():
    """파일 업로드 → PDF/이미지 처리 → VLM 파이프라인 연동"""
    blocks = []
    blocks.append(callout("구현 완료 ✅ | app/api/structurize/, app/api/generate-stream/, components/left-sidebar.tsx", "✅"))
    blocks.append(divider())

    blocks.append(h2("업로드 → 구조화 → 생성 전체 파이프라인"))
    blocks.append(code_block(
        "[파일 업로드 (left-sidebar.tsx)]\n"
        "  - 드래그 앤 드롭 + 클릭 업로드\n"
        "  - PDF/JPG/PNG/GIF/WebP 허용\n"
        "  - 파일 미리보기 + 삭제\n"
        "    ↓\n"
        "[API 호출 (api-client.ts)]\n"
        "  - base64 인코딩 또는 URL 전달\n"
        "  - Auth 토큰 자동 첨부\n"
        "    ↓\n"
        "[/api/structurize OR /api/generate-stream]\n"
        "  - requireAuth() 인증\n"
        "  - checkRateLimit() 속도 제한\n"
        "  - 입력 검증 (크기, MIME 타입)\n"
        "    ↓\n"
        "[structurizer.ts]\n"
        "  - SSRF 검증 (URL 입력 시)\n"
        "  - Claude Vision API 호출\n"
        "  - JSON 파싱 + 검증\n"
        "    ↓\n"
        "[generator.ts (generate-stream 경우)]\n"
        "  - RAG 로딩 → 문제 생성 → 검증 → 자기수정\n"
        "    ↓\n"
        "[SSE 스트리밍 응답]\n"
        "  - structurizing → structurized → generating → completed"
    ))
    blocks.append(divider())

    blocks.append(h2("SSE 스트리밍 이벤트"))
    blocks.append(table(3, [
        table_row(["이벤트", "데이터", "설명"]),
        table_row(["structurizing", "-", "지문 분석 시작"]),
        table_row(["structurized", "StructuredPassage", "구조화 완료"]),
        table_row(["generating", "-", "문제 생성 중"]),
        table_row(["completed", "passage + questions[]", "전체 파이프라인 완료"]),
        table_row(["error", "message", "에러 발생"]),
    ]))
    blocks.append(divider())

    blocks.append(h2("프론트엔드 훅"))
    blocks.append(para("hooks/use-generation-stream.ts — SSE 스트리밍 상태 관리"))
    blocks.append(bullet("step: idle → structurizing → structurized → generating → completed"))
    blocks.append(bullet("passage, questions, error 상태 자동 업데이트"))
    blocks.append(bullet("Supabase auth 토큰 자동 주입"))
    blocks.append(divider())

    blocks.append(h2("입력 검증"))
    blocks.append(bullet("fileUrl: 최대 2048자, HTTPS만"))
    blocks.append(bullet("base64: 최대 10MB"))
    blocks.append(bullet("mediaType: 최대 100자, 허용 목록 체크"))
    blocks.append(divider())

    blocks.append(h2("관련 커밋"))
    blocks.append(bullet("7f1f448 feat: 프론트↔API 완전 연동 — 업로드→구조화→생성→다운로드"))
    blocks.append(bullet("4768f68 feat: 프론트↔API 연동 + SSE 스트리밍"))
    blocks.append(bullet("eeeef7b feat: 전체 기능 구현 완료 (12 API + 5 페이지)"))

    return blocks


def build_mvp_5types_blocks():
    """변형문제 5개 유형 생성 엔진 MVP → 현재 10개 유형 완성"""
    blocks = []
    blocks.append(callout("구현 완료 ✅ | 10개 유형 전부 구현 (MVP 5개 → 풀 10개 확장)\nlib/services/generator.ts (468줄) + validator.ts (272줄)", "✅"))
    blocks.append(divider())

    blocks.append(h2("지원 문제 유형 (10개)"))
    blocks.append(table(3, [
        table_row(["유형 ID", "한국어 명칭", "설명"]),
        table_row(["vocabulary_choice", "어휘 선택", "밑줄 친 부분 중 문맥상 부적절한 것"]),
        table_row(["grammar_choice", "어법 선택", "어법상 틀린 것 찾기"]),
        table_row(["blank_inference", "빈칸 추론", "빈칸에 들어갈 말 추론"]),
        table_row(["order_sentence", "순서 배열", "(A)(B)(C) 문단 순서 배열"]),
        table_row(["insert_sentence", "문장 삽입", "주어진 문장이 들어갈 위치"]),
        table_row(["summary_choice", "요약/요지", "글의 요지/요약문 완성"]),
        table_row(["title_choice", "제목 선택", "글의 제목으로 적절한 것"]),
        table_row(["irrelevant_sentence", "무관한 문장", "글의 흐름과 관계 없는 문장"]),
        table_row(["purpose_choice", "목적 파악", "글의 목적으로 적절한 것"]),
        table_row(["verb_transform", "동사 변환", "동사 형태 변환 (서술형)"]),
    ]))
    blocks.append(divider())

    blocks.append(h2("생성 파이프라인"))
    blocks.append(numbered("RAG 로딩 — 요청된 유형의 템플릿 + few-shot 예시만 선택적 로드"))
    blocks.append(numbered("프롬프트 조립 — 시스템 프롬프트 + 유저 메시지(지문, 유형, 예시) 조합"))
    blocks.append(numbered("Claude API 호출 — claude-sonnet-4-6, 8192 토큰"))
    blocks.append(numbered("JSON 파싱 — 응답에서 문제 배열 추출"))
    blocks.append(numbered("상세 검증 — 7항목 체크 (정답/오답/지문/지시문/난이도/형식/해설)"))
    blocks.append(numbered("자기수정 — FAIL 문제만 피드백 포함 재생성 (최대 2라운드)"))
    blocks.append(numbered("형평성 검증 — 모든 단락이 골고루 사용되었는지 확인"))
    blocks.append(divider())

    blocks.append(h2("자기수정 루프 (Self-Correction)"))
    blocks.append(code_block(
        "생성 결과 = Claude API 호출(프롬프트)\n"
        "    ↓\n"
        "검증 결과 = 7항목 상세 검증\n"
        "    ↓\n"
        "if FAIL 문제 존재 AND 라운드 < 2:\n"
        "    피드백 메시지 = 실패 항목 + 수정 지시\n"
        "    재생성 = Claude API 호출(원본 + 피드백)\n"
        "    PASS 문제는 보존, FAIL만 교체\n"
        "    ↓ (다시 검증)\n"
        "else:\n"
        "    최종 결과 반환"
    ))
    blocks.append(divider())

    blocks.append(h2("검증 7항목"))
    blocks.append(bullet("정답 정확성 — 제시된 정답이 실제로 맞는지"))
    blocks.append(bullet("오답 타당성 — 오답 선지가 합리적인 오답인지"))
    blocks.append(bullet("지문 충실도 — 원문 범위 안에서 출제되었는지"))
    blocks.append(bullet("지시문 적합성 — 유형에 맞는 지시문인지"))
    blocks.append(bullet("난이도 적절성 — 요청 난이도와 일치하는지"))
    blocks.append(bullet("형식 준수 — JSON 스키마 + 선지 개수 등"))
    blocks.append(bullet("해설 정확성 — 풀이/해설이 논리적인지"))
    blocks.append(divider())

    blocks.append(h2("RAG 데이터"))
    blocks.append(para("data/question_types/ 디렉토리에 10개 유형별 JSON 파일:"))
    blocks.append(bullet("각 파일에 rules, schema, difficulty_range, examples 포함"))
    blocks.append(bullet("실제 모델 데이터셋 기반 few-shot 예시"))
    blocks.append(bullet("인메모리 캐싱으로 반복 로딩 방지"))
    blocks.append(divider())

    blocks.append(h2("관련 커밋"))
    blocks.append(bullet("ae4cc00 feat: 핵심 백엔드 + 라이트모드 대규모 구현"))
    blocks.append(bullet("54c71cf feat: RAG 데이터 강화 — 실제 모델 데이터셋"))
    blocks.append(bullet("eeeef7b feat: 전체 기능 구현 완료"))
    blocks.append(bullet("c34de49 feat: 보안 최종 강화 + UI 프리미엄"))

    return blocks


def build_ai_copilot_blocks():
    """AI Co-pilot 채팅 실제 연동"""
    blocks = []
    blocks.append(callout("구현 완료 ✅ | app/api/chat/route.ts + components/ai-chat-sidebar.tsx + hooks/use-chat.ts", "✅"))
    blocks.append(divider())

    blocks.append(h2("개요"))
    blocks.append(para("지문과 생성된 문제를 컨텍스트로 활용하는 실시간 AI 튜터 채팅. SSE 스트리밍으로 응답을 실시간 표시."))
    blocks.append(divider())

    blocks.append(h2("시스템 프롬프트"))
    blocks.append(para("역할: 'Haean AI' — 한국 영어 내신 변형 문제 전문 AI 튜터"))
    blocks.append(bullet("지문 분석 및 해석 지원"))
    blocks.append(bullet("문제 수정/보강 요청"))
    blocks.append(bullet("문법/어휘 설명"))
    blocks.append(bullet("난이도 조절 안내"))
    blocks.append(bullet("해설 보강"))
    blocks.append(divider())

    blocks.append(h2("컨텍스트 주입"))
    blocks.append(para("대시보드에서 현재 작업 중인 지문과 문제가 자동으로 채팅 컨텍스트에 포함:"))
    blocks.append(bullet("passage — 현재 구조화된 지문 (fullText, paragraphs)"))
    blocks.append(bullet("questions — 현재 생성된 문제 배열"))
    blocks.append(para("→ 시스템 프롬프트에 현재 지문 + 문제 내용이 임베딩되어 맥락 기반 대화 가능"))
    blocks.append(divider())

    blocks.append(h2("SSE 스트리밍"))
    blocks.append(bullet("모델: claude-sonnet-4-6-20250514, max_tokens: 2048"))
    blocks.append(bullet("text_delta 이벤트로 실시간 텍스트 스트리밍"))
    blocks.append(bullet("[DONE] 마커로 스트림 종료 감지"))
    blocks.append(bullet("프론트엔드에서 placeholder 메시지에 실시간 텍스트 누적"))
    blocks.append(divider())

    blocks.append(h2("UI 구현"))
    blocks.append(para("components/ai-chat-sidebar.tsx (9.6KB)"))
    blocks.append(bullet("메시지 목록 (사용자/AI 구분 표시)"))
    blocks.append(bullet("입력 필드 + 전송 버튼"))
    blocks.append(bullet("로딩 인디케이터"))
    blocks.append(bullet("환영 메시지: '안녕하세요! Haean AI입니다...'"))
    blocks.append(divider())

    blocks.append(h2("입력 검증"))
    blocks.append(bullet("최대 100개 메시지"))
    blocks.append(bullet("메시지 content 최대 50,000자"))
    blocks.append(bullet("role: 'user' | 'assistant'만 허용"))
    blocks.append(divider())

    blocks.append(h2("관련 커밋"))
    blocks.append(bullet("4768f68 feat: 프론트↔API 연동 + AI 채팅 + SSE 스트리밍"))
    blocks.append(bullet("eeeef7b feat: 전체 기능 구현 완료"))

    return blocks


def build_docx_export_blocks():
    """.docx 출력 모듈"""
    blocks = []
    blocks.append(callout("구현 완료 ✅ | lib/services/exporter.ts (948줄) + hwpx-exporter.ts (628줄) + docx-styles.ts (162줄)", "✅"))
    blocks.append(divider())

    blocks.append(h2("지원 형식"))
    blocks.append(bullet(".docx — docx npm 패키지 (Word 호환)"))
    blocks.append(bullet(".hwpx — JSZip 기반 XML+ZIP (한글 워드프로세서)"))
    blocks.append(bullet(".json — 아카이브/디버깅용"))
    blocks.append(divider())

    blocks.append(h2("DOCX 문서 구조"))
    blocks.append(numbered("커버 페이지 — 학교명, 날짜, 학생 정보 입력란"))
    blocks.append(numbered("문제 섹션 — 유형별 렌더링 (아래 참조)"))
    blocks.append(numbered("정답 해설 섹션 — 번호별 정답 + 해설 (선택적)"))
    blocks.append(numbered("머리말/바닥글 — 페이지 번호"))
    blocks.append(divider())

    blocks.append(h2("유형별 렌더링"))
    blocks.append(bullet("어휘/어법: 인라인 원문자(①②③) + 밑줄 처리된 대상 어휘"))
    blocks.append(bullet("빈칸 추론: 지문 + 5지선다"))
    blocks.append(bullet("순서 배열: 도입문 + (A)(B)(C) 블록 + 순서 선지"))
    blocks.append(bullet("문장 삽입: 박스형 삽입 문장 + 지문 내 ①②③④⑤ 마커 + 컴팩트 선지"))
    blocks.append(bullet("일반: 지문 + 선지"))
    blocks.append(divider())

    blocks.append(h2("스타일 시스템 (docx-styles.ts)"))
    blocks.append(bullet("폰트: 맑은 고딕(한국어), Times New Roman(영어)"))
    blocks.append(bullet("사이즈: 10pt(SMALL) ~ 18pt(LARGE_TITLE)"))
    blocks.append(bullet("줄간격: 1.15x, 1.5x, 단일"))
    blocks.append(bullet("마진: A4 기준 인치→트윕 변환"))
    blocks.append(divider())

    blocks.append(h2("HWPX 구조"))
    blocks.append(para("XML 기반 ZIP 파일:"))
    blocks.append(bullet("mimetype (비압축)"))
    blocks.append(bullet("META-INF/container.xml"))
    blocks.append(bullet("Contents/content.hpf (매니페스트)"))
    blocks.append(bullet("Contents/header.xml (스타일)"))
    blocks.append(bullet("Contents/section0.xml (본문)"))
    blocks.append(divider())

    blocks.append(h2("API 엔드포인트"))
    blocks.append(para("POST /api/export"))
    blocks.append(bullet("입력: questions[], passage, format('docx'|'hwpx')"))
    blocks.append(bullet("출력: ArrayBuffer (바이너리)"))
    blocks.append(bullet("MIME: application/vnd.openxmlformats-officedocument... | application/hwp+zip"))
    blocks.append(bullet("사용량 추적: trackUsage(user.id, 'export', 0)"))
    blocks.append(divider())

    blocks.append(h2("관련 커밋"))
    blocks.append(bullet("da9b122 feat: 라이트모드 마무리 + exporter 업데이트"))
    blocks.append(bullet("2aa1d69 feat: 미완성 기능 일괄 구현 — hwpx 포함"))
    blocks.append(bullet("eeeef7b feat: 전체 기능 구현 완료"))

    return blocks


def build_vercel_deploy_blocks():
    """Vercel 배포 전환 + 커스텀 도메인"""
    blocks = []
    blocks.append(callout("구현 완료 ✅ | GitHub Pages → Vercel 완전 전환", "✅"))
    blocks.append(divider())

    blocks.append(h2("전환 이유"))
    blocks.append(bullet("GitHub Pages: 정적 사이트만 지원 → Next.js API Routes 불가"))
    blocks.append(bullet("Vercel: Next.js 공식 호스팅, SSR + API Routes + Edge 지원"))
    blocks.append(bullet("자동 HTTPS + 자동 배포 (git push → 배포)"))
    blocks.append(divider())

    blocks.append(h2("전환 작업 내역"))
    blocks.append(todo("GitHub Pages 워크플로우 삭제 (.github/workflows/)", True))
    blocks.append(todo("Vercel 프로젝트 연결", True))
    blocks.append(todo("환경 변수 Vercel에 설정", True))
    blocks.append(todo("next.config.mjs에서 basePath/output 설정 제거", True))
    blocks.append(todo("빌드 확인 (12 API + 9 페이지)", True))
    blocks.append(todo("커스텀 도메인 연결", False))
    blocks.append(divider())

    blocks.append(h2("보안 설정"))
    blocks.append(para("next.config.mjs에서 보안 헤더 7개 설정:"))
    blocks.append(bullet("X-Content-Type-Options: nosniff"))
    blocks.append(bullet("X-Frame-Options: DENY"))
    blocks.append(bullet("X-XSS-Protection: 1; mode=block"))
    blocks.append(bullet("Referrer-Policy: strict-origin-when-cross-origin"))
    blocks.append(bullet("Permissions-Policy: camera=(), microphone=(), geolocation=()"))
    blocks.append(bullet("HSTS: max-age=63072000; includeSubDomains; preload"))
    blocks.append(bullet("CSP: script/style/img/connect/frame-src 화이트리스트"))
    blocks.append(divider())

    blocks.append(h2("CVE 패치"))
    blocks.append(bullet("Next.js 15.3.4 → 15.5.14 (CVE-2025-66478 보안 패치)"))
    blocks.append(bullet("Vercel 보안 검사 통과 확인"))
    blocks.append(divider())

    blocks.append(h2("현재 상태"))
    blocks.append(para("배포 URL: https://haean.vercel.app"))
    blocks.append(bullet("✅ 자동 배포 작동 중"))
    blocks.append(bullet("✅ HTTPS 적용"))
    blocks.append(bullet("⏳ 커스텀 도메인 미연결"))
    blocks.append(divider())

    blocks.append(h2("관련 커밋"))
    blocks.append(bullet("946640e chore: GitHub Pages → Vercel 배포 전환"))
    blocks.append(bullet("b750580 chore: GitHub Pages 워크플로우 삭제"))
    blocks.append(bullet("a3007be fix: Next.js 15.5.14 CVE 패치"))
    blocks.append(bullet("66dcc70 fix: Next.js 15.3.4 CVE-2025-66478"))

    return blocks


def build_subscription_blocks():
    """구독 결제 시스템 (Free/Pro)"""
    blocks = []
    blocks.append(callout("구현 완료 ✅ | Stripe → 토스페이먼츠 전환 완료\nlib/toss.ts + lib/services/subscription.ts + app/api/payments/*", "✅"))
    blocks.append(divider())

    blocks.append(h2("플랫폼 선정"))
    blocks.append(table(4, [
        table_row(["플랫폼", "수수료", "한국 지원", "비고"]),
        table_row(["토스페이먼츠 ✅", "3.3%", "네이티브", "카카오/네이버/토스페이 통합"]),
        table_row(["Stripe ❌", "3.4%+고정비", "미지원", "한국 법인 불가"]),
        table_row(["카카오페이", "3.3%", "가능", "카카오 생태계 한정"]),
    ]))
    blocks.append(divider())

    blocks.append(h2("요금제"))
    blocks.append(table(5, [
        table_row(["플랜", "가격", "문제 생성", "내보내기", "DNA 분석"]),
        table_row(["Free", "무료", "월 10회", "월 5회", "❌"]),
        table_row(["Pro", "₩29,900/월", "무제한", "무제한", "✅"]),
    ]))
    blocks.append(divider())

    blocks.append(h2("구현 파일"))
    blocks.append(table(3, [
        table_row(["파일", "역할", "비고"]),
        table_row(["lib/toss.ts", "토스 API 클라이언트", "결제확인, 빌링키, 청구, 취소"]),
        table_row(["lib/services/subscription.ts", "구독 관리", "플랜 조회, 한도 체크, 갱신"]),
        table_row(["lib/services/usage-tracker.ts", "사용량 추적", "월간 쿼터, 로깅"]),
        table_row(["api/payments/confirm/", "결제 확인", "토스 리다이렉트 후 승인"]),
        table_row(["api/payments/billing/", "정기결제", "빌링키 발급 + 자동결제"]),
        table_row(["api/payments/webhook/", "웹훅", "결제 상태 변경 수신"]),
        table_row(["api/payments/cancel/", "구독 취소", "Pro → Free (기간 종료까지 유지)"]),
        table_row(["payments/success/", "결제 성공 페이지", "확인 후 대시보드 리다이렉트"]),
        table_row(["payments/fail/", "결제 실패 페이지", "에러 안내 + 재시도"]),
        table_row(["components/upgrade-prompt.tsx", "업그레이드 모달", "Pro 안내 + 결제 버튼"]),
        table_row(["components/settings-modal.tsx", "설정 모달", "구독 상태 + 해지"]),
    ]))
    blocks.append(divider())

    blocks.append(h2("결제 플로우"))
    blocks.append(code_block(
        "[사용자] Pro 업그레이드 클릭\n"
        "    ↓\n"
        "[토스 결제창] 카드/카카오페이/네이버페이 선택\n"
        "    ↓\n"
        "[토스 리다이렉트] /payments/success?paymentKey=...&orderId=...&amount=29900\n"
        "    ↓\n"
        "[/api/payments/confirm] 토스 API로 결제 확인\n"
        "    ↓\n"
        "[Supabase] subscriptions 테이블 갱신 (plan: 'pro', status: 'active')\n"
        "    ↓\n"
        "[대시보드] Pro 배지 표시 + 무제한 사용"
    ))
    blocks.append(divider())

    blocks.append(h2("웹훅 이벤트 처리"))
    blocks.append(bullet("PAYMENT_STATUS_CHANGED → 상태 매핑:"))
    blocks.append(bullet("  DONE, IN_PROGRESS, PARTIAL_CANCELED, WAITING_FOR_DEPOSIT → 'active'"))
    blocks.append(bullet("  CANCELED, ABORTED, EXPIRED → 'canceled'"))
    blocks.append(divider())

    blocks.append(h2("연동 전 필요사항"))
    blocks.append(todo("사업자등록번호 발급"))
    blocks.append(todo("토스페이먼츠 실계정 가입"))
    blocks.append(todo("API 키 발급 → Vercel 환경변수 설정:"))
    blocks.append(bullet("  TOSS_PAYMENTS_SECRET_KEY"))
    blocks.append(bullet("  NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY"))
    blocks.append(divider())

    blocks.append(h2("관련 커밋"))
    blocks.append(bullet("3617d39 feat: Stripe → 토스페이먼츠 전환"))
    blocks.append(bullet("b382954 feat: Stripe 결제 + 프로젝트 이력 DB"))
    blocks.append(bullet("c40e7ff feat: DNA 분석 + OAuth/결제/사용량"))
    blocks.append(bullet("f3d1daf fix: 결제 페이지 Suspense 래핑"))

    return blocks


def main():
    print("=== Notion 작업 일지 업데이트 시작 ===\n")

    # 1. 새 v3 문서화 페이지 생성
    print("[1/8] v3 전체 문서화 페이지 생성...")
    new_page_id = create_page(
        PARENT_PAGE_ID,
        "Haean v3 — 전체 프로젝트 문서화 (2026-03-29)",
        "📋"
    )
    if new_page_id:
        blocks = build_v3_doc_blocks()
        print(f"  {len(blocks)}개 블록 추가 중...")
        append_blocks(new_page_id, blocks)

    time.sleep(0.5)

    # 2. VLM 지문 구조화
    print("\n[2/8] VLM 지문 구조화 페이지 업데이트...")
    pid = SUBPAGES["vlm"]
    clear_page(pid)
    append_blocks(pid, build_vlm_blocks())

    time.sleep(0.5)

    # 3. 파일 업로드 → VLM 파이프라인
    print("\n[3/8] 파일 업로드 → VLM 파이프라인 페이지 업데이트...")
    pid = SUBPAGES["upload_pipeline"]
    clear_page(pid)
    append_blocks(pid, build_upload_pipeline_blocks())

    time.sleep(0.5)

    # 4. 변형문제 5개 유형 MVP
    print("\n[4/8] 변형문제 생성 엔진 페이지 업데이트...")
    pid = SUBPAGES["mvp_5types"]
    clear_page(pid)
    append_blocks(pid, build_mvp_5types_blocks())

    time.sleep(0.5)

    # 5. AI Co-pilot 채팅
    print("\n[5/8] AI Co-pilot 채팅 페이지 업데이트...")
    pid = SUBPAGES["ai_copilot"]
    clear_page(pid)
    append_blocks(pid, build_ai_copilot_blocks())

    time.sleep(0.5)

    # 6. .docx 출력 모듈
    print("\n[6/8] .docx 출력 모듈 페이지 업데이트...")
    pid = SUBPAGES["docx_export"]
    clear_page(pid)
    append_blocks(pid, build_docx_export_blocks())

    time.sleep(0.5)

    # 7. Vercel 배포 전환
    print("\n[7/8] Vercel 배포 전환 페이지 업데이트...")
    pid = SUBPAGES["vercel_deploy"]
    clear_page(pid)
    append_blocks(pid, build_vercel_deploy_blocks())

    time.sleep(0.5)

    # 8. 구독 결제 시스템
    print("\n[8/8] 구독 결제 시스템 페이지 업데이트...")
    pid = SUBPAGES["subscription"]
    clear_page(pid)
    append_blocks(pid, build_subscription_blocks())

    print("\n=== 완료! ===")
    print(f"메인 페이지: https://www.notion.so/{PARENT_PAGE_ID.replace('-', '')}")
    if new_page_id:
        print(f"새 문서 페이지: https://www.notion.so/{new_page_id.replace('-', '')}")


if __name__ == "__main__":
    main()
