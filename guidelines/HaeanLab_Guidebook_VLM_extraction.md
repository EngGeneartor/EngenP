# VLM 기반 영어 지문 데이터 정제 지침서

> 해안연구소 | 2026  
> PDF/이미지 → 순수 영어 코퍼스 → JSON → 변형문제 자동 생성 파이프라인

---

## 개요 (Overview)

본 지침서는 두 단계로 구성된다.

```
[STAGE 1] VLM 추출
  PDF/이미지 → 레이아웃 분석 → 영어 지문 정제 → JSON 코퍼스

[STAGE 2] 문제 자동 생성 (AI_quiz_guideline.md 참조)
  JSON 코퍼스 → 10개 유형 변형문제 → 워드 파일
```

STAGE 1의 결과물(JSON)이 STAGE 2의 입력값이 된다.  
두 파이프라인을 연결하면 **PDF 한 장 → 완성된 워크북**까지 자동화된다.

---

## PART 1 | 목적 (Purpose)

다양한 형태의 교육용 PDF/이미지 파일에서  
학습용 **순수 영어 본문(Prose)** 만을 추출하여  
구조화된 JSON 데이터로 변환한다.

**지원 입력 형태:**
- 2단 구성 (좌본문/우해석, 좌영어/우영어)
- 텍스트 박스, 말풍선, 사이드바
- 표(Table) 안에 분절된 지문
- 멀티 페이지 연속 지문

**목표 출력:**
- 모든 한글 해석·문법 기호·부가 설명이 제거된 깨끗한 영어 코퍼스
- 변형문제 생성 시스템(STAGE 2)에 바로 투입 가능한 JSON 구조

---

## PART 2 | 레이아웃 분석 및 처리 규칙 (Layout Rules)

### 2-1 멀티 컬럼(Column) 처리

| 레이아웃 유형 | 처리 방법 |
|-------------|---------|
| **좌영어 / 우한국어** | 왼쪽 열의 영어 문장만 채택. 오른쪽 열 한국어 해석 완전 무시 |
| **좌영어 / 우영어** | 문맥이 뱀처럼 이어지는지(Snake-flow) 판단 후 논리적 순서로 병합 |
| **표(Table) 형태** | 표 경계를 허물고 문장들을 하나의 연속된 문단으로 통합 |
| **텍스트 박스** | 박스 내부 영어 텍스트만 추출. 박스 테두리·레이블 제거 |
| **1단+2단 혼합** | 시각적 흐름에 따라 영어 문장의 선후 관계를 재구성 |

### 2-2 지문 논리적 병합 (Passage Merging)

```
규칙 1. 동일 소제목 하위의 텍스트는 여러 페이지에 걸쳐 있어도
        하나의 content로 통합한다.

규칙 2. 대화문은 화자 이름(예: "Host:", "Doctor:")을 유지하되
        줄글 형태로 연결한다.

규칙 3. 단락 구분(빈 줄)은 원문 구조를 따른다.
        단, 표/컬럼 분절로 인한 인위적 단락 구분은 제거한다.
```

### 2-3 읽기 순서 판단 기준 (Snake-flow Detection)

```python
# VLM 판단 프롬프트 삽입용 기준
READING_ORDER_RULES = """
다음 기준으로 읽기 순서를 판단하라:

1. 왼쪽 열 마지막 문장이 오른쪽 열 첫 문장과 의미적으로 연결되면
   → Snake-flow: 좌→우 순서로 병합

2. 두 열이 서로 독립된 주제를 다루면
   → 별도 passage_id를 부여하여 독립 처리

3. 판단이 불확실하면 → 별도 passage_id 부여 후 메모 기록
"""
```

---

## PART 3 | 텍스트 정제 규칙 (Cleaning Rules)

### 3-1 반드시 제거해야 할 요소 (Exclude)

