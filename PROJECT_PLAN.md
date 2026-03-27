# AI 기반 영어 내신 변형 문제 자동 생성 SaaS

## 1. 프로젝트 목표

학교 프린트/모의고사 지문(JPG, PDF)을 업로드하면 VLM(Claude)이 분석하여 변형 문제, 워크북, 동형 모의고사를 자동 생성하고 .docx/.hwpx로 출력하는 구독형 웹 서비스.

**타겟 사용자**: 영어 내신 단과 강사, 독학 학생

---

## 2. 핵심 파이프라인

### 파이프라인 A: 변형문제 / 워크북

```
[사용자 업로드: 모의고사/추가지문/교과서 (PDF, JPG)]
    ↓
[1단계] VLM(Claude) → 지문 JSON 구조화
    ↓
[2단계] 기준 JSON(10개 유형 템플릿) + 구조화된 지문 → 변형문제/워크북 생성
    ↓
[3단계] .docx / .hwpx 파일 출력
```

### 파이프라인 B: 동형 모의고사

```
[사용자 업로드: 시험 범위 지문 + 학교 기출문제 (PDF, JPG)]
    ↓
[1단계] VLM → 지문 + 기출 JSON 구조화
    ↓
[2단계] 기출 DNA 분석 (출제 패턴, 선호 어법, 오답 구성, 난이도)
    ↓
[3단계] 분석된 스타일 적용 → 동형 모의고사 생성
    ↓
[4단계] .docx / .hwpx 파일 출력
```

---

## 3. 해야 할 일 (Task Breakdown)

### Phase 0: 프로젝트 세팅
- [ ] Git 레포 초기화 및 모노레포 구조 결정
- [ ] 프론트엔드 프로젝트 생성 (Next.js)
- [ ] 백엔드 프로젝트 생성 (FastAPI)
- [ ] Docker Compose 로컬 개발 환경 구성
- [ ] CI/CD 파이프라인 기초 세팅

### Phase 1: VLM 기반 지문 구조화 엔진
- [ ] Claude API 연동 모듈 구현 (Vision 입력 지원)
- [ ] PDF → 이미지 변환 유틸리티 (pdf2image / PyMuPDF)
- [ ] 지문 구조화 프롬프트 설계 및 테스트
- [ ] JSON 출력 스키마 정의 (지문, 문제, 선지, 정답, 메타데이터)
- [ ] 구조화 결과 검증 로직 (Self-Correction 루프)
- [ ] 다양한 지문 포맷에 대한 테스트 (모의고사, 교과서, 학교 프린트)

### Phase 2: 변형문제 생성 엔진
- [ ] 10개 표준 유형별 기준 JSON 데이터 정리 및 DB 저장
  - 어휘 선택, 어법 선택, 빈칸 추론, 순서 배열, 문장 삽입, 내용 일치/불일치, 주제/요지/제목, 영작(영영풀이), 서술형(문장 변환), 동사 변환
- [ ] 유형별 프롬프트 템플릿 설계
- [ ] 사용자 옵션 반영 로직 (난이도, 출제 범위, 유형 선택)
- [ ] Structured Output 파싱 및 검증
- [ ] 출제 포인트 다변화 검증 로직
- [ ] 지문 활용 형평성 검증 로직

### Phase 3: 학교 기출 DNA 분석
- [ ] 기출문제 업로드 및 구조화
- [ ] 출제 패턴 분석 프롬프트 설계 (선호 어법, 오답 구성, 난이도 분포)
- [ ] 학교별 프로필 저장 스키마 설계
- [ ] 프로필 기반 문제 생성 프롬프트 주입 로직

### Phase 4: 문서 출력 엔진
- [ ] python-docx 기반 .docx 생성 모듈
  - 문제 파트 / 정답 해설 파트 페이지 분리 (add_page_break)
  - 번호 매기기, 선지 포맷, 밑줄/볼드 등 서식 처리
- [ ] .hwpx 출력 지원 (python-hwp 또는 템플릿 기반)
- [ ] 워크북 레이아웃 템플릿
- [ ] 동형 모의고사 레이아웃 템플릿

### Phase 5: 웹 프론트엔드
- [ ] 랜딩 페이지
- [ ] 회원가입 / 로그인 (OAuth + 이메일)
- [ ] 구독 결제 연동 (Stripe 또는 토스페이먼츠)
- [ ] 파일 업로드 UI (드래그 앤 드롭, 다중 파일)
- [ ] 옵션 설정 패널 (난이도, 유형 선택, 출제 범위)
- [ ] 실시간 생성 상태 표시 (SSE / WebSocket)
- [ ] 결과 프리뷰 화면 (문제 미리보기)
- [ ] 파일 다운로드 (.docx / .hwpx)
- [ ] 생성 이력 관리 대시보드

### Phase 6: 백엔드 API
- [ ] 인증/인가 (JWT)
- [ ] 파일 업로드 API (S3 또는 로컬 스토리지)
- [ ] 지문 구조화 요청 API
- [ ] 변형문제 생성 요청 API (비동기 작업 큐)
- [ ] 기출 DNA 분석 API
- [ ] 문서 출력 및 다운로드 API
- [ ] 구독/결제 관리 API
- [ ] 사용량 추적 및 제한 API

