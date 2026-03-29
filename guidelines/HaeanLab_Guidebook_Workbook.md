# AI 출제 시스템 — 영어 내신 변형문제 자동 생성 지침서

> 해안연구소 | 2026  
> 10가지 유형 · 전수문제집 지원 · Anthropic API 자동화 대응

---

## PART 1 | 시스템 개요

### 1-1 유형 구성표

| # | 유형명 | 기본 문항 수 | 지문 범위 옵션 | 전수 가능 |
|---|--------|------------|--------------|---------|
| 01 | 어휘 선택 | 6문항 | 일부 / 전수(문단 단위) | ✅ |
| 02 | 어법 선택 | 6문항 | 일부 / 전수(문단 단위) | ✅ |
| 03 | 동사 변형 | 전수 | 전수(문장 단위·모든 동사) | ✅ 기본 |
| 04 | 어법 오류 수정 | 6문항 | 일부 / 전수(문단 단위) | ✅ |
| 05 | 내용일치 TF | 6문항 | 일부 / 전수(문단 단위) | ✅ |
| 06 | 순서배열 | 6문항 | 일부 / 전수(문단 단위) | ✅ |
| 07 | 문장삽입 | 6문항 | 일부 / 전수(문단 단위) | ✅ |
| 08 | 단어배열 | 전수 | 전수(문장 단위) | ✅ 기본 |
| 09 | 해석 쓰기 | 전수 | 전수(문장 단위) | ✅ 기본 |
| 10 | 영작 | 전수 | 전수(문장 단위) | ✅ 기본 |

### 1-2 핵심 원칙

1. **철저한 지문 근거** — 지문 외 문장·정보 추가·변형 절대 금지
2. **지문 전체 포함(Full Context)** — 어휘/어법/오류수정/TF/순서/삽입 6개 유형은 지문 전체가 문제 지문에 포함
3. **선택지 확장** — 학습 효과 극대화를 위해 한 문항 내 7~8개 이상 선택지 생성 가능
4. **전 문장 문제화** — 영작/단어배열/해석쓰기/동사변형은 모든 문장을 순서대로 빠짐없이 문제화
5. **출제 포인트 다변화** — 동일 유형 내 정답 포인트 중복 금지
6. **파일명** — 반드시 영문 파일명 사용 (한글 파일명은 macOS 인코딩 오류 발생)
7. **워드 양식** — 아래 PART 3의 디자인 스펙을 코드에 직접 적용

---

## PART 2 | 워드 파일 공통 디자인 스펙 (코드 적용 기준)

모든 유형의 워드 파일은 아래 스펙을 `python-docx` 또는 `docx` (Node.js) 코드에 직접 반영한다.

### 2-1 페이지 설정

```python
from docx.shared import Cm, Pt
from docx.enum.text import WD_LINE_SPACING

# 페이지 크기: A4
section.page_width  = Cm(21.0)   # 21cm
section.page_height = Cm(29.7)   # 29.7cm

# 여백
section.top_margin    = Cm(2.5)
section.bottom_margin = Cm(2.5)
section.left_margin   = Cm(2.0)
section.right_margin  = Cm(2.0)
```

### 2-2 폰트 및 줄 간격

```python
# 기본 폰트
FONT_KO = "KoPubWorldDotum_Pro"   # 한글
FONT_EN = "Arial"                  # 영문·숫자

# 줄 간격: 1.4배 (auto)
paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
paragraph_format.line_spacing      = 1.4
```

### 2-3 색상 팔레트

```python
NAVY  = "1B2A4A"   # 제목, 문항 번호, 헤더 텍스트
GOLD  = "B8962E"   # 포인트 레이블, 섹션 강조
GREEN = "1A6B3C"   # 정답 텍스트
RED   = "CC0000"   # 오류 표현
GRAY  = "888888"   # 지시문 이탤릭, 보조 텍스트
WHITE = "FFFFFF"   # 헤더·배너 내 텍스트
```

### 2-4 헤더 / 푸터

