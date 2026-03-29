# 변형 문제 & 동형 모의고사 자동 제작 지침서
### — 기출 유형 30개 × 5세트 = 150문제 + 모의고사 5회분 —

> **전제:** 기출문제 전처리(VLM 작업)가 완료되어 30문항 JSON이 준비된 상태에서 시작합니다.  
> **목표:** 올해 시험범위 지문을 바탕으로 기출 유형별 변형 문제 5개씩 제작 → 동형 모의고사 5세트 완성

---

## 목차

1. [전체 작업 설계](#1-전체-작업-설계)
2. [PHASE 1 — 유형별 문제 제작 (150문제)](#2-phase-1--유형별-문제-제작-150문제)
3. [PHASE 2 — 동형 모의고사 조립 (5세트)](#3-phase-2--동형-모의고사-조립-5세트)
4. [워크플로 A — claude.ai 수동 확인 방식](#4-워크플로-a--claudeai-수동-확인-방식)
5. [워크플로 B — API 자동화 방식 (연구원용)](#5-워크플로-b--api-자동화-방식-연구원용)
6. [프롬프트 템플릿 모음](#6-프롬프트-템플릿-모음)
7. [품질 체크리스트](#7-품질-체크리스트)
8. [오류 사례 및 대처법](#8-오류-사례-및-대처법)

---

## 1. 전체 작업 설계

### 1-1. 흐름 요약

```
[준비물]
  ① 기출 30문항 JSON          (VLM 전처리 완료본)
  ② 올해 시험범위 파일         (PDF + txt)
       ↓
[PHASE 1]  유형별 변형 문제 제작
  30개 유형 × 5문제 = 150문제 JSON
       ↓
[PHASE 2]  동형 모의고사 조립
  150문제를 유형별 1개씩 묶어 → 5세트 × 30문항
  각 세트 = 문제지(1~20번, 서답형1~10번) + 해설지
```

### 1-2. 문제 제작 규칙 (반드시 준수)

| 규칙 | 내용 |
|------|------|
| **지문 출처** | 올해 시험범위 파일에서만 가져올 것 |
| **패러프레이징 비율** | 5문제 중 2~3문제는 지문 패러프레이징, 나머지 2~3문제는 원문 유지 |
| **정보 보존** | 어느 경우에도 지문 속 정보 누락·추가 금지 |
| **특수 기호** | 기출 유형에 있던 `①②`, `(A)`, `ⓐ`, 빈칸 형식 그대로 유지 |
| **난이도** | 기출 문제의 배점·난이도 수준 유지 |
| **정답 유일성** | 객관식은 반드시 정답이 하나만 성립해야 함 |

### 1-3. 패러프레이징 허용 범위

```
✅ 허용
  - 동의어/유사 표현 교체  (abundant → plentiful)
  - 문장 구조 변환         (능동 ↔ 수동, 단문 ↔ 복문)
  - 접속어 교체            (However → Nevertheless)
  - 문장 순서 재배열        (단, 논리 흐름 유지)

❌ 금지
  - 지문에 없는 정보 추가
  - 지문의 정보 일부 삭제
  - 수치·고유명사·날짜 변경
  - 주제·요지가 달라지는 수준의 변형
```

---

## 2. PHASE 1 — 유형별 문제 제작 (150문제)

### 2-1. 작업 단위 권장

30개 유형을 한 번에 처리하면 오류가 누적됩니다.  
**6개 유형씩 5묶음**으로 나눠 작업하고, 묶음마다 교사 확인을 거칩니다.

```
묶음 1: 객관식 1~6번 유형  (6유형 × 5문제 = 30문제)
묶음 2: 객관식 7~12번 유형
묶음 3: 객관식 13~20번 유형  ← 8유형이므로 이 묶음만 40문제
묶음 4: 서답형 1~5번 유형
묶음 5: 서답형 6~10번 유형
```

> **왜 1개 유형씩 확인하지 않나?**  
> 1개마다 확인하면 30번 반복으로 피로도가 극심합니다.  
> 6개 묶음이면 확인 횟수는 5번으로 줄어들면서도 오류 범위를 충분히 좁힐 수 있습니다.

### 2-2. 출력 JSON 구조 (PHASE 1)

```json
[
  {
    "유형_번호": "1",
    "유형명": "내용 불일치 파악",
    "문제_세트": [
      {
        "문제_ID": "1-1",
        "지문_처리": "패러프레이징",
        "원문_파일": "올해_범위A.pdf",
        "지문": "...",
        "발문": "다음 글의 내용과 일치하지 않는 것은?",
        "선지": {
          "1": "...",
          "2": "...",
          "3": "...",
          "4": "...",
          "5": "..."
        },
        "정답": 3,
        "정답_로직": "...",
        "해설": "..."
      },
      { "문제_ID": "1-2", ... },
      { "문제_ID": "1-3", ... },
      { "문제_ID": "1-4", ... },
      { "문제_ID": "1-5", ... }
    ]
  }
]
```

> 서답형 유형은 `"선지"` 대신 `"조건"` 필드를 사용하고,  
> `"정답"` 필드에 모범 답안을 작성합니다.

---

## 3. PHASE 2 — 동형 모의고사 조립 (5세트)

### 3-1. 세트 구성 방식

PHASE 1에서 생성된 150문제(유형별 5문제)에서 유형당 1문제씩 선택하여 세트를 구성합니다.

```
세트 1: 각 유형의 문제_ID X-1  (예: 1-1, 2-1, 3-1 ... 30-1)
세트 2: 각 유형의 문제_ID X-2
세트 3: 각 유형의 문제_ID X-3
세트 4: 각 유형의 문제_ID X-4
세트 5: 각 유형의 문제_ID X-5
```

패러프레이징 문제와 원문 유지 문제가 각 세트에 고르게 섞이도록 합니다.

### 3-2. 모의고사 출력 형식

각 세트는 아래 구조로 출력합니다.

```
─────────────────────────────────────
[세트 N] ○○고등학교 1학년 영어 동형 모의고사
─────────────────────────────────────

▶ 문제지

1. (내용 불일치 파악)  [배점]
   지문...
   ① ...  ② ...  ③ ...  ④ ...  ⑤ ...

2. ...
...
20. ...

[서답형]
서답형 1. ...
...
서답형 10. ...

─────────────────────────────────────
▶ 해설지

1번 정답: ③
   · 정답 근거: ...
   · 오답 해설: ①... ②... ④... ⑤...
   · 관련 지문: (원문 또는 패러프레이징 표시)

...
```

---

## 4. 워크플로 A — claude.ai 수동 확인 방식

### 4-1. 언제 이 방식을 쓰나?

- 처음 이 작업을 시도하는 경우
- 추가 설치 없이 바로 시작하고 싶은 경우
- 문제 품질을 한 문제씩 꼼꼼히 보고 싶은 경우

### 4-2. 진행 순서

```
Step 1  새 대화창 열기
        → 기출 30문항 JSON + 올해 시험범위 파일 업로드

Step 2  PHASE 1 프롬프트 입력 (6번 섹션 참고)
        → 묶음 1 (유형 1~6) 문제 생성 요청

Step 3  출력 확인 (체크리스트 7번 참고)
        → 이상 없으면 "다음 묶음 진행해줘"
        → 오류 있으면 해당 유형·문제 ID 지정하여 수정 요청

Step 4  5개 묶음 완료 후 PHASE 2 프롬프트 입력
        → 동형 모의고사 세트 1~5 생성 요청

Step 5  세트별 확인 후 최종 파일 다운로드
```

> ⚠️ **주의:** claude.ai는 대화가 길어지면 앞 내용을 잊을 수 있습니다.  
> 묶음 작업 사이에 "지금까지 생성된 문제 JSON을 출력해줘"로 중간 저장하세요.

---

## 5. 워크플로 B — API 자동화 방식 (연구원용)

### 5-1. 개요 및 전체 설계 원칙

API 방식은 Python 스크립트가 Anthropic API를 직접 호출하여 **유형별 문제 생성 → 자동 검증 → 오류 플래그 → 교사 확인 요청**의 루프를 자동으로 처리합니다. 교사는 플래그된 문항만 확인하면 되므로 개입 횟수가 최소화됩니다.

```
[자동 처리]                         [교사 개입]
유형 1 API 호출
  → 자동 검증 (정답 유일성, 조건 충족 등)
  → 통과: output/ 에 저장
  → 실패: error_log에 기록 + 1회 자동 재시도
  → 재시도 후에도 실패: review_queue에 추가 ──→  교사 확인
유형 2 ...
...
유형 30 완료
  → review_queue가 있으면 교사에게 알림 ────────→  교사 확인 후 승인
  → 없으면 자동으로 PHASE 2 진행
PHASE 2: 모의고사 조립 → 파일 저장
```

### 5-2. 폴더 구조

```
exam_maker/
├── input/
│   ├── 기출_30문항.json          ← VLM 전처리 완료본
│   ├── 올해_범위A.pdf
│   ├── 올해_범위A.txt
│   └── ...
├── output/
│   ├── phase1/                   ← 유형별 생성 결과 (자동 저장)
│   │   ├── type_01.json
│   │   └── ...
│   ├── review_queue/             ← 교사 확인 필요 항목
│   ├── approved/                 ← 교사 승인 완료 항목
│   ├── 모의고사_세트1_문제지.md
│   └── ...
├── logs/
│   ├── error_log.json            ← 오류 기록
│   └── run_log.txt               ← 실행 로그
├── prompts/
│   ├── system_prompt.txt         ← 공통 시스템 프롬프트
│   ├── phase1_template.txt       ← PHASE 1 프롬프트 템플릿
│   └── phase2_template.txt       ← PHASE 2 프롬프트 템플릿
├── main.py                       ← 메인 실행 파일
├── validator.py                  ← 자동 검증 로직
└── config.py                     ← 설정 (모델, 배치 크기 등)
```

### 5-3. 핵심 코드 구조

#### config.py — 설정

```python
# config.py
MODEL = "claude-sonnet-4-5"        # 사용 모델
MAX_TOKENS = 8000                  # 응답 최대 토큰
BATCH_SIZE = 3                     # 한 번 API 호출당 처리할 유형 수
                                   # (3~5 권장. 너무 크면 품질 하락)
MAX_RETRY = 2                      # 자동 검증 실패 시 재시도 횟수
PROBLEMS_PER_TYPE = 5              # 유형당 생성 문제 수
PARAPHRASE_COUNT = 2               # 패러프레이징 문제 수 (나머지는 원문)

INPUT_DIR  = "input/"
OUTPUT_DIR = "output/phase1/"
REVIEW_DIR = "output/review_queue/"
LOG_DIR    = "logs/"
```

#### validator.py — 자동 검증 로직

```python
# validator.py
import json

def validate_problem(problem: dict, problem_type: str) -> dict:
    """
    생성된 문제 하나를 검증하고 결과를 반환합니다.
    반환값: {"pass": bool, "issues": [str]}
    """
    issues = []

    # 1. 필수 필드 존재 확인
    required = ["문제_ID", "지문_처리", "지문", "발문", "정답", "정답_로직", "해설"]
    for field in required:
        if field not in problem or not problem[field]:
            issues.append(f"필드 누락: {field}")

    # 2. 객관식: 선지 수 및 정답 범위 확인
    if "서답형" not in problem_type:
        if "선지" not in problem:
            issues.append("선지 없음")
        else:
            if len(problem["선지"]) != 5:
                issues.append(f"선지 수 오류: {len(problem['선지'])}개 (5개 필요)")
            if problem.get("정답") not in [1, 2, 3, 4, 5]:
                issues.append(f"정답 범위 오류: {problem.get('정답')}")

    # 3. 서답형: 조건 필드 및 모범 답안 존재 확인
    if "서답형" in problem_type:
        if "조건" not in problem:
            issues.append("서답형 조건 필드 누락")
        if not problem.get("정답"):
            issues.append("서답형 모범 답안 누락")

    # 4. 패러프레이징 비율 확인은 배치 단위로 체크 (아래 함수)
    return {"pass": len(issues) == 0, "issues": issues}


def validate_batch(problems: list, type_name: str) -> dict:
    """
    유형 하나의 5문제 전체를 배치 검증합니다.
    """
    results = [validate_problem(p, type_name) for p in problems]

    # 패러프레이징 비율 검증 (2~3개)
    paraphrase_count = sum(
        1 for p in problems if p.get("지문_처리") == "패러프레이징"
    )
    if not (2 <= paraphrase_count <= 3):
        for r in results:
            r["issues"].append(
                f"패러프레이징 비율 오류: {paraphrase_count}개 (2~3개 필요)"
            )
            r["pass"] = False

    all_pass = all(r["pass"] for r in results)
    return {
        "all_pass": all_pass,
        "results": results,
        "paraphrase_count": paraphrase_count
    }
```

#### main.py — 메인 실행 파일

```python
# main.py
import anthropic, json, os, time
from pathlib import Path
from config import *
from validator import validate_batch

client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 환경변수에서 자동 로드

# ── 파일 로드 ──────────────────────────────────────────
def load_inputs():
    with open(f"{INPUT_DIR}기출_30문항.json", encoding="utf-8") as f:
        exam_types = json.load(f)
    texts = {}
    for fname in Path(INPUT_DIR).glob("*.txt"):
        if "기출" not in fname.name:
            texts[fname.name] = fname.read_text(encoding="utf-8")
    return exam_types, texts

# ── API 호출 ────────────────────────────────────────────
def call_api(system_prompt: str, user_prompt: str) -> str:
    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}]
    )
    return response.content[0].text

# ── 유형 하나 처리 ──────────────────────────────────────
def process_type(type_data: dict, range_texts: dict,
                 system_prompt: str, phase1_template: str) -> dict:
    type_num  = type_data["문제번호"]
    type_name = type_data["문제_유형"]

    # 프롬프트 조립
    user_prompt = phase1_template.format(
        type_num=type_num,
        type_name=type_name,
        example_problem=json.dumps(type_data, ensure_ascii=False, indent=2),
        range_texts="\n\n---\n\n".join(range_texts.values()),
        paraphrase_count=PARAPHRASE_COUNT,
        original_count=PROBLEMS_PER_TYPE - PARAPHRASE_COUNT
    )

    for attempt in range(1, MAX_RETRY + 2):  # 최초 1회 + 재시도 MAX_RETRY회
        print(f"  유형 {type_num} ({type_name}) — 시도 {attempt}/{MAX_RETRY + 1}")
        raw = call_api(system_prompt, user_prompt)

        # JSON 파싱 시도
        try:
            # 응답에서 JSON 블록 추출
            start = raw.find("[")
            end   = raw.rfind("]") + 1
            problems = json.loads(raw[start:end])
        except Exception as e:
            log_error(type_num, f"JSON 파싱 실패 (시도 {attempt}): {e}")
            continue

        # 자동 검증
        validation = validate_batch(problems, type_name)
        if validation["all_pass"]:
            return {"status": "pass", "problems": problems, "validation": validation}

        # 실패 시 재시도 여부 결정
        issues_summary = [
            f"{p['문제_ID']}: {', '.join(r['issues'])}"
            for p, r in zip(problems, validation["results"])
            if not r["pass"]
        ]
        log_error(type_num, f"검증 실패 (시도 {attempt}): {issues_summary}")

        if attempt <= MAX_RETRY:
            # 이슈 내용을 프롬프트에 추가해서 재시도
            user_prompt += f"\n\n[재시도 요청]\n이전 생성 결과에서 아래 이슈가 발견됐습니다. 수정해서 다시 출력해주세요:\n" + \
                           "\n".join(issues_summary)
            time.sleep(2)  # API 호출 간격
        else:
            # 재시도 모두 소진 → review_queue로
            return {"status": "review", "problems": problems,
                    "validation": validation, "issues": issues_summary}

# ── 로그 기록 ───────────────────────────────────────────
def log_error(type_num, message):
    log_path = f"{LOG_DIR}error_log.json"
    logs = json.loads(Path(log_path).read_text()) if Path(log_path).exists() else []
    logs.append({"type": type_num, "message": message,
                 "time": time.strftime("%Y-%m-%d %H:%M:%S")})
    Path(log_path).write_text(json.dumps(logs, ensure_ascii=False, indent=2))

# ── 메인 실행 ───────────────────────────────────────────
def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(REVIEW_DIR, exist_ok=True)
    os.makedirs(LOG_DIR,    exist_ok=True)

    exam_types, range_texts = load_inputs()
    system_prompt   = Path("prompts/system_prompt.txt").read_text(encoding="utf-8")
    phase1_template = Path("prompts/phase1_template.txt").read_text(encoding="utf-8")

    review_queue = []

    print(f"=== PHASE 1 시작: {len(exam_types)}개 유형 처리 ===")

    for type_data in exam_types:
        type_num = type_data["문제번호"]
        result = process_type(type_data, range_texts, system_prompt, phase1_template)

        if result["status"] == "pass":
            # 통과 → output/phase1/ 에 저장
            out_path = f"{OUTPUT_DIR}type_{str(type_num).zfill(2)}.json"
            Path(out_path).write_text(
                json.dumps(result["problems"], ensure_ascii=False, indent=2)
            )
            print(f"  ✅ 유형 {type_num} 저장 완료: {out_path}")
        else:
            # 검토 필요 → review_queue/ 에 저장
            review_path = f"{REVIEW_DIR}type_{str(type_num).zfill(2)}_REVIEW.json"
            Path(review_path).write_text(
                json.dumps({
                    "type_data": type_data,
                    "generated_problems": result["problems"],
                    "issues": result["issues"]
                }, ensure_ascii=False, indent=2)
            )
            review_queue.append(type_num)
            print(f"  ⚠️  유형 {type_num} → 검토 필요 ({review_path})")

        time.sleep(1)  # API 호출 간격

    # ── 검토 큐 처리 ────────────────────────────────────
    if review_queue:
        print(f"\n⚠️  교사 확인 필요 유형: {review_queue}")
        print(f"   output/review_queue/ 폴더를 확인하고,")
        print(f"   수정 후 output/approved/ 폴더로 이동하세요.")
        print(f"   완료 후 'python main.py --phase2' 를 실행하세요.")
    else:
        print("\n✅ 모든 유형 자동 통과. PHASE 2를 시작합니다.")
        run_phase2()

def run_phase2():
    # output/phase1/ + output/approved/ 의 JSON을 모두 합쳐
    # 모의고사 5세트 조립 (별도 스크립트 또는 추가 API 호출)
    print("=== PHASE 2: 동형 모의고사 조립 ===")
    # → 6번 섹션의 PHASE 2 프롬프트를 API로 호출
    # → output/모의고사_세트N_문제지.md, 해설지.md 저장

if __name__ == "__main__":
    import sys
    if "--phase2" in sys.argv:
        run_phase2()
    else:
        main()
```

### 5-4. 프롬프트 파일 구성

`prompts/phase1_template.txt` 에 아래 내용을 저장합니다.  
(Python의 `.format()` 으로 변수가 치환됩니다.)

```
[역할]
너는 한국 고등학교 영어 시험 문제 출제 전문가야.

[이번 작업]
유형: {type_num}번 — {type_name}
아래 기출 예시를 형식·난이도 기준으로 삼아, 새 문제 {problems_per_type}개를 만들어줘.

[기출 예시]
{example_problem}

[사용할 지문 (올해 시험범위)]
{range_texts}

[문제 제작 규칙]
1. 지문은 반드시 위 시험범위 파일에서만 사용할 것.
2. {paraphrase_count}개는 지문을 패러프레이징, {original_count}개는 원문 그대로 사용.
3. 패러프레이징 시 정보 누락·추가·수치 변경 절대 금지.
4. 객관식: 정답이 하나만 성립해야 함. 오답은 지문에서 반박 가능해야 함.
5. 서답형: <조건>을 기출과 동일한 형식으로 유지. 모범 답안이 조건을 충족하는지 자체 검증 후 출력.

[출력 형식]
반드시 아래 JSON 배열만 출력해. 설명·주석 없이 JSON만.

[
  {{
    "문제_ID": "{type_num}-1",
    "지문_처리": "패러프레이징 또는 원문",
    "원문_파일": "파일명",
    "지문": "...",
    "발문": "...",
    "선지": {{"1":"...","2":"...","3":"...","4":"...","5":"..."}},
    "정답": N,
    "정답_로직": "지문 근거: '...' → N번이 정답인 이유",
    "해설": "각 선지별 해설"
  }},
  ...
]
```

### 5-5. 실행 방법

```bash
# 1. 환경 설정
pip install anthropic
export ANTHROPIC_API_KEY="sk-ant-..."   # API 키 설정

# 2. 입력 파일 배치
cp 기출_30문항.json   exam_maker/input/
cp 올해_범위*.pdf     exam_maker/input/
cp 올해_범위*.txt     exam_maker/input/

# 3. PHASE 1 실행 (전체 자동 처리)
cd exam_maker
python main.py

# 4. 검토 큐가 생긴 경우
#    output/review_queue/ 폴더의 파일을 열어 수동 수정 후
#    output/approved/ 로 이동
mv output/review_queue/type_07_REVIEW.json output/approved/type_07.json

# 5. PHASE 2 실행 (모의고사 조립)
python main.py --phase2
```

### 5-6. 예상 소요 시간 및 비용

| 항목 | 내용 |
|------|------|
| **PHASE 1 소요 시간** | 유형당 약 30~60초 × 30유형 = **약 20~30분** |
| **PHASE 2 소요 시간** | 세트당 약 2~3분 × 5세트 = **약 10~15분** |
| **총 API 호출 횟수** | PHASE 1: 약 30~60회 (재시도 포함) + PHASE 2: 5회 |
| **예상 비용** | claude-sonnet-4-5 기준 약 $1~3 수준 (입출력 토큰 합산) |
| **교사 개입 횟수** | 자동 검증 통과 시 0회, review_queue 발생 시 해당 유형만 |

> 💡 **비용 절감 팁:** 개발·테스트 단계에서는 `claude-haiku-4-5` 로 먼저 돌려보고,  
> 최종 산출물만 `claude-sonnet-4-5` 로 재실행하면 비용을 크게 줄일 수 있습니다.

---

## 6. 프롬프트 템플릿 모음

### 6-1. PHASE 1 — 유형별 문제 생성 프롬프트

```
[역할]
너는 한국 고등학교 영어 시험 문제 출제 전문가야.

[준비물]
- 기출 30문항 JSON (업로드된 파일): 각 유형의 형식·구조·난이도 기준으로 삼아.
- 올해 시험범위 파일 (업로드된 파일): 문제에 사용할 지문은 반드시 이 파일에서만 가져와.

[이번 작업 범위]
유형 N번 ~ M번 (총 K개 유형)에 대해 각각 문제 5개를 만들어줘.

[문제 제작 규칙]
1. 유형 형식 준수
   - 기출 JSON의 해당 유형과 동일한 발문 형식, 선지 수, 특수 기호를 유지해.
   - 예) 내용 불일치 유형은 반드시 5지선다, "다음 글의 내용과 일치하지 않는 것은?" 형태.

2. 지문 처리
   - 5문제 중 2~3문제: 올해 시험범위 지문을 패러프레이징해서 사용.
   - 나머지 2~3문제: 올해 시험범위 지문을 원문 그대로 사용.
   - 패러프레이징 시 지문 속 정보 누락·추가·수치 변경 절대 금지.

3. 정답 유일성
   - 객관식: 정답이 반드시 하나만 성립해야 해.
   - 오답 선지는 지문에서 반박 가능한 근거가 명확해야 해.

4. 서답형 조건
   - 기출 서답형과 동일한 <조건> 형식(단어 수, 보기 단어, 문장 수 등) 유지.
   - 모범 답안이 조건을 모두 충족하는지 자체 검증 후 출력해.

[출력 형식]
아래 JSON 형식으로 출력해. 유형별로 구분해줘.

{
  "유형_번호": "N",
  "유형명": "...",
  "문제_세트": [
    {
      "문제_ID": "N-1",
      "지문_처리": "패러프레이징 | 원문",
      "원문_파일": "파일명.pdf",
      "지문": "...",
      "발문": "...",
      "선지": {"1": "...", "2": "...", "3": "...", "4": "...", "5": "..."},
      "정답": N,
      "정답_로직": "지문 근거: '...' → 이러이러해서 N번이 정답",
      "해설": "각 선지별 해설..."
    }
  ]
}

서답형의 경우 "선지" 대신 "조건" 필드 사용, "정답"에 모범 답안 작성.

[작업 전 확인]
작업을 시작하기 전에 아래를 먼저 출력해줘:
"유형 N~M번 작업 시작. 사용할 지문 출처: [파일명 목록]"
```

---

### 6-2. PHASE 1 — 묶음 완료 후 확인 요청 프롬프트

```
묶음 N 작업이 완료됐어. 아래 항목을 자체 점검하고 결과를 표로 출력해줘.

[자체 점검 항목]
| 문제_ID | 유형명 | 지문_처리 | 정답_유일성 | 조건_충족(서답형) | 이슈 |
|---------|--------|-----------|-------------|-------------------|------|
| ...     | ...    | ...       | ✅/❌       | ✅/❌/해당없음    | ...  |

이슈가 있는 문제는 즉시 수정해줘. 이슈가 없으면 "묶음 N 이상 없음. 확인 요청"을 출력해.
```

---

### 6-3. PHASE 2 — 동형 모의고사 조립 프롬프트

```
[역할]
PHASE 1에서 생성된 150문제 JSON을 바탕으로 동형 모의고사 5세트를 만들어줘.

[세트 구성 규칙]
- 세트 N은 각 유형의 문제_ID X-N을 하나씩 가져와 구성해.
  (세트1 = 1-1, 2-1, 3-1 ... 30-1 / 세트2 = 1-2, 2-2 ... 30-2 / ...)
- 패러프레이징 문제와 원문 문제가 세트 안에 고르게 섞이도록 해.
- 객관식 문항은 1~20번 순서로, 서답형은 서답형 1~10번 순서로 배치해.
- 기출 배점 기준을 그대로 유지해.

[출력 형식 — 세트당 두 파일]

파일 1: 모의고사_세트N_문제지.md
─────────────────────────────────
○○고등학교 1학년 영어 동형 모의고사 (세트 N)
이름: ____________  날짜: ____________  점수: ____
─────────────────────────────────
1. [배점] 발문
   지문

   ① ...  ② ...  ③ ...  ④ ...  ⑤ ...

(2~20번 동일 형식)

[서답형]
서답형 1. [배점]
   지문
   <조건>
   ...
─────────────────────────────────

파일 2: 모의고사_세트N_해설지.md
─────────────────────────────────
○○고등학교 1학년 영어 동형 모의고사 (세트 N) — 해설지
─────────────────────────────────
■ 1번  정답: ③  [배점]
   유형: 내용 불일치 파악
   지문 처리: 패러프레이징 | 원문
   
   [정답 근거]
   지문 '...' → ③번 선지의 '...'와 불일치.
   
   [오답 해설]
   ① 지문 근거: '...' → 일치하므로 오답
   ② ...
   ④ ...
   ⑤ ...

(2~20번, 서답형 1~10번 동일 형식)
─────────────────────────────────

[작업 순서]
세트 1부터 5까지 순서대로 만들어줘.
세트 1 완료 후 "세트 1 완료. 확인 후 '계속'을 입력해주세요." 출력하고 대기해.
```

---

### 6-4. 수정 요청 프롬프트 (공통)

```
# 특정 문제 수정
유형 [N]번, 문제_ID [N-M]을 다시 만들어줘.
이유: [오류 내용]
나머지 문제는 그대로 유지해.

# 정답 유일성 오류
[N-M] 문제에서 선지 [X]도 정답으로 성립 가능해.
선지를 조정하되 지문 내용은 바꾸지 마.

# 패러프레이징 과도
[N-M] 패러프레이징 문제에서 원문에 없는 내용이 추가됐어.
원본 지문 정보만 유지하면서 다시 패러프레이징해줘.

# 서답형 조건 불충족
서답형 [N-M] 모범 답안이 <조건>의 [단어 수 / 보기 단어] 조건을 위반해.
조건을 충족하도록 모범 답안을 수정해줘. 문제 자체는 바꾸지 마.
```

---

## 7. 품질 체크리스트

각 묶음 확인 시 아래 항목을 점검합니다.

### 객관식 체크리스트

- [ ] 발문 형식이 기출 유형과 동일한가?
- [ ] 지문이 올해 시험범위 파일에서만 출처했는가?
- [ ] 패러프레이징 문제에서 정보 누락·추가가 없는가?
- [ ] 정답이 단 하나만 성립하는가?
- [ ] 오답 선지가 지문에서 반박 가능한가?
- [ ] 특수 기호(`①②`, `(A)`, `ⓐ` 등) 형식이 맞는가?

### 서답형 체크리스트

- [ ] `<조건>` 형식이 기출과 동일한가?
- [ ] 모범 답안이 단어 수 조건을 충족하는가?
- [ ] 모범 답안이 보기 단어를 모두 사용했는가?
- [ ] 모범 답안의 어법이 정확한가?
- [ ] 채점 기준이 명확하게 서술되었는가?

### 모의고사 세트 체크리스트

- [ ] 30개 유형이 각각 1문제씩 포함되었는가?
- [ ] 객관식 1~20번 + 서답형 1~10번 순서가 맞는가?
- [ ] 패러프레이징·원문 문제가 세트 내에 고르게 배분되었는가?
- [ ] 해설지에 모든 문항의 정답 근거와 오답 해설이 있는가?
- [ ] 배점 합계가 100점인가?

---

## 8. 오류 사례 및 대처법

| 오류 유형 | 증상 | 대처법 |
|-----------|------|--------|
| **정보 추가** | 패러프레이징 지문에 원문에 없는 내용이 삽입됨 | 해당 문제 ID 지정 → "원본 지문 정보만 유지해서 다시 만들어줘" |
| **정보 누락** | 원문 일부가 패러프레이징 과정에서 사라짐 | 원문과 대조 후 누락 부분 지적 → 재생성 요청 |
| **정답 비유일성** | 객관식에서 2개 이상 선지가 정답으로 성립 | "선지 X도 정답 가능해. 선지만 조정하되 지문 유지해줘" |
| **서답형 조건 위반** | 모범 답안이 단어 수·보기 단어 조건 미충족 | 조건 항목 명시 후 답안만 수정 요청 |
| **유형 형식 불일치** | 발문·선지 수가 기출과 다름 | 기출 JSON 해당 유형 발문 복붙 → "이 형식으로 맞춰줘" |
| **세트 구성 오류** | 같은 유형이 중복되거나 누락됨 | PHASE 2 재실행 또는 해당 세트만 재조립 요청 |
| **컨텍스트 소실** | (API 방식에서는 발생 안 함) claude.ai 수동 방식에서 긴 대화 후 망각 | JSON 파일을 매 API 호출에 명시적으로 포함하므로 API 방식에서는 해당 없음 |

---

## 부록 — 워크플로 선택 가이드

```
설치 없이 지금 당장 시작하고 싶은 경우
또는 문제 품질을 한 문제씩 직접 확인하고 싶은 경우
  → 워크플로 A (claude.ai 수동, 6개 유형 묶음 단위 확인)

연구원이 있고, 매 학기 반복 예정이며, API 키 발급이 가능한 경우  ← 현재 상황
  → 워크플로 B (API 자동화)
  → 세팅 1회 후 다음 학기부터는 input/ 파일 교체만으로 재실행 가능
```

### API 자동화 도입 시 연구원 역할 분담 (권장)

| 역할 | 담당 | 내용 |
|------|------|------|
| 코드 세팅 및 실행 | 연구원 | `main.py` 실행, 오류 로그 확인, review_queue 처리 |
| 입력 파일 준비 | 교사 | 기출 JSON, 올해 시험범위 파일을 `input/` 에 배치 |
| 품질 최종 확인 | 교사 | review_queue 문항 + 무작위 샘플링 5~10문제 직접 검토 |
| 모의고사 최종 편집 | 교사 | 생성된 `.md` 파일을 Word/HWP로 변환 후 레이아웃 조정 |

---

*작성: 신목고등학교 영어과 | 2025년 3월*  
*관련 파일: `Claude_VLM_영어시험_전처리_지침서.md`*
