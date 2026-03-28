#!/usr/bin/env python3
"""
Notion 작업 일지 업데이트
1) CTO Deep-Dive 제목 수정
2) FastAPI 백엔드 페이지 내용 채우기
3) v0 프로토타입 분석 페이지 내용 채우기
4) 메인 작업 일지 페이지에 작업 내역 추가
"""
import json, time, requests

TOKEN = "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"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}
BASE = "https://api.notion.com/v1"

MAIN_PAGE = "330f2793d19281d890fdf5ebc44f10f1"
CTO_DEEP_DIVE = "331f2793d19281c281ffffdc356e932d"
FASTAPI_PAGE = "330f2793d19281448f9cfa729ceb9442"
V0_PROTOTYPE = "330f2793d1928175b1b7fbc96be79ec6"


def append_blocks(pid, blocks):
    for i in range(0, len(blocks), 100):
        batch = blocks[i:i+100]
        r = requests.patch(f"{BASE}/blocks/{pid}/children", headers=HEADERS, json={"children": batch})
        if r.status_code != 200:
            print(f"  ERR {i//100}: {r.status_code} - {r.text[:200]}")
        else:
            print(f"  Batch {i//100+1} OK ({len(batch)})")
        time.sleep(0.35)

def clear_page(pid):
    blocks = []
    cursor = None
    while True:
        url = f"{BASE}/blocks/{pid}/children?page_size=100"
        if cursor: url += f"&start_cursor={cursor}"
        r = requests.get(url, headers=HEADERS)
        data = r.json()
        blocks.extend(data.get("results",[]))
        if not data.get("has_more"): break
        cursor = data.get("next_cursor")
    c = 0
    for b in blocks:
        requests.delete(f"{BASE}/blocks/{b['id']}", headers=HEADERS)
        c += 1
        if c % 15 == 0: time.sleep(0.4)
    print(f"  Cleared {c} blocks")

def update_page_title(pid, title):
    r = requests.patch(f"{BASE}/pages/{pid}", headers=HEADERS, json={
        "properties": {"title": {"title": [{"type":"text","text":{"content": title}}]}}
    })
    print(f"  Title update: {r.status_code} → {title}")

# Block helpers
def h1(t): return {"type":"heading_1","heading_1":{"rich_text":rt(t)}}
def h2(t): return {"type":"heading_2","heading_2":{"rich_text":rt(t)}}
def h3(t): return {"type":"heading_3","heading_3":{"rich_text":rt(t)}}
def para(t): return {"type":"paragraph","paragraph":{"rich_text":rt(t)}}
def bullet(t): return {"type":"bulleted_list_item","bulleted_list_item":{"rich_text":rt(t)}}
def numbered(t): return {"type":"numbered_list_item","numbered_list_item":{"rich_text":rt(t)}}
def divider(): return {"type":"divider","divider":{}}
def callout(t, icon="💡"): return {"type":"callout","callout":{"rich_text":rt(t),"icon":{"type":"emoji","emoji":icon}}}
def code_block(t, lang="plain text"): return {"type":"code","code":{"rich_text":rt(t),"language":lang}}
def quote(t): return {"type":"quote","quote":{"rich_text":rt(t)}}
def todo(t, checked=False): return {"type":"to_do","to_do":{"rich_text":rt(t),"checked":checked}}

def bold_para(bold, normal=""):
    parts = [{"type":"text","text":{"content":bold},"annotations":{"bold":True}}]
    if normal: parts.append({"type":"text","text":{"content":normal}})
    return {"type":"paragraph","paragraph":{"rich_text":parts}}

def rt(text):
    if len(text)<=2000: return [{"type":"text","text":{"content":text}}]
    return [{"type":"text","text":{"content":text[i:i+2000]}} for i in range(0,len(text),2000)]

def table_row(cells):
    return {"type":"table_row","table_row":{"cells":[[{"type":"text","text":{"content":c}}] for c in cells]}}

def table(w, rows):
    return {"type":"table","table":{"table_width":w,"has_column_header":True,"has_row_header":False,"children":rows}}