```python
# 헤더 (단일 단락, 좌우 탭)
# 좌: "[학교명] 영어 내신 대비"  (9pt, GRAY)
# 우: "유형: [유형명] | [지문명]"  (9pt, NAVY, bold)
# 하단: NAVY 실선 구분선 (0.75pt)

# 푸터 (단일 단락, 가운데 정렬)
# "해안연구소  |  [페이지번호]"  (8.5pt, GRAY)
# 상단: GRAY 실선 구분선 (0.5pt)
```

### 2-5 문서 구조 (모든 유형 공통)

```
[문제 파트]
  - pageTitle: "[ 문  제 ]"  → 13pt, bold, NAVY, 가운데 정렬
  - 유형명 레이블              → 10.5pt, bold, NAVY
  - 지시문                    → 10pt, GRAY, 이탤릭
  - [유형별 문항 내용]
  - 문항 사이: thinDivider (DDDDDD 실선 0.5pt)

[PageBreak]

[정답 및 해설 파트]
  - pageTitle: "[ 정답 및 해설 ]"
  - 유형명 레이블
  - [유형별 정답 내용]
```

### 2-6 섹션 배너 (전수문제집용)

```python
# 앞부분 / 중간부분 / 뒷부분 구분용
# 배경: NAVY, 텍스트: WHITE, 10pt, bold
# 여백: 상하 200/80 DXA, 좌 들여쓰기 160 DXA
```

---

## PART 3 | 유형별 워드 출력 스펙 (상세)

---

### 유형 01 · 02 | 어휘 선택 / 어법 선택

#### 문제 파트

```python
# 문항 헤더 (문항마다)
# "문항 01  추가지문 1 — 제목  [포인트: xxx]"
# 11pt, bold, NAVY / 9pt GRAY / 8.5pt GOLD 이탤릭

# 본문 단락 (지문 전체를 하나의 단락으로)
# - 정상 텍스트: Arial, 10pt, justified
# - 선택지 자리: " [ A / B ] " 형태로 삽입
#   → 밑줄(SINGLE), bold, Arial, 10pt
# - 들여쓰기: left=200, right=200 (DXA)
# - 줄 간격: 1.4배

# 예시 run 구성:
#   run("Blue wavelengths – which help us ", normal)
#   run(" [ improving / worsening ] ",       underline+bold)
#   run(" our mood and ",                    normal)
```

#### 정답 파트

```python
# 【정답】 레이블 + 정답 텍스트
# 정답: 10pt, bold, GREEN
# 5개씩 줄 나누기 (정답이 6개 이상일 때)

# 【해설】 레이블 + 번호별 해설
# "  [1] improving : 낮 동안 기분을 '개선'..."  9.5pt, BLACK
```

---

### 유형 03 | 동사 변형

> **핵심**: 문장 내 모든 동사를 추출하여 4열 표로 제시

#### 문제 파트

```python
# 문장 번호 + 원문 ([  ] 표시된 동사 포함)
# "01.  After [work] hard all day long, a boy [would / go] up..."
# 11pt bold NAVY 번호 + 10pt 본문, justified

# 4열 표 (문항마다 개별 표)
# 열 너비 (전체 8400 DXA 기준):
#   번호:     700 DXA
#   제시원형: 2400 DXA
#   문법포인트: 2600 DXA
#   정답:     2700 DXA   ← 문제 파트는 빈칸
#
# 표 헤더: NAVY 배경, WHITE 텍스트, 9pt bold
# 데이터 행: 교차 배경 (F0F4FA / WHITE)
# 셀 내부 여백: top/bottom 60, left/right 100 (DXA)
```

#### 정답 파트

```python
# 동일한 4열 표에 정답(GREEN, bold) 채움
# 섹션 배너로 앞/중간/뒤 구분
# 맨 위에 "✅ 전체 XX문장 · XX개 동사항목 전수 완료" 표기
```

---

### 유형 04 | 어법 오류 수정

#### 문제 파트

