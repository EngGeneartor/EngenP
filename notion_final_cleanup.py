#!/usr/bin/env python3
"""
Final cleanup:
1. Fill new DB pages with content (v3 doc + tech doc)
2. Clean main page: remove added blocks, update existing todos
3. Create "메인페이지 테마 UI 비교" DB entry with images
"""
import json, time, requests

TOKEN = "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"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}
BASE = "https://api.notion.com/v1"

DB_ID = "330f2793-d192-8192-bd80-efea72774be4"
MAIN_PAGE = "330f2793d19281d890fdf5ebc44f10f1"
NEW_V3_DOC = "331f2793d192819d9006dbf708c6dcff"
NEW_TECH_DOC = "331f2793d192810cb22df94506f15e8a"

# Original pages with content
ORIG_V3_DOC = "331f2793d1928197b9c5e4c75495e79f"
ORIG_TECH_DOC = "331f2793d19281c281ffffdc356e932d"

IMG_BASE = "https://haean.vercel.app"
IMG_LANDING = f"{IMG_BASE}/notion-assets/current-landing.png"
IMG_LANDING_FULL = f"{IMG_BASE}/notion-assets/current-landing-full.png"
IMG_LOGIN = f"{IMG_BASE}/notion-assets/current-login.png"
IMG_V0 = f"{IMG_BASE}/notion-assets/v0-full-page.png"
IMG_OG = f"{IMG_BASE}/og-image.png"


def append_blocks(pid, blocks):
    for i in range(0, len(blocks), 100):
        batch = blocks[i:i+100]
        r = requests.patch(f"{BASE}/blocks/{pid}/children", headers=HEADERS, json={"children": batch})
        if r.status_code != 200:
            print(f"  ERR {i//100}: {r.status_code} - {r.text[:200]}")
        else:
            print(f"  Batch {i//100+1} OK ({len(batch)})")
        time.sleep(0.35)

def get_all_children(pid):
    blocks = []
    cursor = None
    while True:
        url = f"{BASE}/blocks/{pid}/children?page_size=100"
        if cursor: url += f"&start_cursor={cursor}"
        r = requests.get(url, headers=HEADERS)
        d = r.json()
        blocks.extend(d.get("results",[]))
        if not d.get("has_more"): break
        cursor = d.get("next_cursor")
    return blocks

def delete_block(bid):
    return requests.delete(f"{BASE}/blocks/{bid}", headers=HEADERS).status_code

def check_todo(bid):
    return requests.patch(f"{BASE}/blocks/{bid}", headers=HEADERS, json={"to_do":{"checked":True}}).status_code

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
def todo(t, checked=False): return {"type":"to_do","to_do":{"rich_text":rt(t),"checked":checked}}
def image(url, caption=""):
    block = {"type":"image","image":{"type":"external","external":{"url":url}}}
    if caption: block["image"]["caption"] = rt(caption)
    return block

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