# ============================================================
# FastAPI 백엔드 서버 구축
# ============================================================
def build_fastapi_blocks():
    b = []
    b.append(callout("작업 완료 ✅ | 2026-03-27 ~ 03-29\n작업자: Claude Code + yhgil99\nNext.js API Routes 기반으로 구현 (FastAPI 대신 Next.js Route Handlers 채택)", "✅"))
    b.append(divider())

    b.append(h2("아키텍처 변경: FastAPI → Next.js API Routes"))
    b.append(para("초기 기획(PROJECT_PLAN.md)에서는 FastAPI(Python) 백엔드를 별도로 두는 구조였으나, 개발 효율성과 배포 단순화를 위해 Next.js API Routes(Route Handlers)로 전환했다."))
    b.append(h3("전환 사유"))
    b.append(bullet("단일 레포, 단일 배포: 프론트+백엔드 Vercel 한 번에 배포"))
    b.append(bullet("TypeScript 통합: 프론트와 백엔드 타입 공유 (lib/types.ts)"))
    b.append(bullet("Supabase 통합: Auth + DB를 프론트/백 양쪽에서 동일 SDK로 접근"))
    b.append(bullet("Serverless 자동 스케일링: Vercel Edge/Serverless Functions"))
    b.append(bullet("Python 의존성(python-docx, PyMuPDF) → npm 대체: docx(npm), JSZip"))
    b.append(divider())

    b.append(h2("구현된 API 엔드포인트 (12개)"))
    b.append(table(5, [
        table_row(["엔드포인트", "메서드", "인증", "Rate Limit", "설명"]),
        table_row(["/api/structurize", "POST", "✅", "60/min", "이미지→지문 구조화"]),
        table_row(["/api/generate", "POST", "✅", "60/min", "구조화된 지문→문제 생성"]),
        table_row(["/api/generate-stream", "POST", "✅", "60/min", "구조화+생성 SSE 스트리밍"]),
        table_row(["/api/validate", "POST", "✅", "60/min", "문제 7항목 검증"]),
        table_row(["/api/export", "POST", "✅", "60/min", "DOCX/HWPX 내보내기"]),
        table_row(["/api/chat", "POST", "✅", "60/min", "AI 채팅 SSE"]),
        table_row(["/api/analyze-dna", "POST", "✅", "60/min", "기출 DNA 분석"]),
        table_row(["/api/payments/confirm", "POST", "✅", "-", "토스 결제 확인"]),
        table_row(["/api/payments/billing", "POST", "✅", "-", "정기결제 빌링키"]),
        table_row(["/api/payments/webhook", "POST", "❌", "-", "토스 웹훅 수신"]),
        table_row(["/api/payments/cancel", "POST", "✅", "-", "구독 취소"]),
        table_row(["/auth/callback", "GET", "❌", "-", "OAuth 콜백"]),
    ]))
    b.append(divider())

    b.append(h2("인증 미들웨어 (middleware.ts)"))
    b.append(para("Next.js Middleware에서 모든 /dashboard, /api/* 경로를 보호한다."))
    b.append(bullet("Bearer 토큰 (Authorization 헤더) 체크"))
    b.append(bullet("Supabase auth 쿠키 (sb-*-auth-token) 체크"))
    b.append(bullet("인증 실패: API → 401 JSON, 페이지 → /login 리다이렉트"))
    b.append(bullet("공개 경로: /, /login, /auth/callback, /api/payments/webhook"))
    b.append(divider())

    b.append(h2("공통 API 유틸 (app/api/_lib/)"))
    b.append(bullet("requireAuth() — Supabase JWT 검증, 사용자 정보 반환"))
    b.append(bullet("checkRateLimit(request, userId) — 인메모리 Rate Limiter (60req/min)"))
    b.append(bullet("checkUsageLimitMiddleware(userId, action) — 월간 사용량 제한 체크"))
    b.append(bullet("에러 메시지 위생처리 — 내부 에러 → 한국어 일반 메시지"))
    b.append(divider())

    b.append(h2("서비스 모듈 (lib/services/) — 12개"))
    b.append(table(3, [
        table_row(["모듈", "코드량", "역할"]),
        table_row(["anthropic.ts", "215줄", "Claude API 싱글톤 + 태스크별 모델/토큰 매핑"]),
        table_row(["structurizer.ts", "532줄", "VLM 구조화 + SSRF 방어 + 멀티페이지"]),
        table_row(["generator.ts", "468줄", "RAG + 생성 + 자기수정 루프"]),
        table_row(["validator.ts", "272줄", "7항목 검증 + 품질 점수"]),
        table_row(["dna-analyzer.ts", "256줄", "학교별 기출 DNA 프로필"]),
        table_row(["prompt-builder.ts", "455줄", "정적/동적 프롬프트 분리"]),
        table_row(["rag.ts", "197줄", "선택적 템플릿 로딩"]),
        table_row(["exporter.ts", "948줄", "DOCX 문서 생성"]),
        table_row(["hwpx-exporter.ts", "628줄", "HWPX 한글 문서 생성"]),
        table_row(["subscription.ts", "175줄", "구독 플랜 관리"]),
        table_row(["usage-tracker.ts", "187줄", "월간 사용량 추적"]),
        table_row(["docx-styles.ts", "162줄", "문서 스타일 상수"]),
    ]))
    b.append(divider())

    b.append(h2("데이터베이스 (Supabase PostgreSQL)"))
    b.append(bullet("6개 테이블: passages, question_sets, questions, exports, usage_logs, subscriptions"))
    b.append(bullet("전 테이블 Row Level Security (RLS) 적용"))
    b.append(bullet("마이그레이션 3개: 001_initial_schema + 002_subscriptions + 003_oauth_user_init"))
    b.append(bullet("신규 유저 자동 Free 구독 생성 (DB 트리거)"))
    b.append(divider())

    b.append(h2("관련 커밋"))
    b.append(bullet("[ae4cc00] feat: 핵심 백엔드 + 라이트모드 대규모 구현"))
    b.append(bullet("[0138080] feat: Core 서비스 모듈 완성"))
    b.append(bullet("[4768f68] feat: 프론트↔API 연동 + AI 채팅 + SSE 스트리밍"))
    b.append(bullet("[eeeef7b] feat: 전체 기능 구현 완료 — 빌드 성공 (12 API + 5 페이지)"))
    b.append(bullet("[875f3f6] feat: 완결성 강화 — 보안 9항목"))
    b.append(bullet("[ce38b80] security: 하드코딩 키 제거 + 에러 메시지 위생처리"))
    return b