| 카테고리 | 제거 대상 |
|---------|---------|
| **번호·기호** | 문장 앞 숫자(①, 01, 1), 원문자(㉑), 타임스탬프((0:11)) |
| **한글 텍스트** | 우리말 해석 전체, 단어 뜻 설명, 문법 설명 |
| **시각적 노이즈** | 분석용 밑줄, 화살표, 취소선, 빈칸 번호(___, [ ]) |
| **부가 정보** | '본문분석', '좌본문 우해석', 저작권 문구, 출판사 정보, 페이지 번호 |
| **어휘 리스트** | 지문 전/후의 단어장, 유의어/반의어 표 |
| **문제 지시문** | "다음 글을 읽고...", "윗글의 내용과 일치하는 것은?" 등 |
| **선택지** | ①②③④⑤ 로 시작하는 문제 선택지 |

### 3-2 유지해야 할 요소 (Include)

| 카테고리 | 유지 대상 |
|---------|---------|
| **제목** | 지문의 소제목, 출처 표기(예: *National Geographic*) |
| **본문** | 완전한 영어 문장 및 문장 부호 (`. , ! ? " ' : ;`) |
| **대화 화자** | "Host:", "Dr. Kim:" 등 화자 레이블 |
| **각주 표기** | *word: 설명 형식의 영어 각주는 별도 필드로 분리 |

### 3-3 경계선 판단 기준

```
[영어 문장 포함 여부 판단 흐름]

텍스트 블록 발견
    │
    ├─ 한글만 있는가? → 제거
    │
    ├─ 영어+한글 혼재인가?
    │       ├─ 영어가 본문, 한글이 해석인가? → 영어만 추출
    │       └─ 영어 어휘 + 한글 뜻인가?    → 전체 제거 (어휘 리스트)
    │
    └─ 영어만 있는가?
            ├─ 지문 본문인가?  → 포함
            └─ 문제 지시문인가? → 제거
```

---

## PART 4 | 데이터 라벨링 및 출력 형식 (Output Format)

### 4-1 필드 정의

| 필드명 | 타입 | 설명 | 예시 |
|-------|------|------|------|
| `school` | string | 문서 내 명시된 학교명 | `"목동고"`, `"신목고"` |
| `grade` | int | 학년 | `1`, `2` |
| `semester` | string | 학기 (명시된 경우) | `"1학기"`, `"중간고사"` |
| `passage_id` | string | 지문 번호 (없으면 순서대로 부여) | `"Unit1-01"`, `"추가지문-02"` |
| `source_title` | string | 지문 제목 또는 핵심 주제 | `"Blue Light & Sleep"` |
| `content` | string | 노이즈 제거된 순수 영어 지문 전문 | (단일 스트링) |
| `footnotes` | array | 영어 각주 리스트 (있는 경우) | `["*platypus: 오리너구리"]` |
| `layout_note` | string | 레이아웃 처리 메모 (선택) | `"2단 Snake-flow 병합"` |

### 4-2 JSON 출력 구조

```json
[
  {
    "school": "목동고",
    "grade": 1,
    "semester": "1학기 중간고사",
    "passage_id": "추가지문-01",
    "source_title": "Blue Light & Melatonin",
    "content": "Light is a mixture of all the colors of the rainbow. Different wavelengths of light are different colors. Blue wavelengths – which help us during the day by improving our mood and increasing our attention span – seem to be the most disruptive at night. Device screens, along with energy-efficient lighting, are increasing the amount of blue wavelengths we are regularly exposed to after sunset. Studies suggest that blue light affects our production of melatonin, a hormone that helps us sleep, more than other types of light. It suppresses melatonin production and damages our sleep patterns.",
    "footnotes": [],
    "layout_note": "단일 컬럼, 노이즈 없음"
  },
  {
    "school": "신목고",
    "grade": 1,
    "semester": "1학기 중간고사",
    "passage_id": "추가지문-01",
    "source_title": "The House with Golden Windows",
    "content": "After working hard all day long, a boy would go up to the top of a hill and look across at another hill. On this far hill stood a house with windows of gold and diamond. They shone at sunset, but after a while, the fascinating light disappeared. The boy supposed that the people in the house closed the shutters because it was dinnertime.",
    "footnotes": [],
    "layout_note": "단일 컬럼"
  }
]
```