def build_v3_doc_short():
    """v3 전체 문서화 — 핵심만"""
    b = []
    b.append(callout("2026-03-29 | 작업자: 길영환 + Claude Code", "📋"))
    b.append(divider())

    b.append(h2("프로젝트 개요"))
    b.append(para("학교 프린트/모의고사 지문(JPG, PDF) 업로드 → VLM(Claude) 분석 → 변형 문제 자동 생성 → .docx/.hwpx 출력. 구독형 SaaS."))
    b.append(bold_para("타겟: ", "영어 내신 단과 강사 + 독학 학생"))
    b.append(bold_para("브랜드: ", "Abyss → Haean (v3 리브랜딩)"))
    b.append(bold_para("배포: ", "https://haean.vercel.app"))
    b.append(divider())

    b.append(h2("기술 스택"))
    b.append(table(3, [
        table_row(["영역", "기술", "비고"]),
        table_row(["프론트", "Next.js 15.5.14 + React 19 + TS", "App Router"]),
        table_row(["UI", "Tailwind CSS 4 + shadcn/ui", "다크/라이트/시스템"]),
        table_row(["AI", "Claude API (sonnet-4-6)", "Vision 지원"]),
        table_row(["DB", "Supabase (PostgreSQL + Auth)", "RLS 전 테이블"]),
        table_row(["결제", "토스페이먼츠", "카드/카카오/네이버/토스"]),
        table_row(["배포", "Vercel", "자동배포 + HTTPS"]),
        table_row(["문서출력", "docx + JSZip", ".docx / .hwpx"]),
    ]))
    b.append(divider())

    b.append(h2("v2 → v3 주요 변경"))
    b.append(bullet("Abyss → Haean 리브랜딩 + OG 메타태그"))
    b.append(bullet("AI 파이프라인 완성: 구조화(6단계) → 생성(10유형) → 검증(7항목) → 자기수정(2라운드)"))
    b.append(bullet("Stripe → 토스페이먼츠 전환 (Free ₩0 월10회 / Pro ₩29,900 무제한)"))
    b.append(bullet("GitHub Pages → Vercel 전환"))
    b.append(bullet("보안: HTTP 헤더 7종 + SSRF 차단 + RLS + CVE 패치"))
    b.append(bullet("UI: 파티클 배경 + 별빛 + 프리미엄 이펙트"))
    b.append(divider())

    b.append(h2("API 엔드포인트 (12개)"))
    b.append(table(3, [
        table_row(["엔드포인트", "설명", "인증"]),
        table_row(["/api/structurize", "지문 구조화", "✅"]),
        table_row(["/api/generate", "문제 생성", "✅"]),
        table_row(["/api/generate-stream", "SSE 스트리밍 생성", "✅"]),
        table_row(["/api/validate", "7항목 검증", "✅"]),
        table_row(["/api/export", "DOCX/HWPX 내보내기", "✅"]),
        table_row(["/api/chat", "AI 채팅 SSE", "✅"]),
        table_row(["/api/analyze-dna", "기출 DNA 분석", "✅"]),
        table_row(["/api/payments/*", "결제 (confirm/billing/webhook/cancel)", "✅/❌"]),
    ]))
    b.append(divider())

    b.append(h2("서비스 모듈 (12개)"))
    b.append(table(3, [
        table_row(["모듈", "코드량", "역할"]),
        table_row(["structurizer.ts", "532줄", "VLM 구조화 + SSRF 방어"]),
        table_row(["generator.ts", "468줄", "RAG + 생성 + 자기수정 루프"]),
        table_row(["validator.ts", "272줄", "7항목 검증"]),
        table_row(["exporter.ts", "948줄", "DOCX 출력"]),
        table_row(["hwpx-exporter.ts", "628줄", "HWPX 출력"]),
        table_row(["prompt-builder.ts", "455줄", "프롬프트 조립"]),
        table_row(["rag.ts", "197줄", "선택적 템플릿 로딩"]),
        table_row(["dna-analyzer.ts", "256줄", "기출 DNA"]),
        table_row(["anthropic.ts", "215줄", "Claude API"]),
        table_row(["subscription.ts", "175줄", "구독 관리"]),
        table_row(["usage-tracker.ts", "187줄", "사용량 추적"]),
        table_row(["toss.ts", "166줄", "토스 결제 API"]),
    ]))
    b.append(divider())

    b.append(h2("DB 스키마 (6 테이블)"))
    b.append(bullet("passages, question_sets, questions, exports, usage_logs, subscriptions"))
    b.append(bullet("전 테이블 RLS + 마이그레이션 3개 + OAuth 자동 Free 구독 트리거"))
    b.append(divider())

    b.append(h2("보안 점검"))
    b.append(bullet("JWT 인증 + RLS + Rate Limit(60/min) + SSRF 차단"))
    b.append(bullet("HTTP 보안 헤더 7종 (HSTS, CSP, X-Frame 등)"))
    b.append(bullet("에러 메시지 위생처리 + 하드코딩 키 제거"))
    b.append(bullet("Next.js 15.5.14 CVE-2025-66478 패치"))
    b.append(divider())

    b.append(h2("프로젝트 .md 파일"))
    b.append(bullet("PROJECT_PLAN.md — 기획서 + 기술스택 + 코딩 지침"))
    b.append(bullet("CHANGELOG-v3.md — v2→v3 변경사항"))
    b.append(bullet("README.md — 프로젝트 소개"))
    b.append(bullet("docs/payment-setup-guide.md — 결제 설정 가이드"))
    b.append(bullet("dataset/ — VLM 전처리 지침서 + 제작 지침서 + 모델 데이터셋"))
    return b


