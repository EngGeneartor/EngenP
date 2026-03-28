#!/usr/bin/env python3
"""
Notion 작업 일지 — 전체 항목 상태/날짜/작업자 업데이트
"""
import time, requests

TOKEN = "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"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}
BASE = "https://api.notion.com/v1"

# 메인 페이지 (데이터베이스 아님, 별도 업데이트)
MAIN_PAGE = "330f2793d19281d890fdf5ebc44f10f1"

# 하위 데이터베이스 항목들
# (page_id, 상태, 날짜, 메모, 작업자들)
UPDATES = [
    # === 완료 항목 ===
    (
        "330f2793-d192-8109-a41b-e170c4380244",  # 영어 웹페이지 제작
        "✅ 완료", "2026-03-29",
        "Next.js 15 + React 19 + Tailwind 4 + shadcn/ui. 9개 페이지 + 12개 API 완성.",
        ["길영환"]
    ),
    (
        "330f2793-d192-810e-ab6a-efb85747c2b3",  # 웹 디자인 변경 이력 (v0→v1)
        "✅ 완료", "2026-03-29",
        "v0(라이트)→v1(백엔드연동)→v2(결제+다크)→v3(Haean+토스+보안). 다크 프리미엄 테마 채택.",
        ["길영환"]
    ),
    (
        "330f2793-d192-8123-800c-dca31578cff8",  # 프로젝트 기획서
        "✅ 완료", "2026-03-28",
        "PROJECT_PLAN.md 작성 완료. 파이프라인 A/B, 10개 유형, 기술스택, 코딩 지침 포함.",
        ["길영환"]
    ),
    (
        "330f2793-d192-813b-9405-ce53125bcd8e",  # 프로젝트 구조 설계
        "✅ 완료", "2026-03-28",
        "PROJECT_PLAN.md 기반. FastAPI→Next.js API Routes로 전환. 12개 서비스 모듈 구조.",
        ["길영환"]
    ),
    (
        "330f2793-d192-8142-a90e-f4e2734e7092",  # VLM 지문 구조화
        "✅ 완료", "2026-03-28",
        "structurizer.ts 532줄. Claude Vision 6단계 분석. SSRF 방어. 멀티페이지 처리.",
        ["길영환"]
    ),
    (
        "330f2793-d192-8144-8f9c-fa729ceb9442",  # FastAPI 백엔드 → Next.js API Routes
        "✅ 완료", "2026-03-29",
        "FastAPI 대신 Next.js Route Handlers 채택. 12개 API + 12개 서비스 모듈. Supabase DB + RLS.",
        ["길영환"]
    ),
    (
        "330f2793-d192-814b-9718-e48175f9f73f",  # 파이프라인 Task Board
        "✅ 완료", "2026-03-29",
        "구조화→RAG→생성→검증→자기수정→출력 전체 파이프라인 완성.",
        ["길영환"]
    ),
    (
        "330f2793-d192-8156-9bf9-eb46e35994df",  # Supabase 인증
        "✅ 완료", "2026-03-29",
        "이메일+Google OAuth. 비밀번호 강도 표시. JWT 미들웨어. 자동 Free 구독 생성 트리거.",
        ["길영환"]
    ),
    (
        "330f2793-d192-815c-9375-e646bfcdc9e3",  # .docx 출력 모듈
        "✅ 완료", "2026-03-28",
        "exporter.ts 948줄 + hwpx-exporter.ts 628줄. 커버+문제+정답 포맷팅. DOCX/HWPX 지원.",
        ["길영환"]
    ),
    (
        "330f2793-d192-8168-8df0-f3ca85d4227a",  # 대시보드 3컬럼 UI
        "✅ 완료", "2026-03-28",
        "좌측 사이드바(업로드+옵션) + 메인(지문+문제) + AI채팅. 프로젝트 이력 DB 연동.",
        ["길영환"]
    ),
    (
        "330f2793-d192-8177-8297-cac1d551f3ba",  # 랜딩 페이지 UI
        "✅ 완료", "2026-03-29",
        "다크 프리미엄 테마. 파티클 배경+별빛. 카운트업+소셜프루프. 프라이싱 카드 글로우.",
        ["길영환"]
    ),
    (
        "330f2793-d192-8190-9f56-cd086f84e6d2",  # 변형문제 5개 유형 MVP
        "✅ 완료", "2026-03-28",
        "MVP 5개→10개 유형 전부 구현. 자기수정 루프(2라운드). RAG+검증+부분재생성.",
        ["길영환"]
    ),
    (
        "330f2793-d192-81a2-8061-f95b7a8611e9",  # 파일 업로드 → VLM 파이프라인
        "✅ 완료", "2026-03-28",
        "드래그앤드롭 업로드→base64/URL→structurize→generate SSE 스트리밍 전체 연동.",
        ["길영환"]
    ),
    (
        "330f2793-d192-81a2-ae95-fdd703bea9c7",  # AI Co-pilot 채팅
        "✅ 완료", "2026-03-28",
        "Claude SSE 스트리밍. 지문/문제 컨텍스트 주입. use-chat.ts 훅. 최대 100메시지.",
        ["길영환"]
    ),
    (
        "330f2793-d192-81bb-b182-c62c4e7d090c",  # Vercel 배포 전환
        "✅ 완료", "2026-03-29",
        "GitHub Pages→Vercel 완전 전환. 보안 헤더 7종. CVE-2025-66478 패치. 워크플로우 삭제.",
        ["길영환"]
    ),
    (
        "330f2793-d192-81bd-84ea-c71812ddd01c",  # v0 프로토타입 분석
        "✅ 완료", "2026-03-29",
        "v0→v3 진화 과정 정리. 스크린샷 포함. web_sample_archive_v1_light/ 아카이브.",
        ["길영환"]
    ),
    (
        "330f2793-d192-81ec-b5fa-c776ef7c2f0b",  # Dracula 테마 + 글래스모피즘
        "✅ 완료", "2026-03-28",
        "다크 퍼플+인디고 컬러. 글래스모피즘 노이즈 오버레이. 그라디언트 텍스트+보더.",
        ["길영환"]
    ),
    (
        "330f2793-d192-81ed-b1ce-e5bd74372a8b",  # GitHub Pages 배포
        "✅ 완료", "2026-03-29",
        "GitHub Pages→Vercel 전환 완료. 기존 워크플로우 삭제 [b750580].",
        ["길영환"]
    ),
    # === 진행중 항목 ===
    (
        "330f2793-d192-8127-bb0c-c12a996c5c75",  # 구독 결제 시스템
        "🏃 진행중", "2026-03-29",
        "코드 구현 완료 (토스페이먼츠). 사업자등록번호 발급 후 실계정 전환 필요.",
        ["길영환"]
    ),
]