```python
# 본문: (A)~(C/D) 레이블 + 밑줄 구간
# 레이블: "(A) " → 9.5pt, bold, GOLD
# 밑줄 구간: Arial, 10pt, SINGLE 밑줄
# 지문 들여쓰기: left=200, right=200

# 지시문: "※ 위 글의 밑줄 친 (A)~(C) 중 어법상 틀린 것을 모두 찾아..."
# 9.5pt, GRAY, 이탤릭

# 3열 답안 표 (빈칸):
#   기호:      800 DXA  (NAVY 헤더)
#   틀린표현: 3300 DXA  (문제 시 빈칸)
#   올바른표현: 3300 DXA  (문제 시 빈칸)
```

#### 정답 파트

```python
# 동일 3열 표에:
#   틀린표현: RED 텍스트
#   올바른표현: GREEN bold 텍스트
# 【정상 항목】: GRAY 텍스트로 정상인 항목 명시
# 【해설】: 번호별 설명
```

---

### 유형 05 | 내용일치 TF

#### 문제 파트

```python
# 【지문】 레이블 후 지문 문장들
# 지문 단락: Arial 10pt, justified, left=200, right=200
# 좌측 세로선(선택): NAVY, SINGLE, 0.75pt (가독성 향상)

# 【진술문】 레이블 후 3열 표:
#   번호:   500 DXA
#   진술문: 7000 DXA  (Arial 10pt, justified)
#   T/F:    800 DXA   (문제: "T / F" GRAY, 가운데)
```

#### 정답 파트

```python
# 동일 3열 표 (너비 약간 조정):
#   번호:   500 DXA
#   진술문: 6200 DXA  (9.5pt, GRAY)
#   T/F:    800 DXA
#     T → GREEN bold, 배경 E8F5E9 (연초록)
#     F → RED bold,   배경 FFEBEE (연빨강)
# 【해설】: 번호별 근거 포함 설명
```

---

### 유형 06 | 순서배열

#### 문제 파트

```python
# 【도입】 레이블 + 도입 문장들 (left=200, right=200)

# (A) (B) (C) 블록:
#   레이블: "(A)" → 11pt, bold, GOLD
#   본문: Arial 10pt, justified, left=360 (도입보다 더 들여쓰기)

# 정답 표 (빈칸):
#   "정답 순서" | "(   )  -  (   )  -  (   )"
#   2열, 2200+3800 DXA
#   헤더: NAVY 배경, WHITE 텍스트
#   정답란: 빈칸 시 GRAY "( )" 텍스트
```

#### 정답 파트

```python
# 동일 표에 정답 채움: GREEN bold
# 4블록일 경우: "(   )  -  (   )  -  (   )  -  (   )"
# 【해설】: 각 연결 단계별 설명 (도입→A→B→C)
```

---

### 유형 07 | 문장삽입

#### 문제 파트

```python
# 【삽입할 문장】 레이블
# 삽입 문장 박스:
#   상단/하단 GOLD 실선 (0.75pt)
#   Arial 10pt, bold
#   들여쓰기: left=200, right=200

# 【본문】 레이블
# 본문 단락 (인라인으로 번호 태그 삽입):
#   일반 텍스트: Arial 10pt
#   번호 태그 "(1)"~"(5)": 10pt, bold, RED
#   → 하나의 단락에 run을 번갈아 삽입

# 정답 표 (빈칸):
#   "삽입 위치" | "  (     )번"
#   2열, 2000+3000 DXA
```

#### 정답 파트

```python
# 【삽입 문장】: GREEN bold로 재표시
# 정답 표 채움: "(③)번" → GREEN bold
# 【해설】: 직전/삽입/직후 연결 논리 + 오답 근거
```

---

### 유형 08 | 단어배열

> **핵심**: 정답 작성란의 너비가 충분해야 함

#### 문제 파트