def build_tech_doc_short():
    """에이전트 루프 + 토큰 최적화 + RAG — 핵심만"""
    b = []
    b.append(callout("2026-03-29 | 작업자: 길영환 + Claude Code", "🔬"))
    b.append(divider())

    b.append(h2("에이전트 루프 (Self-Correction Loop)"))
    b.append(code_block(
        "Generate → Validate(7항목) → Correct(피드백) → Re-validate\n"
        "                                    ↑ 최대 2라운드 ↓\n"
        "\n"
        "핵심 설계:\n"
        "  • 부분 재생성: FAIL 문제만 재생성, PASS는 보존 (토큰 80% 절약)\n"
        "  • 피드백 주입: 검증 결과(실패 항목 + patch_suggestions)를 correction prompt에 포함\n"
        "  • 2라운드 제한: MAX_CORRECTION_ROUNDS=2 → 초과 시 valid만 반환\n"
        "  • 2계층 retry: API retry(네트워크) + correction loop(품질) 분리"
    ))
    b.append(divider())

    b.append(h2("7항목 검증 시스템"))
    b.append(table(3, [
        table_row(["항목", "검증 내용", "실패 시"]),
        table_row(["answer_accuracy", "정답이 실제로 맞는지", "FAIL → 재생성"]),
        table_row(["distractor_validity", "오답 선지 합리성", "FAIL → 선지 교체"]),
        table_row(["passage_fidelity", "원문 범위 내 출제", "FAIL → 수정"]),
        table_row(["instruction_fit", "유형 맞는 지시문", "WARN"]),
        table_row(["difficulty_match", "요청 난이도 일치", "WARN"]),
        table_row(["format_compliance", "JSON 스키마 준수", "FAIL → 재생성"]),
        table_row(["explanation_quality", "해설 논리성", "WARN"]),
    ]))
    b.append(para("품질 점수: 100 - (FAIL×20) - (WARN×5). 문제별 독립 검증 (각각 별도 API 호출)."))
    b.append(divider())

    b.append(h2("토큰 최적화 전략"))
    b.append(numbered("태스크별 max_tokens 차등: structurize 4096 / generate 8192 / validate 4096"))
    b.append(numbered("Selective RAG Loading: 선택한 유형만 로드 → 70-80% input token 절감"))
    b.append(numbered("Few-shot 1개/유형 제한 (예시 3개 → 1개, 66% 절감)"))
    b.append(numbered("Static/Dynamic 프롬프트 분리 (시스템=캐시, 유저=동적 RAG)"))
    b.append(numbered("Correction prompt에서 해당 유형 규칙만 포함"))
    b.append(numbered("3계층 인메모리 캐싱 (템플릿 + 프롬프트 + SDK 인스턴스)"))
    b.append(divider())

    b.append(h2("비용 분석 (1회 생성 기준)"))
    b.append(table(3, [
        table_row(["단계", "API 호출", "예상 토큰"]),
        table_row(["구조화", "1회", "~5,500"]),
        table_row(["생성", "1회", "~10,000"]),
        table_row(["검증 (5문제)", "5회", "~27,500"]),
        table_row(["수정 (필요시)", "1회", "~5,500"]),
        table_row(["합계", "7~8회", "~43,000~48,500"]),
    ]))
    b.append(para("Sonnet 4.6 기준 약 $0.15~0.20/요청. 무료 티어 10회 = ~$1.5~2.0/월/사용자."))
    b.append(divider())

    b.append(h2("RAG 시스템"))
    b.append(code_block(
        "data/question_types/ (10개 JSON)\n"
        "  └─ { type_id, generation_rules[], output_schema{}, examples[] }\n"
        "\n"
        "로딩 흐름:\n"
        "  사용자 선택 types → loadQuestionTypeContext(types)\n"
        "    → 캐시 체크 → 파일 로드 → TypeContext 추출\n"
        "    → loadFewShotExamples(types, 1개/유형)\n"
        "    → buildGenerateUserMessage()에 주입\n"
        "\n"
        "DNA 프로필 확장:\n"
        "  기출 분석 결과(SchoolDnaProfile)도 프롬프트에 주입\n"
        "  → 학교별 유형분포/난이도/문법/어휘 스타일 반영"
    ))
    b.append(divider())

    b.append(h2("향후 최적화"))
    b.append(bullet("검증 병렬화 (순차 5회 → Promise.allSettled)"))
    b.append(bullet("Anthropic Prompt Caching (input token 90% 절감)"))
    b.append(bullet("코드 레벨 정적 검증 (AI 검증 전 사전 필터링)"))
    b.append(bullet("토큰 사용량 모니터링 + 비용 대시보드"))
    return b


