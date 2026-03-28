#!/usr/bin/env python3
"""
Notion 이미지 + 완료/TODO 업데이트
- v0 프로토타입 페이지에 이미지 추가
- 메인 작업 일지에 현재 상태 + TODO 추가
- 웹 디자인 변경 이력에 이미지 포함
"""
import time, requests

TOKEN = "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"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}
BASE = "https://api.notion.com/v1"

MAIN_PAGE = "330f2793d19281d890fdf5ebc44f10f1"
V0_PROTOTYPE = "330f2793d1928175b1b7fbc96be79ec6"
# Haean v3 전체 문서화 페이지
V3_DOC = "331f2793d1928197b9c5e4c75495e79f"

# 이미지 URL (Vercel 배포)
IMG_BASE = "https://haean.vercel.app"
IMG_LANDING = f"{IMG_BASE}/notion-assets/current-landing.png"
IMG_LANDING_FULL = f"{IMG_BASE}/notion-assets/current-landing-full.png"
IMG_LOGIN = f"{IMG_BASE}/notion-assets/current-login.png"
IMG_CALLBACK = f"{IMG_BASE}/notion-assets/current-callback.png"
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


def h1(t): return {"type":"heading_1","heading_1":{"rich_text":rt(t)}}
def h2(t): return {"type":"heading_2","heading_2":{"rich_text":rt(t)}}
def h3(t): return {"type":"heading_3","heading_3":{"rich_text":rt(t)}}
def para(t): return {"type":"paragraph","paragraph":{"rich_text":rt(t)}}
def bullet(t): return {"type":"bulleted_list_item","bulleted_list_item":{"rich_text":rt(t)}}
def divider(): return {"type":"divider","divider":{}}
def callout(t, icon="💡"): return {"type":"callout","callout":{"rich_text":rt(t),"icon":{"type":"emoji","emoji":icon}}}
def todo(t, checked=False): return {"type":"to_do","to_do":{"rich_text":rt(t),"checked":checked}}

def bold_para(bold, normal=""):
    parts = [{"type":"text","text":{"content":bold},"annotations":{"bold":True}}]
    if normal: parts.append({"type":"text","text":{"content":normal}})
    return {"type":"paragraph","paragraph":{"rich_text":parts}}

def rt(text):
    if len(text)<=2000: return [{"type":"text","text":{"content":text}}]
    return [{"type":"text","text":{"content":text[i:i+2000]}} for i in range(0,len(text),2000)]

def image(url, caption=""):
    block = {
        "type": "image",
        "image": {
            "type": "external",
            "external": {"url": url},
        }
    }
    if caption:
        block["image"]["caption"] = rt(caption)
    return block

def table_row(cells):
    return {"type":"table_row","table_row":{"cells":[[{"type":"text","text":{"content":c}}] for c in cells]}}

def table(w, rows):
    return {"type":"table","table":{"table_width":w,"has_column_header":True,"has_row_header":False,"children":rows}}


def build_v0_images():
    """v0 프로토타입 페이지에 이미지 추가"""
    b = []
    b.append(divider())
    b.append(h2("스크린샷"))

    b.append(h3("v0 — 초기 라이트 테마 프로토타입"))
    b.append(image(IMG_V0, "v0 라이트 테마 — 초기 3컬럼 레이아웃 프로토타입"))
    b.append(para("라이트 테마 기본. 파일 업로드 + 옵션 설정 + AI 채팅 3컬럼 구조. 백엔드 미연동 상태."))
    b.append(para("아카이브: web_sample_archive_v1_light/ (main1.png, main2.png, PDF 포함)"))

    b.append(h3("v3 — 현재 다크 프리미엄 테마"))
    b.append(image(IMG_LANDING, "v3 다크 프리미엄 — 랜딩 페이지 히어로"))
    b.append(para("다크 퍼플 + 인디고 컬러. 파티클 메시 배경 + 별빛 효과. 프리미엄 느낌으로 전환. 메인 배너는 다크모드가 더 이뻐서 다크모드로 채택."))

    b.append(image(IMG_LANDING_FULL, "v3 다크 — 랜딩 페이지 전체"))

    b.append(h3("로그인 페이지"))
    b.append(image(IMG_LOGIN, "v3 — 로그인/회원가입 페이지"))
    b.append(para("이메일 + 비밀번호 + Google OAuth. 비밀번호 강도 실시간 표시 (5단계 컬러 바)."))

    b.append(h3("OG 이미지 (카카오톡/SNS 공유)"))
    b.append(image(IMG_OG, "Haean OG 이미지 — SNS 공유 시 표시"))
    return b