### 4-3 다중 지문 처리 예시

```json
[
  {
    "school": "목동고",
    "grade": 1,
    "semester": "1학기 중간고사",
    "passage_id": "추가지문-01",
    "source_title": "Blue Light & Melatonin",
    "content": "...",
    "footnotes": ["*wavelength: 파장"],
    "layout_note": "단일 컬럼"
  },
  {
    "school": "목동고",
    "grade": 1,
    "semester": "1학기 중간고사",
    "passage_id": "추가지문-02",
    "source_title": "The Urgency Instinct",
    "content": "...",
    "footnotes": [],
    "layout_note": "단일 컬럼"
  },
  {
    "school": "목동고",
    "grade": 1,
    "semester": "1학기 중간고사",
    "passage_id": "추가지문-03",
    "source_title": "Bateson and Perspectives",
    "content": "...",
    "footnotes": ["*anthropologist: 인류학자", "*platypus: 오리너구리"],
    "layout_note": "단일 컬럼"
  }
]
```

---

## PART 5 | 예외 상황 대응 (Edge Cases)

| 상황 | 처리 방법 |
|------|---------|
| **제목이 없는 경우** | 첫 문장의 핵심 키워드로 `source_title` 생성 |
| **혼합 레이아웃** | 시각적 흐름 따라 영어 문장 선후 관계 재구성 |
| **Snake-flow 불확실** | 별도 `passage_id` 부여 + `layout_note`에 메모 |
| **표 안의 분절 지문** | 표 경계 제거, 행 순서대로 문장 병합 |
| **OCR 오류 의심 문자** | `[?]` 표기 후 `layout_note`에 위치 기록 |
| **각주 영어 설명** | `footnotes` 배열에 별도 저장 |
| **페이지 경계 분절** | 문장 단위로 이어붙이되 중복 문장 제거 |
| **대화문** | 화자명 유지, 줄바꿈 → 스페이스로 변환 |

---

## PART 6 | VLM 시스템 프롬프트 (복사·붙여넣기용)

### 6-1 기본 추출 프롬프트

```
You are an expert document parser specializing in Korean high school English
educational materials.

Your task:
Extract ONLY the pure English prose from the provided image/PDF page.

Rules:
1. EXTRACT: English sentences, titles, speaker labels in dialogues.
2. IGNORE: Korean text, page numbers, copyright info, exercise numbers,
   answer choices (①②③④⑤), blank lines from exercises, grammar notes,
   vocabulary lists.
3. MERGE: If the layout has two columns (English left, Korean right),
   take only the left column. If both columns are English and form a
   continuous passage (snake-flow), merge them in reading order.
4. PRESERVE: Original paragraph breaks from the source text.
   Remove artificial breaks caused by column/table layout.
5. FOOTNOTES: If there are English footnotes (e.g., *word: definition),
   collect them in the footnotes array separately.

Output format (JSON only, no other text):
{
  "school": "[school name found in document, or null]",
  "grade": [grade number, or null],
  "semester": "[semester info found, or null]",
  "passage_id": "[unit/passage number found, or auto-assigned]",
  "source_title": "[passage title or first-sentence keyword summary]",
  "content": "[clean English prose as single string]",
  "footnotes": ["*word: English explanation", ...],
  "layout_note": "[brief note on layout processing applied]"
}
```

### 6-2 다중 지문 추출 프롬프트