def build_theme_comparison():
    """메인페이지 테마 UI 비교 — DB 항목용"""
    b = []
    b.append(callout("2026-03-29 | 작업자: 길영환 + Claude Code\n메인 페이지 다크/라이트 테마 비교. 다크모드가 더 이뻐서 메인 배너는 다크모드로 채택.", "🎨"))
    b.append(divider())

    b.append(h2("다크 모드 (현재 메인 테마)"))
    b.append(para("다크 퍼플 + 인디고 컬러. 파티클 메시 배경 + 별빛 효과. 프리미엄 느낌."))
    b.append(image(IMG_LANDING, "v3 다크 — 랜딩 히어로"))
    b.append(image(IMG_LANDING_FULL, "v3 다크 — 랜딩 전체"))
    b.append(divider())

    b.append(h2("라이트 모드 (v0 프로토타입)"))
    b.append(para("초기 라이트 테마 프로토타입. 아카이브: web_sample_archive_v1_light/"))
    b.append(image(IMG_V0, "v0 라이트 — 초기 프로토타입"))
    b.append(divider())

    b.append(h2("로그인 페이지"))
    b.append(image(IMG_LOGIN, "v3 — 이메일 + Google OAuth 로그인"))
    b.append(divider())

    b.append(h2("OG 이미지 (SNS 공유)"))
    b.append(image(IMG_OG, "카카오톡/SNS 공유 시 표시"))
    b.append(divider())

    b.append(h2("테마 선택 근거"))
    b.append(bullet("다크 배경에서 파티클 효과 + 별빛 글로우가 훨씬 돋보임"))
    b.append(bullet("프리미엄 SaaS 느낌 (AI 서비스 = 다크 테마 트렌드)"))
    b.append(bullet("라이트 모드는 설정에서 전환 가능 (next-themes 시스템 테마 포함)"))
    return b


