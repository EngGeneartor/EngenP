# EngenP - AI 기반 영어 내신 변형 문제 자동 생성 서비스

학교 프린트, 모의고사 지문(JPG, PDF)을 업로드하면 AI(Claude)가 분석하여 고품질 변형 문제, 워크북, 동형 모의고사를 자동 생성하는 구독형 웹 서비스.

## 타겟 사용자

- 영어 내신 단과 강사
- 영어 학원 없이 독학하는 학생

## 주요 기능

- **VLM 기반 지문 구조화**: 이미지/PDF에서 지문, 문제, 선지, 정답을 JSON으로 자동 변환
- **변형 문제 생성**: 10개 표준 유형 (어휘 선택, 어법 선택, 빈칸 추론, 순서 배열, 문장 삽입, 내용 일치/불일치, 주제/요지/제목, 영작, 서술형, 동사 변환)
- **학교 기출 DNA 분석**: 기출문제 업로드 시 출제 패턴, 선호 어법, 오답 구성, 난이도를 분석하여 맞춤형 문제 생성
- **사용자 옵션 제어**: 난이도 1~5단계, 출제 범위, 유형 다중 선택
- **문서 출력**: .docx 파일 자동 생성 (문제 / 정답 해설 분리)

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js, TypeScript, Tailwind CSS, shadcn/ui |
| 백엔드 | FastAPI, Celery, Redis |
| AI/LLM | Claude API (Vision 입력 지원) |
| DB | PostgreSQL |
| 파일 처리 | python-docx, PyMuPDF |

## 시작하기

### 프론트엔드

```bash
npm install
npm run dev
```

`http://localhost:3000`에서 확인.

### 환경 변수

`.env.local` 파일 생성:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

## 프로젝트 구조

```
engenp/
├── app/                  # Next.js App Router
│   ├── layout.tsx        # 루트 레이아웃
│   └── page.tsx          # 메인 페이지 (3컬럼 레이아웃)
├── components/
│   ├── left-sidebar.tsx  # 파일 업로드, 옵션 설정
│   ├── main-content.tsx  # 지문 원문 & 생성된 문제 표시
│   ├── ai-chat-sidebar.tsx # AI Co-pilot 채팅
│   └── ui/               # shadcn/ui 컴포넌트
├── hooks/                # 커스텀 훅
├── lib/                  # 유틸리티
├── public/               # 정적 파일
└── PROJECT_PLAN.md       # 상세 기획 및 코딩 지침
```

## 라이선스

MIT