```
You are an expert document parser for Korean high school English materials.

This image may contain MULTIPLE passages. Identify each separate passage
and output them as a JSON array.

For each passage:
- Assign sequential passage_id if not explicitly numbered
- Extract ONLY English prose (no Korean, no exercise content)
- Preserve original paragraph structure
- Note any layout complexity in layout_note

Output format (JSON array only):
[
  {
    "school": "...",
    "grade": ...,
    "semester": "...",
    "passage_id": "...",
    "source_title": "...",
    "content": "...",
    "footnotes": [],
    "layout_note": "..."
  }
]
```

### 6-3 레이아웃별 특화 프롬프트 (추가 조건)

```
# 2단 구성 (좌영어/우한국어) 추가 지시
"The page has a two-column layout. The LEFT column contains English.
The RIGHT column contains Korean translation. Extract ONLY the left column."

# 표 형태 추가 지시
"The passage is split across table rows. Ignore table borders and row
separators. Merge all English text into a single continuous paragraph
in the order the rows appear."

# 대화문 추가 지시
"This is a dialogue. Keep speaker labels (e.g., 'Host:', 'Doctor:')
but convert all line breaks within a single speaker's turn into spaces."
```

---

## PART 7 | Python 구현 코드

### 7-1 Anthropic API를 이용한 추출

```python
import anthropic
import base64
import json
from pathlib import Path

client = anthropic.Anthropic(api_key="YOUR_API_KEY")

SYSTEM_PROMPT = """
You are an expert document parser for Korean high school English materials.
Extract ONLY pure English prose. Output JSON only, no other text.
"""

EXTRACTION_PROMPT = """
Extract all English passages from this image.

Rules:
1. EXTRACT: English sentences, titles, speaker labels.
2. IGNORE: Korean text, page numbers, exercise numbers,
   answer choices, vocabulary lists, grammar notes.
3. MERGE columns/tables into continuous prose.
4. PRESERVE original paragraph breaks.

Output (JSON array only):
[
  {
    "school": null,
    "grade": null,
    "semester": null,
    "passage_id": "01",
    "source_title": "...",
    "content": "...",
    "footnotes": [],
    "layout_note": "..."
  }
]
"""

def extract_from_image(image_path: str, school: str = None,
                        grade: int = None) -> list[dict]:
    """이미지에서 영어 지문 추출"""
    image_data = base64.standard_b64encode(
        Path(image_path).read_bytes()
    ).decode("utf-8")

    suffix = Path(image_path).suffix.lower()
    media_types = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png",  ".gif": "image/gif",
        ".webp": "image/webp"
    }
    media_type = media_types.get(suffix, "image/jpeg")

    response = client.messages.create(
        model="claude-opus-4-6",   # 레이아웃 분석은 Opus 권장
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_data,
                    },
                },
                {"type": "text", "text": EXTRACTION_PROMPT}
            ],
        }]
    )

    raw = response.content[0].text.strip()

    # JSON 파싱 (코드블록 제거)
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    passages = json.loads(raw.strip())

    # 학교·학년 메타데이터 보완
    for p in passages:
        if school and not p.get("school"):
            p["school"] = school
        if grade and not p.get("grade"):
            p["grade"] = grade

    return passages


def extract_from_pdf(pdf_path: str, school: str = None,
                     grade: int = None) -> list[dict]:
    """PDF를 페이지별로 처리하여 전체 추출"""
    import fitz  # pip install pymupdf

    doc = fitz.open(pdf_path)
    all_passages = []
    passage_counter = 1

    for page_num, page in enumerate(doc):
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("png")
        image_data = base64.standard_b64encode(img_bytes).decode("utf-8")

        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": image_data,
                        },
                    },
                    {"type": "text", "text": EXTRACTION_PROMPT}
                ],
            }]
        )

        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        try:
            passages = json.loads(raw.strip())
        except json.JSONDecodeError:
            print(f"⚠️  페이지 {page_num+1} JSON 파싱 실패 — 건너뜀")
            continue

        for p in passages:
            if school and not p.get("school"):
                p["school"] = school
            if grade and not p.get("grade"):
                p["grade"] = grade
            if not p.get("passage_id"):
                p["passage_id"] = str(passage_counter).zfill(2)
            p["page"] = page_num + 1
            passage_counter += 1
            all_passages.append(p)

        print(f"✅ 페이지 {page_num+1}: {len(passages)}개 지문 추출")

    doc.close()
    return all_passages


def save_corpus(passages: list[dict], output_path: str):
    """코퍼스 JSON 저장"""
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(passages, f, ensure_ascii=False, indent=2)
    print(f"💾 저장 완료: {output_path} ({len(passages)}개 지문)")
```