def main():
    print("=== Final cleanup 시작 ===\n")

    # 1. Fill new v3 doc DB page
    print("[1/5] v3 전체 문서화 페이지 채우기...")
    append_blocks(NEW_V3_DOC, build_v3_doc_short())
    time.sleep(0.5)

    # 2. Fill new tech doc DB page
    print("\n[2/5] 기술 문서 페이지 채우기...")
    append_blocks(NEW_TECH_DOC, build_tech_doc_short())
    time.sleep(0.5)

    # 3. Create theme comparison DB entry
    print("\n[3/5] 메인페이지 테마 UI 비교 DB 항목 생성...")
    r = requests.post(f"{BASE}/pages", headers=HEADERS, json={
        "parent": {"type": "database_id", "database_id": DB_ID},
        "icon": {"type": "emoji", "emoji": "🎨"},
        "properties": {
            "작업 내용": {"title": [{"type":"text","text":{"content":"메인페이지 테마 UI 비교 (다크/라이트)"}}]},
            "상태": {"select": {"name": "✅ 완료"}},
            "카테고리": {"select": {"name": "Frontend"}},
            "날짜": {"date": {"start": "2026-03-29"}},
            "작업자": {"multi_select": [{"name": "길영환"}]},
            "메모": {"rich_text": [{"type":"text","text":{"content":"다크모드 메인 채택. 파티클+별빛 효과가 다크에서 더 돋보임. 라이트 모드 설정 전환 가능."}}]},
        },
    })
    if r.status_code == 200:
        theme_id = r.json()["id"]
        print(f"  Created: {theme_id}")
        time.sleep(0.3)
        append_blocks(theme_id, build_theme_comparison())
    else:
        print(f"  ERR: {r.status_code}")
    time.sleep(0.5)

    # 4. Clean main page: delete our added blocks (work log, status, images)
    print("\n[4/5] 메인 페이지 정리 — 추가했던 장황한 블록 삭제...")
    all_blocks = get_all_children(MAIN_PAGE)
    to_delete = []
    for b in all_blocks:
        bid = b["id"]
        # Delete blocks we added (331f prefix) that are NOT child_page or child_database
        if bid.startswith("331f") and b["type"] not in ("child_page", "child_database"):
            to_delete.append(bid)
    print(f"  삭제 대상: {len(to_delete)}개 블록")
    for i, bid in enumerate(to_delete):
        delete_block(bid)
        if (i+1) % 15 == 0:
            time.sleep(0.4)
    print(f"  삭제 완료")
    time.sleep(0.5)

    # 5. Update main page todos (check completed ones)
    print("\n[5/5] 메인 페이지 TODO 업데이트...")
    all_blocks = get_all_children(MAIN_PAGE)

    # Update the progress callout and check todos
    for b in all_blocks:
        bid = b["id"]
        t = b["type"]

        if t == "to_do" and not b["to_do"].get("checked", False):
            texts = b["to_do"].get("rich_text", [])
            text = texts[0]["plain_text"] if texts else ""

            # Check items that are done
            done_keywords = [
                "VLM", "FastAPI", "백엔드", "파일 업로드", "PDF",
                "변형문제", "5유형", "AI Co-pilot", "채팅",
                ".docx", "후순위 5유형", "순서배열", "문장삽입",
                "기출 DNA", "동형 모의고사",
                ".hwpx", "Vercel", "배포",
                "생성 이력", "사용량"
            ]
            should_check = any(kw in text for kw in done_keywords)

            if should_check:
                code = check_todo(bid)
                print(f"  ✅ {code} | {text[:50]}")
                time.sleep(0.15)

    # Update the progress callout
    for b in all_blocks:
        if b["type"] == "callout":
            texts = b["callout"].get("rich_text", [])
            text = texts[0]["plain_text"] if texts else ""
            if "전체 진행률" in text:
                requests.patch(f"{BASE}/blocks/{b['id']}", headers=HEADERS, json={
                    "callout": {
                        "rich_text": [{"type":"text","text":{"content":"전체 진행률: ~95% (코드 구현 완료, 사업자등록+토스 실계정 전환 대기)\n업데이트: 2026-03-29"}}],
                        "icon": {"type":"emoji","emoji":"📊"}
                    }
                })
                print("  진행률 업데이트 완료")

    # Update heading "다음 단계"
    for b in all_blocks:
        if b["type"] == "heading_3":
            texts = b["heading_3"].get("rich_text", [])
            text = texts[0]["plain_text"] if texts else ""
            if "다음 단계" in text:
                requests.patch(f"{BASE}/blocks/{b['id']}", headers=HEADERS, json={
                    "heading_3": {"rich_text": [{"type":"text","text":{"content":"✅ 완료 (백엔드 + AI)"}}]}
                })
                print("  '다음 단계' → '✅ 완료' 업데이트")
            elif "후순위" in text:
                requests.patch(f"{BASE}/blocks/{b['id']}", headers=HEADERS, json={
                    "heading_3": {"rich_text": [{"type":"text","text":{"content":"✅ 완료 (후순위 기능 전부 구현)"}}]}
                })
                print("  '후순위' → '✅ 완료' 업데이트")

    print("\n=== 완료! ===")


if __name__ == "__main__":
    main()