def build_main_status():
    """메인 작업 일지에 현재 상태 + TODO 추가"""
    b = []
    b.append(divider())
    b.append(h1("📊 현재 상태 (2026-03-29 기준)"))

    b.append(h2("✅ 완료된 작업"))
    b.append(table(3, [
        table_row(["영역", "항목", "상태"]),
        table_row(["AI 엔진", "VLM 구조화 (6단계 파이프라인)", "✅ 완료"]),
        table_row(["AI 엔진", "문제 생성 (10개 유형)", "✅ 완료"]),
        table_row(["AI 엔진", "자기수정 루프 (검증→피드백→재생성)", "✅ 완료"]),
        table_row(["AI 엔진", "RAG 시스템 (선택적 템플릿 로딩)", "✅ 완료"]),
        table_row(["AI 엔진", "7항목 검증 시스템", "✅ 완료"]),
        table_row(["AI 엔진", "기출 DNA 분석", "✅ 완료"]),
        table_row(["AI 엔진", "AI 채팅 (SSE 스트리밍)", "✅ 완료"]),
        table_row(["문서출력", "DOCX 내보내기 (커버+문제+정답)", "✅ 완료"]),
        table_row(["문서출력", "HWPX 내보내기 (한글 형식)", "✅ 완료"]),
        table_row(["프론트엔드", "랜딩 페이지 (다크 프리미엄)", "✅ 완료"]),
        table_row(["프론트엔드", "로그인/회원가입 (이메일+Google OAuth)", "✅ 완료"]),
        table_row(["프론트엔드", "대시보드 (3패널 레이아웃)", "✅ 완료"]),
        table_row(["프론트엔드", "설정 모달 (4탭)", "✅ 완료"]),
        table_row(["프론트엔드", "파티클 배경 + 별빛 효과", "✅ 완료"]),
        table_row(["프론트엔드", "이용약관 + 개인정보처리방침", "✅ 완료"]),
        table_row(["프론트엔드", "404/에러 페이지", "✅ 완료"]),
        table_row(["결제", "토스페이먼츠 연동 (코드 구현)", "✅ 완료"]),
        table_row(["결제", "Free/Pro 플랜 + 사용량 제한", "✅ 완료"]),
        table_row(["보안", "인증 미들웨어 (JWT)", "✅ 완료"]),
        table_row(["보안", "Rate Limiting (60/min)", "✅ 완료"]),
        table_row(["보안", "HTTP 보안 헤더 7종", "✅ 완료"]),
        table_row(["보안", "SSRF 차단 + 에러 위생처리", "✅ 완료"]),
        table_row(["보안", "CVE-2025-66478 패치", "✅ 완료"]),
        table_row(["보안", "RLS 전 테이블 적용", "✅ 완료"]),
        table_row(["배포", "Vercel 배포 전환", "✅ 완료"]),
        table_row(["브랜드", "Abyss→Haean 리브랜딩", "✅ 완료"]),
    ]))
    b.append(divider())

    b.append(h2("⏳ 해야 할 일 (TODO)"))
    b.append(h3("🔴 즉시 필요 (런칭 전 필수)"))
    b.append(todo("사업자등록번호 발급 → 토스페이먼츠 실계정 가입"))
    b.append(todo("토스 API 키 발급 → Vercel 환경변수에 설정 (TOSS_PAYMENTS_SECRET_KEY, NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY)"))
    b.append(todo("Supabase 프로덕션 프로젝트 설정 (현재 개발용)"))
    b.append(todo("커스텀 도메인 연결 (Vercel)"))
    b.append(todo("ANTHROPIC_API_KEY 프로덕션 키 설정"))

    b.append(h3("🟡 기능 보완"))
    b.append(todo(".hwpx 출력 실제 테스트 + 서식 검증"))
    b.append(todo("검증 병렬화 (현재 순차 실행 → Promise.allSettled)"))
    b.append(todo("Rate limiter Redis 전환 (현재 인메모리, 서버 재시작 시 초기화)"))
    b.append(todo("TypeScript 빌드 에러 해결 (현재 ignoreBuildErrors: true)"))
    b.append(todo("코드 레벨 정적 검증 추가 (AI 검증 전 사전 필터링)"))
    b.append(todo("최종 수정 라운드 후 재검증 로직"))
    b.append(todo("토큰 사용량 모니터링 + 비용 대시보드"))
    b.append(todo("Anthropic Prompt Caching 적용 (input token 90% 절감 가능)"))

    b.append(h3("🟢 마케팅/런칭"))
    b.append(todo("베타 테스트 (영어 강사 5~10명)"))
    b.append(todo("피드백 수집 → 프롬프트 튜닝"))
    b.append(todo("가격 정책 최종 결정 (₩29,900/월 적정?)"))
    b.append(todo("서비스 홍보 페이지/자료 제작"))
    b.append(todo("SEO 최적화"))

    b.append(h3("🔵 향후 확장"))
    b.append(todo("Kakao OAuth 추가"))
    b.append(todo("모바일 반응형 최적화"))
    b.append(todo("학생용 셀프스터디 모드"))
    b.append(todo("문제 은행 기능 (생성된 문제 관리/재활용)"))
    b.append(todo("다국어 지원 (영어 외 과목)"))
    b.append(divider())

    b.append(h2("📸 현재 웹 스크린샷"))
    b.append(h3("랜딩 페이지 (다크 프리미엄)"))
    b.append(para("메인 배너는 다크모드가 더 이뻐서 다크모드로 채택함."))
    b.append(image(IMG_LANDING, "v3 랜딩 — 다크 프리미엄 테마"))
    b.append(image(IMG_LANDING_FULL, "v3 랜딩 — 전체 스크롤"))

    b.append(h3("로그인 페이지"))
    b.append(image(IMG_LOGIN, "v3 로그인 — 이메일 + Google OAuth"))

    b.append(h3("라이트 모드 버전"))
    b.append(para("라이트 모드 프로토타입은 web_sample_archive_v1_light/ 에 아카이브됨."))
    b.append(image(IMG_V0, "v0 라이트 테마 프로토타입"))

    b.append(h3("OG 이미지 (SNS 공유)"))
    b.append(image(IMG_OG, "카카오톡/SNS 공유 시 표시되는 이미지"))

    return b


def main():
    print("=== 이미지 + 상태 업데이트 시작 ===\n")

    # 1. v0 프로토타입 페이지에 이미지 추가
    print("[1/2] v0 프로토타입에 이미지 추가...")
    append_blocks(V0_PROTOTYPE, build_v0_images())
    time.sleep(0.3)

    # 2. 메인 작업 일지에 현재 상태 + TODO + 스크린샷
    print("\n[2/2] 메인 작업 일지에 상태+TODO+스크린샷...")
    append_blocks(MAIN_PAGE, build_main_status())

    print("\n=== 완료! ===")


if __name__ == "__main__":
    main()