# ============================================================
# v0 프로토타입 분석
# ============================================================
def build_v0_blocks():
    b = []
    b.append(callout("2026-03-27 | 작업자: yhgil99 + Claude Code\nv0 프로토타입(라이트 테마) 분석 → v1/v2/v3 진화 과정 정리", "📋"))
    b.append(divider())

    b.append(h2("v0 (초기 프로토타입)"))
    b.append(para("프로젝트 초기 단계. Next.js + shadcn/ui로 기본 UI 스캐폴딩."))
    b.append(bullet("라이트 테마 기본"))
    b.append(bullet("3컬럼 레이아웃: 좌측 사이드바 + 메인 콘텐츠 + AI 채팅"))
    b.append(bullet("파일 업로드 UI (드래그 앤 드롭)"))
    b.append(bullet("옵션 설정 패널 (난이도, 유형 선택)"))
    b.append(bullet("AI 파이프라인 미연동 (UI만 존재)"))
    b.append(bullet("결제/인증 미구현"))
    b.append(para("아카이브 위치: web_sample_archive_v1_light/"))
    b.append(divider())

    b.append(h2("v0 → v1 변경사항"))
    b.append(h3("백엔드 연동"))
    b.append(bullet("Claude API 연동 (anthropic.ts) — Vision + Text"))
    b.append(bullet("VLM 구조화 엔진 (structurizer.ts) 구현"))
    b.append(bullet("문제 생성 엔진 (generator.ts) — 10개 유형"))
    b.append(bullet("검증 엔진 (validator.ts) — 7항목 체크"))
    b.append(bullet("RAG 시스템 (rag.ts) — 유형별 템플릿 로딩"))
    b.append(bullet("프롬프트 빌더 (prompt-builder.ts) — 정적/동적 분리"))
    b.append(bullet("DOCX/HWPX 내보내기 (exporter.ts, hwpx-exporter.ts)"))

    b.append(h3("프론트엔드"))
    b.append(bullet("SSE 스트리밍 연동 (use-generation-stream.ts)"))
    b.append(bullet("AI 채팅 실제 연동 (use-chat.ts)"))
    b.append(bullet("프로젝트 이력 관리 (project-history.tsx)"))
    b.append(bullet("사용량 표시 (usage-indicator.tsx)"))
    b.append(divider())

    b.append(h2("v1 → v2 변경사항"))
    b.append(h3("인증 & 결제"))
    b.append(bullet("Supabase Auth 연동 (이메일 + OAuth)"))
    b.append(bullet("Stripe 결제 시스템 구현"))
    b.append(bullet("Free/Pro 플랜 + 사용량 제한"))
    b.append(bullet("설정 모달 (4탭: 계정/결제/사용량/테마)"))

    b.append(h3("UI/UX"))
    b.append(bullet("다크 퍼플 + 인디고 컬러 시스템 적용"))
    b.append(bullet("Canvas 파티클 메시 애니메이션 배경"))
    b.append(bullet("다크모드 가독성 전면 개선"))
    b.append(divider())

    b.append(h2("v2 → v3 변경사항"))
    b.append(h3("브랜드"))
    b.append(bullet("Abyss → Haean 전면 리브랜딩"))
    b.append(bullet("OG 메타태그 + 카카오톡 공유 대응"))

    b.append(h3("결제"))
    b.append(bullet("Stripe → 토스페이먼츠 전환 (한국 사용자 최적화)"))
    b.append(bullet("정기결제(빌링키) + 웹훅 구현"))

    b.append(h3("보안"))
    b.append(bullet("하드코딩 키 제거 + 환경변수 필수화"))
    b.append(bullet("HTTP 보안 헤더 7종 적용"))
    b.append(bullet("SSRF 차단, 에러 메시지 위생처리"))
    b.append(bullet("Next.js CVE-2025-66478 패치 (15.5.14)"))

    b.append(h3("배포"))
    b.append(bullet("GitHub Pages → Vercel 전환"))
    b.append(bullet("Google OAuth 연동"))

    b.append(h3("UI"))
    b.append(bullet("파티클 별빛 효과 강화 (글로우+트윙클+120입자)"))
    b.append(bullet("프리미엄 이펙트 추가 (그라디언트 텍스트, 노이즈, 회전 보더 등)"))
    b.append(bullet("랜딩 페이지 프리미엄 리디자인"))
    b.append(divider())

    b.append(h2("버전별 주요 커밋"))
    b.append(h3("v0 → v1"))
    b.append(bullet("[ae4cc00] feat: 핵심 백엔드 + 라이트모드 대규모 구현"))
    b.append(bullet("[0138080] feat: Core 서비스 모듈 완성"))
    b.append(bullet("[7f1f448] feat: 프론트↔API 완전 연동"))
    b.append(bullet("[4768f68] feat: AI 채팅 + SSE 스트리밍 + RAG"))

    b.append(h3("v1 → v2"))
    b.append(bullet("[b382954] feat: Stripe 결제 + 프로젝트 이력 DB"))
    b.append(bullet("[8cc8b84] feat: 설정 모달 (계정/결제/사용량/테마)"))
    b.append(bullet("[eeeef7b] feat: 전체 기능 구현 완료 (12 API + 5 페이지)"))
    b.append(bullet("[c2a0ef5] feat: 캔버스 파티클 메시 배경"))

    b.append(h3("v2 → v3"))
    b.append(bullet("[05bcf8f] feat: Abyss→Haean 브랜드 변경"))
    b.append(bullet("[3617d39] feat: Stripe → 토스페이먼츠 전환"))
    b.append(bullet("[c34de49] feat: 보안 최종 강화 + UI 프리미엄"))
    b.append(bullet("[a3007be] fix: Next.js 15.5.14 CVE 패치"))
    b.append(bullet("[b750580] chore: GitHub Pages 삭제 (Vercel 전환)"))
    return b