### 7-2 전체 파이프라인 실행

```python
def run_extraction_pipeline(
    input_path: str,
    output_path: str,
    school: str,
    grade: int
):
    """
    STAGE 1: PDF/이미지 → 영어 코퍼스 JSON
    """
    path = Path(input_path)

    if path.suffix.lower() == ".pdf":
        passages = extract_from_pdf(str(path), school, grade)
    elif path.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]:
        passages = extract_from_image(str(path), school, grade)
    else:
        raise ValueError(f"지원하지 않는 파일 형식: {path.suffix}")

    save_corpus(passages, output_path)
    return passages


# 실행 예시
if __name__ == "__main__":
    passages = run_extraction_pipeline(
        input_path  = "목동고_1학년_중간고사.pdf",
        output_path = "mokdong_corpus.json",
        school      = "목동고",
        grade       = 1
    )

    print(f"\n추출 완료: {len(passages)}개 지문")
    for p in passages:
        print(f"  [{p['passage_id']}] {p['source_title']}")
        print(f"       {p['content'][:60]}...")
```

---

## PART 8 | STAGE 2 연결 (문제 자동 생성)

STAGE 1에서 생성된 JSON을 STAGE 2(AI_quiz_guideline.md)에 입력하여  
10가지 유형의 변형문제를 자동 생성한다.

### 8-1 연결 인터페이스

```python
def passage_to_quiz_input(passage: dict) -> str:
    """
    VLM 추출 JSON → 문제 생성 시스템 입력 텍스트 변환
    """
    lines = []

    # 제목
    lines.append(f"# {passage['source_title']}")
    lines.append("")

    # 각주가 있으면 지문 아래에 표기
    lines.append(passage["content"])

    if passage.get("footnotes"):
        lines.append("")
        for fn in passage["footnotes"]:
            lines.append(fn)

    return "\n".join(lines)


def run_full_pipeline(
    input_pdf: str,
    school: str,
    grade: int,
    quiz_types: list[str] = None  # None이면 전체 10개
):
    """
    STAGE 1 + STAGE 2 통합 실행
    PDF → 코퍼스 → 변형문제 워드 파일
    """
    # STAGE 1: 추출
    corpus_path = f"{school}_corpus.json"
    passages = run_extraction_pipeline(input_pdf, corpus_path, school, grade)

    # STAGE 2: 문제 생성 (AI_quiz_guideline.md의 generate_quiz 함수 참조)
    for passage in passages:
        passage_text = passage_to_quiz_input(passage)
        passage_id   = passage["passage_id"]

        # AI_quiz_guideline.md의 TYPES 및 build_docx 함수 호출
        # (해당 파일의 PART 7 참조)
        generate_all_types(
            passage   = passage_text,
            school    = school,
            passage_id= passage_id,
            types     = quiz_types
        )
```

### 8-2 파일명 연동 규칙

```
STAGE 1 출력:  {school_code}_corpus.json
               예) mokdong_corpus.json

STAGE 2 출력:  {school_code}_{passage_id}_{type_code}.docx
               예) mokdong_추가지문01_01_vocab.docx
                   mokdong_추가지문01_08_wordorder.docx

합본:          {school_code}_{passage_id}_combined.docx
               예) mokdong_추가지문01_combined.docx
```