```python
# 문항 구성 (문장마다):
#
# [1] 문항 번호 + 한국어 해석
#     "01.  빛은 무지개의 모든 색깔의 혼합물이다."
#     → 11pt bold NAVY 번호 + 10pt 한국어
#
# [2] 보기 단어 (/ 구분)
#     "보 기  word1  /  word2  /  word3  ..."
#     → "보 기" 9.5pt bold NAVY
#     → 단어들 9.5pt GRAY, Arial
#     → 들여쓰기: left=280
#
# [3] 정답 작성란 (밑줄 1줄)
#     "→  ____________...____________"
#     → "→" GRAY, 밑줄은 DDDDDD 색 언더스코어 문자열
#     → 들여쓰기: left=160
#     ★ 중요: 밑줄 길이는 페이지 우측 여백까지 충분히 늘릴 것
#        (A4 기준 약 80~90자 언더스코어 또는 border-bottom 활용)
#        실제 구현: right_margin까지 채우는 paragraph border bottom 방식 권장
#
# 문항 사이: thinDivider
```

**정답 작성란 구현 방법 (권장)**

```python
# 방법 A: 언더스코어 문자열 (간단하지만 길이 고정)
run = para.add_run("→  " + "_" * 85)
run.font.color.rgb = RGBColor(0xDD, 0xDD, 0xDD)

# 방법 B: 단락 하단 테두리 (가변 너비, 권장)
from docx.oxml.ns import qn
from lxml import etree
pPr = para._p.get_or_add_pPr()
pBdr = etree.SubElement(pPr, qn('w:pBdr'))
bottom = etree.SubElement(pBdr, qn('w:bottom'))
bottom.set(qn('w:val'), 'single')
bottom.set(qn('w:sz'), '6')
bottom.set(qn('w:space'), '1')
bottom.set(qn('w:color'), 'DDDDDD')
# → 단락 전체 너비에 맞는 하단 선이 작성란 역할
```

#### 정답 파트

```python
# 한국어 해석 (GRAY 이탤릭) + 정답 영문 (GREEN bold)
# 섹션 배너로 앞/중간/뒤 구분
# "✅ 전체 XX개 문장 전수 완료" 표기
```

---

### 유형 09 | 해석 쓰기

#### 문제 파트

```python
# [1] 문항 번호 + 영문 (굵게, NAVY)
#     "01.  Light is a mixture of all the colors of the rainbow."
#     → 11pt bold NAVY 번호 + 10pt bold NAVY 영문, justified
#
# [2] 정답 작성란 (2줄)
#     방법 B (단락 하단 테두리) 2개 연속
#     spacing: before=26, after=26
#     → 2줄 여백으로 한국어 해석 충분히 쓸 수 있게
```

#### 정답 파트

```python
# 영문 (GRAY 이탤릭, 9pt) + 한국어 정답 (GREEN bold, 10pt)
```

---

### 유형 10 | 영작

#### 문제 파트

```python
# [1] 문항 번호 + 한국어 (굵게, NAVY)
#     "01.  빛은 무지개의 모든 색깔의 혼합물이다."
#     → 11pt bold NAVY 번호 + 10pt bold NAVY 한국어
#
# [2] 정답 작성란 (2줄)
#     유형 09와 동일하게 2줄 작성란
```

#### 정답 파트

```python
# 한국어 (GRAY 이탤릭, 9pt) + 영문 정답 (GREEN bold, 10pt, Arial)
```

---

## PART 4 | 마스터 프롬프트

### 4-1 기본 마스터 프롬프트

```
# Role: 영어 교육 콘텐츠 제작 전문가

# Task:
첨부한 지문 텍스트와 JSON 데이터를 기반으로
영어 내신 변형문제를 생성하고 워드(.docx) 파일로 추출한다.

# 핵심 원칙:
1. 지문 외 문장·정보 추가·변형 절대 금지.
2. 어휘/어법/오류수정/TF/순서/삽입 6개 유형은 지문 전체 포함.
3. 한 문항 내 7~8개 이상 선택지 생성 가능.
4. 영작/단어배열/해석쓰기/동사변형은 모든 문장 순서대로 전수 문제화.
5. 동일 유형 내 정답 포인트 중복 금지.
6. 파일명: 반드시 영문 파일명 사용.
7. 워드 양식: 이 지침서의 PART 2~3 스펙을 코드에 직접 반영.

# 진행 방식:
- 유형별로 1개씩 순서대로 진행.
- 각 유형 문항 생성 후 화면 출력 → 사용자 확인 → 워드 생성.

# 진행 순서:
1. 어휘 선택 → 2. 어법 선택 → 3. 동사 변형 → 4. 어법 오류 수정
→ 5. 내용일치 TF → 6. 순서배열 → 7. 문장삽입
→ 8. 단어배열 → 9. 해석 쓰기 → 10. 영작

# 파일명 규칙:
[학교코드]_[유형번호]_[유형명].docx
예시: sinmok_01_vocab.docx
```