# ============================================================
# 메인 작업 일지에 추가할 작업 내역
# ============================================================
def build_worklog_entries():
    b = []

    b.append(divider())
    b.append(h1("📅 작업 내역"))
    b.append(divider())

    # --- 03-27 ---
    b.append(h2("2026-03-27 (목)"))
    b.append(bold_para("작업자: ", "yhgil99 + Claude Code"))
    b.append(h3("프로젝트 세팅 + 핵심 백엔드 구현"))
    b.append(bullet("[ae4cc00] 핵심 백엔드 + 라이트모드 대규모 구현"))
    b.append(bullet("  — anthropic.ts, structurizer.ts, generator.ts, validator.ts, rag.ts, prompt-builder.ts"))
    b.append(bullet("  — 12개 서비스 모듈 초기 구현"))
    b.append(bullet("[3378b68] 추가 에이전트 산출물 — 프롬프트, 서비스 업데이트, verb_transform"))
    b.append(bullet("[0138080] Core 서비스 모듈 완성 + 라이트모드 컴포넌트 업데이트"))
    b.append(bullet("[da9b122] 라이트모드 마무리 + validate 프롬프트 + exporter 업데이트"))
    b.append(bullet("[56d13a9] 기출 DNA 분석 프롬프트 템플릿 추가"))
    b.append(bullet("[68ad07e] 서비스 모듈 import/export 수정 + @anthropic-ai/sdk 설치"))
    b.append(divider())

    # --- 03-28 ---
    b.append(h2("2026-03-28 (금)"))
    b.append(bold_para("작업자: ", "yhgil99 + Claude Code"))

    b.append(h3("프론트↔API 연동 + 기능 구현"))
    b.append(bullet("[4768f68] 프론트↔API 연동 + AI 채팅 + SSE 스트리밍 + RAG/프롬프트 빌더"))
    b.append(bullet("[c2a0ef5] 캔버스 기반 파티클 메쉬 애니메이션 배경"))
    b.append(bullet("[7f1f448] 프론트↔API 완전 연동 — 업로드→구조화→생성→다운로드 파이프라인 완성"))
    b.append(bullet("[2aa1d69] 미완성 기능 일괄 구현 — DNA분석, 결제, OAuth, 사용량, .hwpx"))
    b.append(bullet("[c40e7ff] DNA 분석 연동 + OAuth/결제/사용량/hwpx 마무리"))

    b.append(h3("결제 + 설정 + 전체 기능 완성"))
    b.append(bullet("[b382954] Stripe 결제 + 프로젝트 이력 DB 연동"))
    b.append(bullet("[8cc8b84] 설정 모달 추가 — 계정/결제/사용량/테마 (GPT 스타일 오버레이)"))
    b.append(bullet("[eeeef7b] 전체 기능 구현 완료 — 빌드 성공 (12 API + 5 페이지)"))

    b.append(h3("보안 강화"))
    b.append(bullet("[66dcc70] Next.js 15.3.4 업그레이드 — CVE-2025-66478 패치"))
    b.append(bullet("[a3007be] Next.js 15.5.14 — Vercel CVE 보안 검사 통과"))
    b.append(bullet("[875f3f6] 완결성 강화 — 404/에러페이지 + 보안 9항목"))
    b.append(bullet("[ce38b80] 하드코딩된 Supabase 키 제거 + API 에러 메시지 위생처리"))
    b.append(bullet("[c34de49] 보안 최종 강화 + UI 프리미엄 업그레이드 + v3 변경 로그 작성"))

    b.append(h3("브랜드 + UI"))
    b.append(bullet("[05bcf8f] Abyss→Haean 브랜드 변경 + 라이트모드 기본"))
    b.append(bullet("[9831f5a] 랜딩 페이지 프리미엄 리디자인 — 가독성 + 애니메이션"))
    b.append(bullet("[268b626] Google OAuth 연동 완료"))
    b.append(bullet("[0d4fa7c] 랜딩 페이지 다크 보라색 프리미엄 테마"))
    b.append(bullet("[1b327cf] 다크 모드 텍스트 가독성 개선 — 10개 파일, 101라인"))

    b.append(h3("배포"))
    b.append(bullet("[946640e] GitHub Pages → Vercel 배포 전환"))
    b.append(bullet("[54c71cf] RAG 데이터 강화 — 실제 모델 데이터셋 기반 예시 추가"))
    b.append(divider())

    # --- 03-29 ---
    b.append(h2("2026-03-29 (토)"))
    b.append(bold_para("작업자: ", "yhgil99 + Claude Code"))

    b.append(h3("결제 시스템 전환"))
    b.append(bullet("[3617d39] Stripe → 토스페이먼츠 전환"))
    b.append(bullet("  — lib/toss.ts: 결제확인, 빌링키, 청구, 취소 API"))
    b.append(bullet("  — 결제 성공/실패 페이지 + 웹훅 구현"))
    b.append(bullet("[f3d1daf] 결제 페이지 Suspense 래핑 — useSearchParams 빌드 에러 수정"))
    b.append(bullet("[10ba34d] 결제 시스템 설정 가이드 문서 작성"))

    b.append(h3("인증 안정화"))
    b.append(bullet("[e23e33b] 로그인 수정 — session 체크 강화 + Supabase fallback 키 추가"))
    b.append(bullet("[a2cd43e] 로그인 후 대시보드 이동 — router.push → window.location.href"))
    b.append(bullet("[4d5df5b] 대시보드 인증 체크 수정 — 세션 복구 대기 후 리다이렉트"))

    b.append(h3("UI 마무리"))
    b.append(bullet("[c39c8b5] 파티클 별빛 효과 강화 — 글로우 + 트윙클 + 120개 입자"))
    b.append(bullet("[9ff0a17] 랜딩 페이지 다크 배경 인라인 스타일 강제 적용"))
    b.append(bullet("[72ed17c] 카카오톡 OG 메타태그 절대 URL + metadataBase 설정"))

    b.append(h3("배포 정리"))
    b.append(bullet("[b750580] GitHub Pages 워크플로우 삭제 (Vercel로 완전 전환)"))

    b.append(h3("문서화"))
    b.append(bullet("Notion 작업 일지 전체 문서화 — 프로젝트 구조, 기술 스택, 보안 점검, API 목록 등"))
    b.append(bullet("하위 페이지 7개 내용 채워넣기 (VLM, 파이프라인, 생성엔진, 채팅, DOCX, Vercel, 결제)"))
    b.append(bullet("에이전트 루프 + 토큰 최적화 + RAG 아키텍처 기술 문서 작성"))
    b.append(divider())

    return b