---

## PART 9 | 품질 검증 (Quality Check)

### 9-1 자동 검증 스크립트

```python
def validate_corpus(corpus_path: str) -> dict:
    """추출된 코퍼스 품질 검증"""
    import re

    with open(corpus_path, encoding="utf-8") as f:
        passages = json.load(f)

    issues = []

    for p in passages:
        pid = p.get("passage_id", "?")

        # 한글 잔존 여부 확인
        korean = re.findall(r'[가-힣]+', p["content"])
        if korean:
            issues.append({
                "passage_id": pid,
                "type": "한글 잔존",
                "detail": korean[:5]
            })

        # 문장 번호 잔존 여부
        numbers = re.findall(r'^[①-⑩\d]+\s', p["content"], re.MULTILINE)
        if numbers:
            issues.append({
                "passage_id": pid,
                "type": "번호 잔존",
                "detail": numbers[:3]
            })

        # content 비어있는지
        if not p["content"].strip():
            issues.append({
                "passage_id": pid,
                "type": "content 비어있음",
                "detail": ""
            })

        # 최소 길이 (50자 미만이면 의심)
        if len(p["content"]) < 50:
            issues.append({
                "passage_id": pid,
                "type": "content 너무 짧음",
                "detail": f"{len(p['content'])}자"
            })

    result = {
        "total": len(passages),
        "issues": len(issues),
        "issue_list": issues
    }

    if issues:
        print(f"⚠️  검증 이슈 {len(issues)}건:")
        for issue in issues:
            print(f"  [{issue['passage_id']}] {issue['type']}: {issue['detail']}")
    else:
        print(f"✅ 검증 통과: {len(passages)}개 지문 모두 정상")

    return result
```

### 9-2 검증 항목 체크리스트

```
□ 한글 텍스트가 content에 남아있지 않은가?
□ 문장 번호(①, 01, 1.)가 제거되었는가?
□ 선택지(①②③④⑤)가 제거되었는가?
□ passage_id가 중복되지 않는가?
□ source_title이 비어있지 않은가?
□ content가 50자 이상인가?
□ 페이지 번호, 저작권 문구가 제거되었는가?
□ Snake-flow 병합이 올바르게 이루어졌는가?
□ 각주(footnotes)가 content와 분리되었는가?
```

---

## PART 10 | 권장 워크플로우

```
STEP 1.  입력 파일 준비
         PDF 또는 이미지 파일을 준비한다.
         학교명, 학년, 학기 정보를 확인한다.

STEP 2.  STAGE 1 실행 (VLM 추출)
         run_extraction_pipeline() 호출
         → {school}_corpus.json 생성

STEP 3.  품질 검증
         validate_corpus() 실행
         → 이슈 발생 시 해당 passage 수동 보정

STEP 4.  STAGE 2 연결 (문제 생성)
         AI_quiz_guideline.md의 파이프라인에
         corpus.json을 입력으로 투입

STEP 5.  워드 파일 생성 및 합본
         유형별 docx 생성 → combined.docx 합본
```

---

## 부록 | 지원 VLM 모델

| 모델 | 레이아웃 분석 | 한/영 구분 | 권장 용도 |
|------|------------|---------|---------|
| claude-opus-4-6 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 복잡한 2단·표 레이아웃 |
| claude-sonnet-4-6 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 단순 레이아웃, 비용 절감 |
| GPT-4o | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 대안 모델 |
| Gemini Pro Vision | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 대안 모델 |

> 복잡한 레이아웃(2단 + 표 + 텍스트박스 혼합)은 **claude-opus-4-6** 권장

---

*본 지침서는 해안연구소 AI 출제 시스템의 내부 사용 문서입니다.*  
*STAGE 2 문제 생성은 AI_quiz_guideline.md를 참조하십시오.*