### 4-2 커스터마이징 설정 (문항 수 · 지문 범위)

```
# 문항 설정표 — 아래를 직접 수정하여 사용
# ──────────────────────────────────────────────────
# 유형명         | 문항 수         | 지문 범위
# ──────────────────────────────────────────────────
# 어휘 선택      | 6문항           | 일부
# 어법 선택      | 6문항           | 일부
# 동사 변형      | 전수(모든 문장)  | 전수(모든 동사)
# 어법 오류 수정 | 6문항           | 일부
# 내용일치 TF   | 전수(문단 단위)  | 전수(8선지/문단)
# 순서배열       | 6문항           | 일부
# 문장삽입       | 6문항           | 일부
# 단어배열       | 전수(모든 문장)  | 전수
# 해석 쓰기      | 전수(모든 문장)  | 전수
# 영작           | 전수(모든 문장)  | 전수
# ──────────────────────────────────────────────────
#
# 변경 방법:
#   문항 수: 원하는 숫자로 변경 (예: 6문항 → 4문항)
#   지문 범위: '일부' 또는 '전수'로 변경
```

---

## PART 5 | 전수문제집 전환 프롬프트

### 어휘·어법·오류수정·TF·순서·삽입 → 전수 전환

```
[유형명] 유형의 문제를 전수문제집으로 다시 만들어줘.

방식: 지문을 적절한 문단 단위로 끊어 전체를 빠짐없이 다뤄줘.
      (모든 문단이 최소 1문항에 포함되어야 함)

추가 조건:
- 문단 수에 맞게 문항 수 자동 조정
- 각 문항 출제 포인트 다변화
- 워드파일 생성 전 문항 내용 먼저 출력하여 확인받을 것
- 영문 파일명으로 저장
- 이 지침서 PART 2~3의 워드 스펙 적용
```

### 동사변형 → 전수(모든 동사 추출)

```
동사 변형 유형의 문제를 전수문제집으로 만들어줘.

방식: 모든 문장을 순서대로 문제화.
      각 문장 안의 동사가 2개 이상이면 모두 추출.

출력 형식: 4열 표 (번호 / 제시원형 / 문법포인트 / 정답)
           열 너비: 700 / 2400 / 2600 / 2700 DXA
파일명: [학교코드]_verb_full.docx
```

---

## PART 6 | 합치기 프롬프트

10개 유형 파일 생성 완료 후, 하나의 파일로 합칠 때 사용한다.

### 합치기 규칙

| 규칙 | 내용 |
|------|------|
| 문항 번호 연속 | 2번 유형의 첫 문항 번호 = 1번 유형의 마지막 번호 + 1 |
| 전반부 [문제] | 10개 유형 문제만 순서대로 이어붙임, 유형 구분 배너 삽입 |
| 후반부 [정답] | 10개 유형 정답·해설 순서대로, PageBreak로 문제와 분리 |
| 파일명 | `[학교코드]_전체합본.docx` |

### 합치기 실행 프롬프트

```
# Task: 유형별 변형문제 파일 합치기

첨부된 10개 유형 파일을 하나의 워드 파일로 합쳐줘.

# 합치기 규칙:
1. 문항 번호 연속:
   각 유형의 문항 번호는 이전 유형의 마지막 번호 +1부터 시작.
   예) 어휘선택 01~06 → 어법선택 07번부터 시작.

2. 전반부 [문제 파트]:
   10개 유형 문제를 순서대로 이어붙임.
   각 유형 시작 전 구분 배너 삽입:
     "▶ 유형 01 | 어휘 선택  /  문항 01~06"

3. PageBreak

4. 후반부 [정답 및 해설 파트]:
   10개 유형 정답·해설 순서대로 이어붙임.
   동일한 구분 배너 삽입.

5. 헤더: "[학교명] 영어 내신 대비 | 전체 합본"
   파일명: [학교코드]_전체합본.docx (영문)
   양식: 이 지침서 PART 2 스펙 유지
```