def update_db_page(page_id, status, date, memo, workers):
    props = {
        "상태": {"select": {"name": status}},
        "날짜": {"date": {"start": date}},
        "메모": {"rich_text": [{"type": "text", "text": {"content": memo[:2000]}}]},
    }
    if workers:
        props["작업자"] = {"multi_select": [{"name": w} for w in workers]}

    r = requests.patch(
        f"{BASE}/pages/{page_id}",
        headers=HEADERS,
        json={"properties": props},
    )
    return r.status_code


def update_main_page():
    """메인 작업 일지 페이지 속성 업데이트"""
    r = requests.patch(
        f"{BASE}/pages/{MAIN_PAGE}",
        headers=HEADERS,
        json={
            "properties": {
                "요약": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": "v3 완성: AI 파이프라인 + 토스페이먼츠 + 보안 강화 + 프리미엄 UI. 사업자등록 후 런칭 예정."}
                    }]
                },
                "현재 상태": {
                    "select": {"name": "🟢 진행중"}
                },
                "Updated": {
                    "date": {"start": "2026-03-29"}
                },
                "다음 마일스톤": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": "사업자등록 → 토스 실계정 → 베타 테스트 (강사 5~10명)"}
                    }]
                },
            }
        },
    )
    return r.status_code


def main():
    print("=== 전체 항목 상태 업데이트 시작 ===\n")

    # 1. 메인 페이지 속성 업데이트
    print("[1] 메인 페이지 속성 업데이트...")
    code = update_main_page()
    print(f"  → {code}")
    time.sleep(0.3)

    # 2. 하위 데이터베이스 항목 업데이트
    print(f"\n[2] 하위 항목 {len(UPDATES)}개 업데이트...")
    for i, (pid, status, date, memo, workers) in enumerate(UPDATES):
        code = update_db_page(pid, status, date, memo, workers)
        name = memo[:30] + "..."
        print(f"  [{i+1}/{len(UPDATES)}] {status} | {date} | {code} | {name}")
        time.sleep(0.35)

    print(f"\n=== 완료! {len(UPDATES)}개 항목 업데이트 ===")


if __name__ == "__main__":
    main()