### Phase 7: 인프라 및 배포
- [ ] PostgreSQL (사용자, 구독, 생성 이력)
- [ ] Redis (작업 큐, 세션 캐시)
- [ ] S3 호환 스토리지 (업로드 파일, 생성 문서)
- [ ] Celery 또는 유사 비동기 작업 큐
- [ ] 클라우드 배포 (AWS / GCP / Vercel + Railway 등)
- [ ] 모니터링 및 로깅

---

## 4. 기술 스택

| 영역 | 기술 |
|------|------|
| **프론트엔드** | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| **백엔드** | FastAPI (Python 3.11+), Celery, Redis |
| **AI/LLM** | Claude API (claude-sonnet-4-6 / claude-opus-4-6), Vision 입력 |
| **DB** | PostgreSQL, Redis |
| **파일 처리** | python-docx, PyMuPDF (fitz), pdf2image, Pillow |
| **스토리지** | S3 호환 (AWS S3 / MinIO) |
| **인증** | NextAuth.js (프론트), JWT (백엔드) |
| **결제** | 토스페이먼츠 또는 Stripe |
| **배포** | Docker, Vercel (FE), Railway/AWS (BE) |

---

## 5. 코딩 지침 (Coding Guidelines)

### 5.1 프로젝트 구조

```
engenp/
├── frontend/                   # Next.js 앱
│   ├── app/                    # App Router 페이지
│   │   ├── (auth)/             # 로그인/회원가입
│   │   ├── dashboard/          # 대시보드
│   │   ├── generate/           # 문제 생성 워크플로우
│   │   └── api/                # Route Handlers (BFF)
│   ├── components/             # UI 컴포넌트
│   │   ├── ui/                 # shadcn 기본 컴포넌트
│   │   └── domain/             # 도메인 특화 컴포넌트
│   ├── lib/                    # 유틸리티, API 클라이언트
│   └── types/                  # TypeScript 타입 정의
│
├── backend/                    # FastAPI 앱
│   ├── app/
│   │   ├── api/                # API 라우터
│   │   │   ├── auth.py
│   │   │   ├── upload.py
│   │   │   ├── generate.py
│   │   │   └── export.py
│   │   ├── core/               # 설정, 보안, 의존성
│   │   ├── models/             # SQLAlchemy 모델
│   │   ├── schemas/            # Pydantic 스키마
│   │   ├── services/           # 비즈니스 로직
│   │   │   ├── vlm.py          # Claude Vision 연동
│   │   │   ├── structurizer.py # 지문 → JSON 변환
│   │   │   ├── generator.py    # 변형문제 생성
│   │   │   ├── analyzer.py     # 기출 DNA 분석
│   │   │   └── exporter.py     # .docx/.hwpx 출력
│   │   ├── prompts/            # 프롬프트 템플릿 (.txt/.jinja2)
│   │   ├── tasks/              # Celery 비동기 작업
│   │   └── main.py
│   ├── tests/
│   └── alembic/                # DB 마이그레이션
│
├── data/                       # 기준 JSON 데이터 (10개 유형 템플릿)
│   ├── question_types/
│   │   ├── vocabulary_choice.json
│   │   ├── grammar_choice.json
│   │   ├── blank_inference.json
│   │   ├── sentence_ordering.json
│   │   ├── sentence_insertion.json
│   │   ├── content_match.json
│   │   ├── topic_summary.json
│   │   ├── eng_to_eng.json
│   │   ├── sentence_transform.json
│   │   └── verb_transform.json
│   └── school_profiles/        # 학교별 기출 DNA 프로필
│
├── docker-compose.yml
├── .env.example
└── PROJECT_PLAN.md
```

### 5.2 JSON 스키마 규칙

지문 구조화 출력 스키마 (예시):

```json
{
  "passage_id": "2026_shinmok_g1_extra_01",
  "source": "추가지문",
  "title": "The Power of Habit",
  "paragraphs": [
    {
      "index": 0,
      "text": "Habits are the invisible architecture of daily life...",
      "sentences": [
        {
          "index": 0,
          "text": "Habits are the invisible architecture of daily life.",
          "key_grammar": ["metaphor", "subject-verb agreement"],
          "key_vocab": [{"word": "invisible", "meaning": "눈에 보이지 않는"}]
        }
      ]
    }
  ]
}
```

변형문제 출력 스키마 (예시):

```json
{
  "type": "vocabulary_choice",
  "passage_id": "2026_shinmok_g1_extra_01",
  "question_number": 1,
  "difficulty": 3,
  "instruction": "다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?",
  "passage_with_markers": "Habits are the ①invisible architecture of daily life...",
  "choices": null,
  "answer": "③",
  "explanation": "문맥상 'reinforce(강화하다)'가 적절하나, 'undermine(약화시키다)'으로...",
  "test_point": "반의어 변환 - reinforce vs undermine"
}
```