### 합본 파일 구조 예시

```
┌─────────────────────────────────────────────┐
│              [ 문  제 ]                      │
├─────────────────────────────────────────────┤
│  ▶ 유형 01 | 어휘 선택  /  문항 01~06       │
│    문항 01 ~ 문항 06                         │
│  ─────────────────────────────────────────  │
│  ▶ 유형 02 | 어법 선택  /  문항 07~12       │
│    문항 07 ~ 문항 12                         │
│  ─────────────────────────────────────────  │
│  ▶ 유형 03 | 동사 변형  /  문항 13~47       │
│    ...                                       │
├─────────────────────────────────────────────┤
│              ── PageBreak ──                 │
├─────────────────────────────────────────────┤
│           [ 정답 및 해설 ]                   │
├─────────────────────────────────────────────┤
│  ▶ 유형 01 | 어휘 선택  /  문항 01~06       │
│    정답 + 해설                               │
│  ─────────────────────────────────────────  │
│  ▶ 유형 02 | 어법 선택  /  문항 07~12       │
│    ...                                       │
└─────────────────────────────────────────────┘
```

---

## PART 7 | API 자동화 구현 가이드

### 7-1 권장 스택

```
- 언어: Python 3.10+
- 워드 생성: python-docx 1.1+
- AI 호출: anthropic 0.25+ (claude-sonnet-4-5 권장)
- 의존성: pip install anthropic python-docx lxml
```

### 7-2 자동화 파이프라인 구조

```python
import anthropic
from docx import Document

client = anthropic.Anthropic(api_key="YOUR_API_KEY")

TYPES = [
    ("01", "어휘 선택",    "vocab"),
    ("02", "어법 선택",    "grammar"),
    ("03", "동사 변형",    "verb"),
    ("04", "어법 오류 수정","error"),
    ("05", "내용일치 TF",  "tf"),
    ("06", "순서배열",     "order"),
    ("07", "문장삽입",     "insert"),
    ("08", "단어배열",     "wordorder"),
    ("09", "해석 쓰기",    "translation"),
    ("10", "영작",         "writing"),
]

def generate_quiz(passage: str, type_name: str, config: dict) -> dict:
    """AI 호출로 문항 데이터 생성 (JSON 반환)"""
    prompt = build_prompt(passage, type_name, config)
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=8096,
        messages=[{"role": "user", "content": prompt}]
    )
    return parse_json_response(response.content[0].text)

def build_docx(quiz_data: dict, type_code: str, school_code: str) -> str:
    """유형별 스펙에 맞는 워드 파일 생성"""
    doc = Document()
    apply_page_settings(doc)       # PART 2-1 적용
    apply_styles(doc)              # PART 2-2~2-4 적용
    add_header_footer(doc, ...)    # PART 2-4 적용
    add_question_part(doc, quiz_data)   # PART 3 유형별 스펙
    add_page_break(doc)
    add_answer_part(doc, quiz_data)
    filename = f"{school_code}_{type_code}_{type_code}.docx"
    doc.save(filename)
    return filename

def run_pipeline(passage: str, school_code: str, config: dict):
    """전체 10개 유형 자동 생성"""
    for num, name, code in TYPES:
        quiz_data = generate_quiz(passage, name, config)
        filename  = build_docx(quiz_data, num, school_code)
        print(f"✅ {filename} 완료")
```

### 7-3 유형별 AI 프롬프트 템플릿 (JSON 출력 강제)

