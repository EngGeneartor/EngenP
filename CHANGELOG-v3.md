# Haean v3 Changelog (vs v2)

> 2026-03-28 기준 | Notion 업데이트용 정리

---

## 1. 브랜드 리뉴얼

- **Abyss -> Haean** 브랜드 전면 변경 (서비스명, 로고, 메타데이터, 푸터)
- 랜딩페이지 카피 전면 재작성 (한국어)
- 다크 퍼플 + 인디고 컬러 시스템 유지, 라이트모드 추가

---

## 2. 핵심 AI 파이프라인

### 2-1. 구조화 (Structurizer)
- Claude Vision API (claude-sonnet-4-6) 기반 지문 OCR + 구조 분석
- 6단계 분석: 텍스트 추출 -> 단락 분리 -> 문법 포인트 추출 -> 어휘 분석 -> 주제/난이도 추정 -> JSON 출력
- 이미지 URL 및 base64 입력 지원
- SSRF 방어: `validateUrl()` — private IP, non-HTTPS, 내부 호스트네임 차단

### 2-2. 문제 생성 (Generator)
- 10개 문제 유형 지원: vocabulary_choice, grammar_choice, blank_inference, order_sentence, summary_choice, insert_sentence, title_choice, irrelevant_sentence, purpose_choice, verb_transform
- **자기 수정 루프**: 생성 -> 검증(7개 체크) -> 피드백 기반 재생성 (최대 2라운드)
- 부분 실패 처리: 통과한 문제 보존, 실패한 문제만 재생성
- Exponential backoff 재시도 (MAX_RETRIES=3)