### 5.3 백엔드 코딩 규칙

- **비동기 우선**: 문제 생성은 수십 초 소요. Celery 작업 + SSE로 진행 상태 전달.
- **프롬프트 관리**: 프롬프트는 코드에 하드코딩하지 않고 `prompts/` 디렉토리에 Jinja2 템플릿으로 관리.
- **Claude API 호출 패턴**:
  ```python
  # services/vlm.py
  import anthropic

  client = anthropic.Anthropic()

  async def structurize_passage(image_data: bytes, media_type: str) -> dict:
      """이미지에서 지문을 구조화된 JSON으로 변환"""
      message = client.messages.create(
          model="claude-sonnet-4-6-20250514",
          max_tokens=4096,
          messages=[{
              "role": "user",
              "content": [
                  {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_data}},
                  {"type": "text", "text": STRUCTURIZE_PROMPT}
              ]
          }]
      )
      return parse_json_response(message.content[0].text)
  ```
- **Self-Correction 루프**: 생성된 문항이 원문을 벗어나지 않는지 2차 검증 호출.
  ```python
  async def validate_question(question: dict, original_passage: dict) -> ValidationResult:
      """생성된 문항이 원문 범위 내인지 검증"""
      # 1. 정답이 원문에 실제 존재하는지 확인
      # 2. 선지가 원문 문맥과 일관적인지 확인
      # 3. 출제 포인트가 유형에 적합한지 확인
  ```
- **에러 처리**: Claude API 실패 시 재시도 (exponential backoff). 사용자에게 실패 사유 명확히 전달.
- **Rate Limiting**: 구독 티어별 API 호출 제한. Redis 기반 토큰 버킷.

### 5.4 프론트엔드 코딩 규칙

- **Server Components 기본**: 데이터 페칭은 서버 컴포넌트에서. 인터랙션 필요한 부분만 `"use client"`.
- **파일 업로드**: 드래그 앤 드롭 + 클릭 업로드. PDF/JPG/PNG만 허용. 파일 크기 제한 명시.
- **생성 진행 상태**: SSE(Server-Sent Events)로 단계별 진행률 표시.
  ```
  구조화 중... → 문제 생성 중 (3/10 유형) → 검증 중... → 문서 변환 중... → 완료
  ```
- **결과 프리뷰**: 문제를 카드 형태로 표시. 유형별 필터링, 개별 문항 수정 가능.
- **한국어 UI**: 모든 인터페이스 한국어. 영어 지문/문제 내용만 영어.

### 5.5 프롬프트 엔지니어링 규칙

- 모든 프롬프트는 **버전 관리** 대상. `prompts/v1/`, `prompts/v2/` 등으로 관리.
- 프롬프트 내 **Few-shot 예시**는 기준 JSON 데이터에서 동적으로 주입.
- **출제 제약 조건**은 프롬프트 상단에 명시적으로 배치:
  1. 외부 지문 사용 금지
  2. 지문 활용 형평성
  3. 출제 포인트 다변화
  4. 포맷 일관성
- Structured Output 사용하여 JSON 파싱 안정성 확보.

### 5.6 테스트 전략

- **유닛 테스트**: JSON 스키마 검증, 문서 출력 포맷 검증.
- **통합 테스트**: 실제 지문 이미지 → JSON → 문제 생성 → .docx 출력 E2E.
- **품질 테스트**: 생성된 문항을 현직 강사에게 검수 의뢰. 피드백 반영.
- **회귀 테스트**: 프롬프트 변경 시 기존 테스트 케이스 재실행.

---

## 6. MVP 범위 (최소 기능)

MVP에서 구현할 범위를 명확히 제한:

| 포함 | 제외 (후순위) |
|------|--------------|
| 지문 업로드 (PDF/JPG) | .hwpx 출력 |
| VLM 지문 구조화 | 학교 기출 DNA 분석 |
| 변형문제 생성 (10개 유형 중 3~5개) | 동형 모의고사 |
| .docx 출력 | 구독 결제 |
| 기본 웹 UI | 생성 이력 대시보드 |
| 이메일 로그인 | OAuth 소셜 로그인 |

**MVP 우선 유형 (5개 추천)**:
1. 어휘 선택
2. 어법 선택
3. 빈칸 추론
4. 내용 일치/불일치
5. 동사 변환

---

## 7. 개발 순서 권장

```
1주차: Phase 0 (프로젝트 세팅) + Phase 1 (VLM 구조화 엔진 프로토타입)
2주차: Phase 2 (변형문제 생성 엔진 - MVP 5개 유형)
3주차: Phase 4 (문서 출력) + Phase 6 (핵심 API)
4주차: Phase 5 (프론트엔드 MVP)
5주차: 통합 테스트, 버그 수정, MVP 런칭
```

---

## 8. 환경 변수 (.env)

```env
# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/engenp

# Redis
REDIS_URL=redis://localhost:6379/0

# Storage
S3_BUCKET=engenp-uploads
S3_REGION=ap-northeast-2

# Auth
JWT_SECRET=...
NEXTAUTH_SECRET=...

# App
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```