def main():
    print("=== 작업 일지 업데이트 시작 ===\n")

    # 1. CTO Deep-Dive 제목 수정
    print("[1/4] CTO Deep-Dive 제목 수정...")
    update_page_title(CTO_DEEP_DIVE, "에이전트 루프 · 토큰 최적화 · RAG 아키텍처 기술 문서")
    time.sleep(0.3)

    # 2. FastAPI 백엔드 페이지 채우기
    print("\n[2/4] FastAPI 백엔드 서버 구축 페이지...")
    clear_page(FASTAPI_PAGE)
    time.sleep(0.3)
    append_blocks(FASTAPI_PAGE, build_fastapi_blocks())
    time.sleep(0.3)

    # 3. v0 프로토타입 분석 페이지 채우기
    print("\n[3/4] v0 프로토타입 분석 페이지...")
    clear_page(V0_PROTOTYPE)
    time.sleep(0.3)
    append_blocks(V0_PROTOTYPE, build_v0_blocks())
    time.sleep(0.3)

    # 4. 메인 작업 일지에 작업 내역 추가
    print("\n[4/4] 메인 작업 일지에 작업 내역 추가...")
    append_blocks(MAIN_PAGE, build_worklog_entries())

    print("\n=== 완료! ===")


if __name__ == "__main__":
    main()