### 2-3. RAG 시스템
- 선택적 유형별 템플릿 로딩 (question_types/*.json)
- few-shot 예시 + 제약 조건 주입
- 인메모리 캐싱

### 2-4. 검증 (Validator)
- 7개 검증 항목: 정답 정확성, 오답 타당성, 지문 충실도, 지시문 적합성, 난이도 적절성, 형식 준수, 해설 정확성
- PASS / WARN / FAIL 3단계 판정
- 품질 점수 산출 (100 - fail*20 - warn*5)

### 2-5. 기출 DNA 분석
- 학교별 기출 시험지 이미지 분석 (최대 20장)
- 출제 경향, 유형 분포, 난이도 패턴 프로필 생성
- 생성 시 DNA 프로필 반영

### 2-6. AI 채팅
- 지문/문제 컨텍스트 기반 실시간 SSE 스트리밍 채팅
- 문제 수정, 해설 보강, 난이도 조절 등 대화형 지원

---

## 3. API 엔드포인트 (12개)

| 엔드포인트 | 설명 |
|---|---|
| POST /api/structurize | 지문 구조화 |
| POST /api/generate | 문제 일괄 생성 |
| POST /api/generate-stream | SSE 스트리밍 (구조화+생성) |
| POST /api/validate | 문제 검증 |
| POST /api/export | DOCX/HWPX 내보내기 |
| POST /api/chat | AI 채팅 (SSE) |
| POST /api/analyze-dna | 기출 DNA 분석 |
| POST /api/usage | 사용량 조회 |
| POST /api/stripe/create-checkout | Stripe 결제 세션 |
| POST /api/stripe/portal | Stripe 고객 포털 |
| POST /api/stripe/webhook | Stripe 웹훅 |
| GET /api/auth/callback | OAuth 콜백 |

---

## 4. 프론트엔드 페이지 (7개)

| 경로 | 설명 |
|---|---|
| / | 랜딩페이지 (히어로, 기능소개, 가격, CTA) |
| /login | 로그인/회원가입 (이메일 + Google/GitHub OAuth) |
| /dashboard | 메인 대시보드 (3패널: 사이드바 + 메인 + AI채팅) |
| /terms | 이용약관 |
| /privacy | 개인정보처리방침 |
| /not-found | 404 에러페이지 |
| /error | 글로벌 에러 바운더리 |

---

## 5. 결제 시스템 (Stripe)

- **Free**: 월 10회 생성, 월 5회 내보내기
- **Pro**: 무제한 생성/내보내기
- Stripe Checkout -> 구독 -> Webhook -> Supabase `subscriptions` 테이블 동기화
- Stripe Customer Portal 연동 (구독 관리, 해지, 결제수단 변경)
- 업그레이드 유도: 한도 초과 시 모달 자동 오픈

---

## 6. 설정 모달

- GPT 스타일 오버레이 (4탭)
  - **계정**: 이메일, 가입일, 플랜 정보, 아바타
  - **결제**: 플랜 변경, Stripe 포털 연결
  - **사용량**: 생성/내보내기 사용량 프로그레스 바
  - **테마**: 라이트/다크/시스템 3종 테마 전환
- 탭 전환 애니메이션

---

## 7. UI/UX 개선

### 다크모드 가독성
- 전 컴포넌트 텍스트 opacity 상향 (25~35% -> 50~55%, 40~45% -> 60~65%)
- 10개 파일, 101개 라인 수정

### 프리미엄 이펙트
- **애니메이션 그라디언트 텍스트** (히어로 섹션)
- **노이즈 텍스처 오버레이** (glass-noise)
- **애니메이션 그라디언트 보더** (활성 상태 회전 보더)
- **프라이싱 카드 호버 글로우** (Free/Pro 차등)
- **숫자 카운트업 애니메이션** (통계 섹션)
- **소셜 프루프 섹션** (아바타 그룹 + 별점)
- **Pro 배지 글로우** (맥동 애니메이션)
- **탭 전환 페이드인** (설정 모달)
- **스크롤 인디케이터** 퍼플 그라디언트 + "Scroll" 레이블

### 파티클 메시 배경
- Canvas 기반 애니메이션 (ambient-background.tsx)
- 마우스 인터랙션 반응

---

## 8. 보안 강화

### 인증 & 권한
- Supabase JWT 검증 (requireAuth)
- Row Level Security (RLS) 전 테이블 적용
- middleware.ts: /dashboard, /api/* 보호

### API 보안
- **Rate Limiting**: 전 API 엔드포인트 (60req/min per IP+user)
- **Usage Limit**: generate, generate-stream에 월간 사용량 제한
- **입력 크기 검증**: fileUrl(2048자), base64(10MB), fullText(50K자), messages(100개), files(20개)
- **에러 메시지 위생처리**: 내부 에러 -> 한국어 일반 메시지 (7개 API 라우트)
- **SSRF 차단**: structurizer URL 검증 (private IP, localhost, metadata endpoint 차단)

### 키 & 시크릿
- 하드코딩된 Supabase URL/키 제거 (2개 파일, 2개 프로젝트)
- .claude/ 디렉토리 .gitignore 추가 + git 추적 해제
- 환경변수 필수화 (fallback 제거)
- Stripe Origin 헤더 취약점 수정: `request.headers.get('origin')` -> `process.env.NEXT_PUBLIC_APP_URL`

### HTTP 보안 헤더
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()
- **Strict-Transport-Security**: max-age=63072000; includeSubDomains; preload
- **Content-Security-Policy**: script/style/img/connect/frame-src 화이트리스트

### 에러 바운더리
- error.tsx: `error.message` 노출 제거 -> 일반 메시지 표시

---

## 9. 인프라

- **Next.js 15.5.14** (CVE-2025-66478 보안 패치)
- **Vercel 배포** (GitHub Pages -> Vercel 전환)
- TypeScript strict 모드
- Tailwind CSS 4 + shadcn/ui
- next-themes (시스템 테마 포함)

---

## 10. 데이터

### RAG 데이터셋
- 10개 문제 유형별 JSON 템플릿 (data/question_types/)
- 실제 모델 데이터셋 기반 few-shot 예시

### 프롬프트 템플릿 (4개)
- structurize_passage.txt (VLM 구조화)
- generate_questions.txt (문제 생성)
- validate_question.txt (7항목 검증)
- analyze_exam_dna.txt (기출 DNA)

---

## 11. 알려진 제한사항

- Rate limiter: 인메모리 (서버 재시작 시 초기화, 멀티 인스턴스 미지원)
- 검증 7개 항목 전부 AI 기반 (코드 레벨 정적 검증 미구현)
- 검증 순차 실행 (병렬화 미구현)
- 최종 수정 라운드 후 재검증 미구현
- 토큰 버짓 명시적 관리 미구현

---

*Last updated: 2026-03-28*