```python
PROMPTS = {
    "어휘 선택": """
다음 지문을 바탕으로 어휘 선택 문항을 {count}개 생성하라.
지문 범위: {scope}
지문:
{passage}

출력 형식 (JSON만, 다른 텍스트 없이):
{{
  "유형": "어휘 선택",
  "문항": [
    {{
      "번호": "01",
      "source": "추가지문 1 — 앞부분",
      "point": "감각/효과 관련 어휘",
      "segs": [
        {{"t": "일반 텍스트"}},
        {{"b": "선택지A / 선택지B"}},
        ...
      ],
      "answers": ["① 정답A", "② 정답B"],
      "exps": ["[1] 정답A: 해설...", "[2] 정답B: 해설..."]
    }}
  ]
}}
""",

    "단어배열": """
다음 지문의 모든 문장을 순서대로 단어배열 문항으로 만들어라.
지문:
{passage}

출력 형식 (JSON만):
{{
  "유형": "단어배열",
  "sentences": [
    {{
      "num": "01",
      "korean": "한국어 해석",
      "words": ["word1", "word2", ...],
      "answer": "완전한 영어 문장"
    }}
  ]
}}
""",
    # ... 나머지 유형도 동일 패턴
}
```

### 7-4 단어배열 작성란 구현 (핵심)

```python
from docx.oxml.ns import qn
from lxml import etree

def add_answer_line(doc, para=None):
    """
    단어배열/해석쓰기/영작의 작성란.
    언더스코어 방식이 아닌 단락 하단 테두리 방식 사용.
    → 페이지 너비에 자동으로 맞춰짐.
    """
    if para is None:
        para = doc.add_paragraph()

    # 화살표 표시
    run = para.add_run("→  ")
    run.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

    # 단락 하단 테두리로 작성선 구현
    pPr = para._p.get_or_add_pPr()
    pBdr = etree.SubElement(pPr, qn('w:pBdr'))
    bottom = etree.SubElement(pBdr, qn('w:bottom'))
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '4')        # 0.5pt
    bottom.set(qn('w:space'), '1')
    bottom.set(qn('w:color'), 'DDDDDD')

    # 들여쓰기 및 줄간격
    para.paragraph_format.left_indent  = Pt(8)
    para.paragraph_format.space_before = Pt(2)
    para.paragraph_format.space_after  = Pt(2)
    para.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    para.paragraph_format.line_spacing       = 1.4
    return para
```

### 7-5 파일명 규칙

```
형식: {학교코드}_{유형번호}_{유형영문명}.docx

sinmok_01_vocab.docx        ← 어휘 선택
sinmok_02_grammar.docx      ← 어법 선택
sinmok_03_verb.docx         ← 동사 변형
sinmok_04_error.docx        ← 어법 오류 수정
sinmok_05_tf.docx           ← 내용일치 TF
sinmok_06_order.docx        ← 순서배열
sinmok_07_insert.docx       ← 문장삽입
sinmok_08_wordorder.docx    ← 단어배열
sinmok_09_translation.docx  ← 해석 쓰기
sinmok_10_writing.docx      ← 영작
sinmok_전체합본.docx  → sinmok_combined.docx  (영문 필수)

※ 주의: 한글 파일명은 macOS에서 인코딩 오류 발생
```

---

## PART 8 | 자주 발생하는 오류 및 해결법

| 오류 상황 | 해결 방법 |
|---------|---------|
| Mac에서 파일이 안 열림 | 한글 파일명이 깨진 것 → 영문 파일명으로 재저장 |
| 단어배열 작성란이 너무 좁음 | 언더스코어 방식 → 단락 하단 테두리 방식으로 전환 (PART 7-4) |
| 외부 지문이 섞임 | 프롬프트에 '지문 외 정보 삽입 절대 금지' 재명시 |
| 출제 포인트 중복 | '동일 유형 내 정답 포인트 중복 금지' 조건 재명시 |
| 전수 문제 누락 | '모든 문장 빠짐없이, 누락 없음 표시' 조건 추가 |
| AI가 JSON 외 텍스트 출력 | 프롬프트에 "JSON만 출력, 다른 텍스트 없이" 명시 |
| 폰트가 다르게 보임 | Word에서 Ctrl+A → 폰트 일괄 변경으로 해결 |

---

*본 지침서는 해안연구소 AI 출제 시스템의 내부 사용 문서입니다.*
