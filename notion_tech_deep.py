#!/usr/bin/env python3
"""
Notion 기술 심층 문서 — CTO 관점
에이전트 루프 / 토큰 최적화 / RAG 아키텍처 상세
"""

import json
import time
import requests

TOKEN = "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"
PARENT_PAGE_ID = "330f2793d19281d890fdf5ebc44f10f1"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}
BASE = "https://api.notion.com/v1"


def append_blocks(parent_id, blocks):
    for i in range(0, len(blocks), 100):
        batch = blocks[i:i+100]
        r = requests.patch(
            f"{BASE}/blocks/{parent_id}/children",
            headers=HEADERS,
            json={"children": batch},
        )
        if r.status_code != 200:
            print(f"  ERR batch {i//100}: {r.status_code} - {r.text[:200]}")
        else:
            print(f"  Batch {i//100+1} OK ({len(batch)} blocks)")
        time.sleep(0.35)


def create_page(parent_id, title, icon="📄"):
    r = requests.post(f"{BASE}/pages", headers=HEADERS, json={
        "parent": {"type": "page_id", "page_id": parent_id},
        "icon": {"type": "emoji", "emoji": icon},
        "properties": {"title": [{"type": "text", "text": {"content": title}}]},
    })
    if r.status_code == 200:
        pid = r.json()["id"]
        print(f"  Created: {title} -> {pid}")
        return pid
    print(f"  ERR: {r.status_code} - {r.text[:200]}")
    return None


# --- Block helpers ---
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

def bold_para(bold, normal=""):
    parts = [{"type":"text","text":{"content":bold},"annotations":{"bold":True}}]
    if normal:
        parts.append({"type":"text","text":{"content":normal}})
    return {"type":"paragraph","paragraph":{"rich_text":parts}}

def rt(text):
    if len(text) <= 2000:
        return [{"type":"text","text":{"content":text}}]
    return [{"type":"text","text":{"content":text[i:i+2000]}} for i in range(0,len(text),2000)]

def table_row(cells):
    return {"type":"table_row","table_row":{"cells":[[{"type":"text","text":{"content":c}}] for c in cells]}}

def table(w, rows):
    return {"type":"table","table":{"table_width":w,"has_column_header":True,"has_row_header":False,"children":rows}}


def build_blocks():
    b = []

    b.append(callout("CTO Technical Deep-Dive — Haean AI Engine Architecture\n에이전트 루프 · 토큰 최적화 · RAG 시스템 · 품질 보증\n2026-03-29 | Claude Code 작성", "🧠"))
    b.append(divider())

    # ============================================================
    # 1. 아키텍처 오버뷰
    # ============================================================
    b.append(h1("1. 시스템 아키텍처 오버뷰"))
    b.append(para("Haean의 AI 엔진은 4개의 독립 스테이지로 구성된 파이프라인 아키텍처를 채택했다. 각 스테이지는 단일 책임 원칙(SRP)을 따르며, 모듈 간 결합도를 최소화하여 독립적 테스트와 교체가 가능하다."))

    b.append(code_block(
        "┌─────────────────────────────────────────────────────────────┐\n"
        "│                    Haean AI Pipeline                        │\n"
        "├─────────┬──────────┬──────────────┬─────────────────────────┤\n"
        "│ Stage 1 │ Stage 2  │   Stage 3    │        Stage 4         │\n"
        "│         │          │ (Agent Loop) │                        │\n"
        "│  VLM    │   RAG    │  Generate →  │    Document            │\n"
        "│ OCR +   │ Context  │  Validate →  │    Export              │\n"
        "│ Struct  │ Assembly │  Correct  →  │  (.docx/.hwpx)         │\n"
        "│         │          │  Re-validate │                        │\n"
        "├─────────┼──────────┼──────────────┼─────────────────────────┤\n"
        "│ structu-│ rag.ts + │ generator.ts │ exporter.ts            │\n"
        "│ rizer   │ prompt-  │ validator.ts │ hwpx-exporter.ts       │\n"
        "│ .ts     │ builder  │ anthropic.ts │ docx-styles.ts         │\n"
        "│ (532줄) │ .ts      │ (468+272줄)  │ (948+628+162줄)        │\n"
        "│         │ (455+    │              │                        │\n"
        "│         │  197줄)  │              │                        │\n"
        "└─────────┴──────────┴──────────────┴─────────────────────────┘\n"
        "\n"
        "공통 인프라:\n"
        "  anthropic.ts (215줄) — Claude API 싱글톤 + 태스크별 모델/토큰 매핑\n"
        "  prompt-builder.ts    — 정적 시스템 프롬프트 + 동적 RAG 유저 메시지 분리"
    ))
    b.append(divider())

    # ============================================================
    # 2. 에이전트 루프 (Self-Correction Loop)
    # ============================================================
    b.append(h1("2. 에이전트 루프 (Self-Correction Loop)"))

    b.append(h2("2-1. 설계 철학"))
    b.append(para("LLM 기반 문제 생성의 핵심 과제는 '한 번에 완벽한 출력을 보장할 수 없다'는 점이다. 이를 해결하기 위해 우리는 Generate → Validate → Correct → Re-validate 순환 루프를 구현했다. 이것은 소프트웨어 공학의 Red-Green-Refactor 패턴을 AI 생성에 적용한 것이다."))
    b.append(divider())

    b.append(h2("2-2. 루프 아키텍처 상세"))
    b.append(code_block(
        "generateWithCorrection(passage, typeContexts, fewShot, options, dnaProfile)\n"
        "│\n"
        "├─ Step 1: Prompt Assembly\n"
        "│   ├─ buildGenerateSystemPrompt()     ← 파일 캐시 (data/prompts/generate_questions.txt)\n"
        "│   └─ buildGenerateUserMessage()       ← 동적 RAG 주입 (지문 + 유형규칙 + 예시 + 옵션)\n"
        "│\n"
        "├─ Step 2: Initial Generation\n"
        "│   ├─ withRetry(callClaude(...), MAX_RETRIES=3)\n"
        "│   │   └─ Exponential Backoff: 800ms → 1600ms → 3200ms\n"
        "│   └─ parseGeneratedQuestions()         ← JSON 파싱 + 구조 검증\n"
        "│\n"
        "├─ Step 3: Validation + Correction Loop (MAX_CORRECTION_ROUNDS=2)\n"
        "│   │\n"
        "│   ├─ Round 1:\n"
        "│   │   ├─ validateQuestionsDetailed(questions, passage)\n"
        "│   │   │   └─ 문제별 독립 검증 (7항목 체크)\n"
        "│   │   │       └─ callClaude(validateSystemPrompt, validateUserMessage, 'validate')\n"
        "│   │   │\n"
        "│   │   ├─ partitionByValidation()\n"
        "│   │   │   ├─ valid[]   ← PASS 문제 보존 (토큰 절약!)\n"
        "│   │   │   └─ failed[]  ← FAIL 문제만 재생성 대상\n"
        "│   │   │\n"
        "│   │   ├─ buildCorrectionMessage(failed, feedback, passage, typeContexts)\n"
        "│   │   │   └─ 실패 항목별 구체적 피드백 포함:\n"
        "│   │   │       - 어떤 체크가 실패했는지\n"
        "│   │   │       - quality_score\n"
        "│   │   │       - patch_suggestions (필드별 수정 제안)\n"
        "│   │   │       - corrective_action (REGENERATE/PATCH)\n"
        "│   │   │\n"
        "│   │   ├─ withRetry(callClaude(systemPrompt, correctionMessage), 3)\n"
        "│   │   │\n"
        "│   │   └─ mergeCorrections()\n"
        "│   │       ├─ 기존 valid 문제 유지\n"
        "│   │       ├─ corrected 문제로 교체\n"
        "│   │       └─ renumber(1부터 재번호)\n"
        "│   │\n"
        "│   └─ Round 2: (동일 루프, 여전히 FAIL이면)\n"
        "│       └─ MAX_CORRECTION_ROUNDS 도달 → valid만 반환, FAIL 제외 + 로그\n"
        "│\n"
        "└─ Step 4: Passage Fairness Check\n"
        "    └─ checkPassageFairness() — 모든 단락이 최소 1문제에 사용되었는지 검증",
        "plain text"
    ))
    b.append(divider())

    b.append(h2("2-3. 핵심 설계 결정 (Design Decisions)"))

    b.append(h3("① 부분 재생성 (Partial Regeneration)"))
    b.append(para("전체 배치를 재생성하지 않고, FAIL 문제만 골라서 재생성한다. 이것이 가장 중요한 토큰 최적화 포인트다."))
    b.append(code_block(
        "// generator.ts:174-184\n"
        "function partitionByValidation(questions, failedResults) {\n"
        "  const failedNumbers = new Set(failedResults.map(r => r.question_number))\n"
        "  return {\n"
        "    valid: questions.filter(q => !failedNumbers.has(q.question_number)),  // 보존\n"
        "    failed: questions.filter(q => failedNumbers.has(q.question_number)),  // 재생성\n"
        "  }\n"
        "}",
        "typescript"
    ))
    b.append(bullet("5문제 중 1문제 FAIL → 1문제만 재생성 (토큰 사용 80% 절약 vs 전체 재생성)"))
    b.append(bullet("PASS 문제는 원본 그대로 보존 → 품질 일관성 유지"))
    b.append(bullet("mergeCorrections()에서 원본 valid + 재생성 corrected 합산 후 renumber"))
    b.append(divider())

    b.append(h3("② 피드백 기반 재생성 (Feedback-Driven Correction)"))
    b.append(para("단순히 '다시 만들어줘'가 아니라, 검증기의 구체적 피드백을 correction prompt에 주입한다. 이를 통해 같은 실수를 반복할 확률을 대폭 낮춘다."))
    b.append(code_block(
        "// prompt-builder.ts:380-447 — buildCorrectionMessage()\n"
        "// 실패 문제별 피드백 구조:\n"
        "\n"
        "### 문제 3 (vocabulary_choice) — REGENERATE\n"
        "점수: 40/100\n"
        "실패한 검증 항목:\n"
        "  - answer_accuracy: 정답 ③이 실제로는 문맥상 적절함\n"
        "  - distractor_validity: ①의 단어가 원문에 없음\n"
        "수정 제안:\n"
        "  - [answer] 정답 선지를 실제 반의어로 교체 → 'mitigate'를 'accelerate'로\n"
        "  - [passage_with_markers] ①번 마커 위치를 원문 어휘로 수정\n"
        "\n"
        "// 핵심: 검증기의 7항목 결과 + patch_suggestions를 그대로 전달\n"
        "// → Claude가 무엇이 틀렸고 어떻게 고쳐야 하는지 정확히 인지",
        "plain text"
    ))
    b.append(divider())

    b.append(h3("③ 2라운드 제한 + Graceful Degradation"))
    b.append(para("무한 루프를 방지하기 위해 MAX_CORRECTION_ROUNDS=2로 제한했다. 2라운드 후에도 FAIL이면 해당 문제를 제외하고 PASS 문제만 반환한다. 이는 '불완전하지만 신뢰할 수 있는 결과'를 '완벽하지만 무한히 기다리는 결과'보다 우선하는 프로덕트 설계 결정이다."))
    b.append(code_block(
        "if (round === MAX_CORRECTION_ROUNDS) {\n"
        "  // 마지막 라운드 — valid만 반환, FAIL 제외\n"
        "  const { valid: validQuestions } = partitionByValidation(questions, failedResults)\n"
        "  console.error(\n"
        "    `Max correction rounds reached. ` +\n"
        "    `${failedResults.length} question(s) could not be corrected.`\n"
        "  )\n"
        "  questions = renumber(validQuestions, 1)\n"
        "  break\n"
        "}",
        "typescript"
    ))
    b.append(divider())

    b.append(h3("④ API 레벨 Retry + 루프 레벨 Retry 분리"))
    b.append(para("두 계층의 retry를 분리 설계했다:"))
    b.append(table(3, [
        table_row(["계층", "역할", "설정"]),
        table_row(["withRetry() — API 레벨", "네트워크 오류, 429 rate limit, 5xx 에러 대응", "MAX_RETRIES=3, 800ms×2^n backoff"]),
        table_row(["correction loop — 로직 레벨", "생성된 문제의 품질 미달 대응", "MAX_CORRECTION_ROUNDS=2"]),
    ]))
    b.append(para("API retry는 인프라 장애 대응, correction loop는 AI 품질 대응. 이 분리로 장애 유형별 적절한 복구 전략을 적용한다."))
    b.append(divider())

    # ============================================================
    # 3. 7항목 검증 시스템
    # ============================================================
    b.append(h1("3. 7항목 검증 시스템 (Validator)"))
    b.append(h2("3-1. 검증 항목 상세"))
    b.append(table(4, [
        table_row(["#", "검증 항목", "검증 내용", "실패 시 영향"]),
        table_row(["1", "answer_accuracy", "정답이 실제로 맞는지 (원문 대조)", "FAIL → 즉시 재생성"]),
        table_row(["2", "distractor_validity", "오답 선지가 합리적 오답인지", "FAIL → 선지 교체"]),
        table_row(["3", "passage_fidelity", "원문 범위 안에서 출제되었는지", "FAIL → 지문 참조 수정"]),
        table_row(["4", "instruction_fit", "유형에 맞는 지시문인지", "WARN → 지시문 교체"]),
        table_row(["5", "difficulty_match", "요청 난이도와 일치하는지", "WARN → 난이도 조절"]),
        table_row(["6", "format_compliance", "JSON 스키마 + 선지 형식", "FAIL → 포맷 재생성"]),
        table_row(["7", "explanation_quality", "해설이 논리적인지", "WARN → 해설 보강"]),
    ]))
    b.append(divider())

    b.append(h2("3-2. 품질 점수 산출"))
    b.append(code_block(
        "quality_score = 100 - (FAIL_count × 20) - (WARN_count × 5)\n"
        "\n"
        "예시:\n"
        "  PASS×5, WARN×2, FAIL×0 → 100 - 0 - 10 = 90점 (양호)\n"
        "  PASS×4, WARN×1, FAIL×2 → 100 - 40 - 5  = 55점 (재생성)\n"
        "  PASS×2, WARN×0, FAIL×5 → 100 - 100 - 0  = 0점  (전면 재생성)\n"
        "\n"
        "판정 기준:\n"
        "  overall_verdict = FAIL이 1개라도 있으면 'FAIL'\n"
        "  corrective_action = 'REGENERATE' (전면) 또는 'PATCH' (부분 수정)",
        "plain text"
    ))
    b.append(divider())

    b.append(h2("3-3. 문제별 독립 검증 (Per-Question Validation)"))
    b.append(para("초기에는 전체 문제를 한 번에 검증하는 방식을 고려했으나, 문제별 독립 검증을 선택한 이유:"))
    b.append(numbered("정밀도 — 문제별로 별도의 Claude 호출을 하면 각 문제에 집중한 상세 분석이 가능"))
    b.append(numbered("디버깅 — 어떤 문제가 왜 실패했는지 개별 추적 가능"))
    b.append(numbered("부분 실패 허용 — 1문제 검증 API 실패해도 나머지 문제 검증은 계속 진행"))
    b.append(code_block(
        "// validator.ts:198-238 — 문제별 독립 검증\n"
        "for (const question of questions) {\n"
        "  try {\n"
        "    const result = await validateQuestion(question, passage)  // 개별 API 호출\n"
        "    results.push(result)\n"
        "  } catch (err) {\n"
        "    // API 실패해도 synthetic FAIL 결과 생성 → correction loop에서 처리\n"
        "    results.push({\n"
        "      overall_verdict: 'FAIL',\n"
        "      corrective_action: 'REGENERATE',\n"
        "      quality_score: 0,\n"
        "      // ...\n"
        "    })\n"
        "  }\n"
        "}",
        "typescript"
    ))
    b.append(para("트레이드오프: 5문제 검증 시 5회 API 호출 (순차) → 지연 시간 증가. 향후 병렬화(Promise.all)로 개선 예정."))
    b.append(divider())

    # ============================================================
    # 4. 토큰 최적화
    # ============================================================
    b.append(h1("4. 토큰 최적화 전략"))

    b.append(h2("4-1. API 호출별 토큰 버짓"))
    b.append(table(4, [
        table_row(["태스크", "모델", "max_tokens", "설계 근거"]),
        table_row(["structurize", "claude-sonnet-4-6", "4,096", "지문 1개 JSON ≈ 2K~3K 토큰"]),
        table_row(["generate", "claude-sonnet-4-6", "8,192", "5문제 JSON ≈ 4K~6K 토큰"]),
        table_row(["validate", "claude-sonnet-4-6", "4,096", "1문제 검증 결과 ≈ 1.5K~2.5K 토큰"]),
    ]))
    b.append(para("각 태스크별로 필요한 만큼만 max_tokens를 설정하여 불필요한 토큰 소비를 방지한다."))
    b.append(divider())

    b.append(h2("4-2. Selective RAG Loading (핵심 최적화)"))
    b.append(para("전체 10개 유형의 템플릿+예시를 모두 프롬프트에 넣으면 input tokens가 폭증한다. 우리는 '선택적 로딩' 전략을 채택했다."))
    b.append(code_block(
        "// rag.ts — Key principle: only load what's needed\n"
        "\n"
        "❌ 나쁜 방식 (Naive):\n"
        "  모든 10개 유형 × (규칙 + 스키마 + 예시 3개) = ~15,000 input tokens\n"
        "\n"
        "✅ 우리 방식 (Selective):\n"
        "  사용자가 선택한 유형만 × (규칙 + 스키마 + 예시 1개) = ~2,000~4,000 input tokens\n"
        "\n"
        "  예) vocabulary_choice + grammar_choice 2유형 선택:\n"
        "    → vocabulary_choice.json 로드 (rules + schema + example 1개)\n"
        "    → grammar_choice.json 로드 (rules + schema + example 1개)\n"
        "    → 나머지 8개 유형: 로드하지 않음\n"
        "\n"
        "절약 효과: ~70-80% input token 절감",
        "plain text"
    ))
    b.append(divider())

    b.append(h2("4-3. Few-Shot 예시 개수 제어"))
    b.append(code_block(
        "// generator.ts:57\n"
        "const FEW_SHOT_COUNT_PER_TYPE = 1\n"
        "\n"
        "// rag.ts:140 — countPerType 파라미터로 제어\n"
        "const examples = template.examples.slice(0, countPerType)\n"
        "\n"
        "// 각 유형별 예시 데이터에는 2~3개 예시가 있지만,\n"
        "// 프롬프트에는 1개만 주입하여 토큰을 절약.\n"
        "// 품질 테스트 결과 1개로도 충분한 가이딩 효과 확인.\n"
        "\n"
        "// 토큰 비교:\n"
        "//   예시 3개/유형 × 2유형 = ~3,000 tokens\n"
        "//   예시 1개/유형 × 2유형 = ~1,000 tokens  (66% 절감)",
        "plain text"
    ))
    b.append(divider())

    b.append(h2("4-4. 프롬프트 분리 전략 (Static vs Dynamic)"))
    b.append(para("prompt-builder.ts의 핵심 설계 원칙: system prompt는 정적(캐시 가능), user message는 동적(매번 조립)."))
    b.append(code_block(
        "┌─────────────────────────────────────────┐\n"
        "│          Claude API 호출 구조            │\n"
        "├─────────────────────────────────────────┤\n"
        "│ system:  정적 시스템 프롬프트            │\n"
        "│          └─ generate_questions.txt       │\n"
        "│          └─ 파일 캐시 (1회 로드 후 재사용)│\n"
        "│                                         │\n"
        "│ messages[0].content:  동적 유저 메시지    │\n"
        "│          ├─ INPUT 1: 구조화된 지문        │\n"
        "│          ├─ INPUT 2: 생성 요청 JSON       │\n"
        "│          ├─ INPUT 3: 유형별 규칙+스키마    │ ← RAG 주입\n"
        "│          ├─ 참고 예시 (Few-shot)          │ ← RAG 주입\n"
        "│          ├─ DNA 프로필 (선택적)           │\n"
        "│          └─ 최종 생성 지시                │\n"
        "└─────────────────────────────────────────┘\n"
        "\n"
        "이점:\n"
        "  1. 시스템 프롬프트가 Anthropic API의 prompt caching에 활용될 수 있음\n"
        "  2. 유저 메시지만 교체하면 같은 시스템 프롬프트로 다양한 생성 가능\n"
        "  3. 프롬프트 파일 수정 시 코드 변경 없이 반영 (hot-reload with cache clear)",
        "plain text"
    ))
    b.append(divider())

    b.append(h2("4-5. Correction Prompt의 토큰 최적화"))
    b.append(para("수정 프롬프트에서도 '필요한 것만' 포함하는 원칙을 적용:"))
    b.append(numbered("실패한 문제의 유형 규칙만 포함 (10개 중 해당 유형만)"))
    b.append(numbered("원본 지문은 포함하되, 이미 성공한 문제의 정보는 제외"))
    b.append(numbered("검증 피드백을 구조화된 형태로 전달 (자유 텍스트 X → 필드별 정리 O)"))
    b.append(code_block(
        "// prompt-builder.ts:410-415\n"
        "// 수정이 필요한 유형의 규칙만 포함\n"
        "const relevantTypeIds = [...new Set(failedQuestions.map(q => q.type_id))]\n"
        "const relevantContexts = typeContexts.filter(t => relevantTypeIds.includes(t.typeId))\n"
        "\n"
        "// 예: 5문제 중 vocabulary_choice 1문제만 실패\n"
        "// → grammar_choice, blank_inference 등의 규칙은 포함하지 않음\n"
        "// → ~500-1000 tokens 추가 절감",
        "typescript"
    ))
    b.append(divider())

    b.append(h2("4-6. 인메모리 캐싱"))
    b.append(para("반복 로딩을 방지하는 3계층 캐싱:"))
    b.append(table(4, [
        table_row(["캐시", "위치", "대상", "수명"]),
        table_row(["templateCache", "rag.ts:36", "유형별 JSON 템플릿", "프로세스 수명"]),
        table_row(["promptCache", "prompt-builder.ts:41", "프롬프트 .txt 파일", "프로세스 수명"]),
        table_row(["_client", "anthropic.ts:46", "Anthropic SDK 인스턴스", "프로세스 수명"]),
    ]))
    b.append(para("Vercel Serverless에서는 cold start마다 초기화되지만, 같은 인스턴스의 warm 요청에서는 캐시가 재사용되어 파일 I/O를 절약한다."))
    b.append(divider())

    b.append(h2("4-7. 전체 토큰 사용 시나리오 분석"))
    b.append(para("일반적인 사용 시나리오: 지문 1개 → vocabulary_choice + grammar_choice 5문제 생성"))
    b.append(table(4, [
        table_row(["단계", "API 호출 횟수", "예상 Input Tokens", "예상 Output Tokens"]),
        table_row(["구조화 (structurize)", "1회", "~3,000 (프롬프트+이미지)", "~2,500"]),
        table_row(["생성 (generate)", "1회", "~5,000 (시스템+RAG+지문)", "~5,000"]),
        table_row(["검증 (validate) × 5문제", "5회", "~3,500 × 5 = 17,500", "~2,000 × 5 = 10,000"]),
        table_row(["수정 (correction) 1라운드 1문제", "1회 (if needed)", "~4,000", "~1,500"]),
        table_row(["합계 (최악)", "8회", "~29,500", "~19,000"]),
        table_row(["합계 (검증 PASS)", "7회", "~25,500", "~17,500"]),
    ]))
    b.append(para("Sonnet 4.6 기준 약 $0.15~$0.20/요청 (input $3/M + output $15/M)"))
    b.append(para("월 10회 무료 티어 = 약 $1.5~$2.0/월 비용 per 사용자"))
    b.append(divider())

    # ============================================================
    # 5. RAG 시스템 아키텍처
    # ============================================================
    b.append(h1("5. RAG 시스템 아키텍처"))

    b.append(h2("5-1. RAG 데이터 구조"))
    b.append(code_block(
        "data/question_types/\n"
        "├── vocabulary_choice.json\n"
        "├── grammar_choice.json\n"
        "├── blank_inference.json\n"
        "├── sentence_ordering.json\n"
        "├── sentence_insertion.json\n"
        "├── content_match.json\n"
        "├── topic_summary.json\n"
        "├── eng_to_eng.json\n"
        "├── sentence_transform.json\n"
        "└── verb_transform.json\n"
        "\n"
        "각 JSON 파일 구조 (QuestionTypeTemplate):\n"
        "{\n"
        "  \"type_id\": \"vocabulary_choice\",\n"
        "  \"type_name_ko\": \"어휘 선택\",\n"
        "  \"type_name_en\": \"Vocabulary Choice\",\n"
        "  \"description\": \"지문 내 밑줄 친 5개의 단어 중...\",\n"
        "  \"difficulty_range\": [2, 5],\n"
        "  \"instruction_template\": \"다음 글의 밑줄 친 부분 중...\",\n"
        "  \"output_schema\": { ... },       ← 생성 출력 JSON 스키마\n"
        "  \"generation_rules\": [ ... ],    ← 10개 내외 생성 규칙\n"
        "  \"examples\": [ ... ]             ← 2~3개 few-shot 예시\n"
        "}",
        "json"
    ))
    b.append(divider())

    b.append(h2("5-2. RAG 로딩 파이프라인"))
    b.append(code_block(
        "사용자 요청: types=['vocabulary_choice', 'grammar_choice']\n"
        "      │\n"
        "      ▼\n"
        "loadQuestionTypeContext(selectedTypes)\n"
        "  │\n"
        "  ├─ loadTemplateFile('vocabulary_choice')\n"
        "  │   ├─ 캐시 체크: templateCache.has('vocabulary_choice')?\n"
        "  │   │   ├─ HIT → 캐시에서 반환 (0ms, 0 I/O)\n"
        "  │   │   └─ MISS → fs.readFile() → JSON.parse() → 검증 → 캐시 저장\n"
        "  │   └─ TypeContext 추출: { typeId, typeName, rules, schema, examples }\n"
        "  │\n"
        "  └─ loadTemplateFile('grammar_choice')\n"
        "      └─ (동일 프로세스)\n"
        "      │\n"
        "      ▼\n"
        "loadFewShotExamples(types, countPerType=1)\n"
        "  │\n"
        "  ├─ vocabulary_choice: examples[0] → JSON 포맷팅\n"
        "  └─ grammar_choice: examples[0] → JSON 포맷팅\n"
        "  │\n"
        "  ▼\n"
        "buildGenerateUserMessage()에 주입:\n"
        "  INPUT 3: 유형별 규칙 및 스키마\n"
        "  참고 예시 (Few-shot Examples)",
        "plain text"
    ))
    b.append(divider())

    b.append(h2("5-3. 유형별 규칙의 프롬프트 주입 형식"))
    b.append(para("prompt-builder.ts의 formatTypeRules()가 각 유형 컨텍스트를 아래 형식으로 변환:"))
    b.append(code_block(
        "### 유형: vocabulary_choice (Vocabulary Choice / 어휘 선택)\n"
        "설명: 지문 내 밑줄 친 5개의 단어/표현 중 문맥상 적절하지 않은 것\n"
        "난이도 범위: 2–5\n"
        "지시문 템플릿: \"다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?\"\n"
        "생성 규칙:\n"
        "  1. 지문은 150~200 단어의 완결된 영어 단락으로 작성한다.\n"
        "  2. 의미상 중요한 단어 5개를 선택하여 ①②③④⑤ 번호를 붙인다.\n"
        "  3. ①②④⑤ 4개는 올바른 단어, 1개(정답)는 반의어로 교체한다.\n"
        "  ... (총 10개 규칙)\n"
        "출력 스키마:\n"
        "  - question_number: number\n"
        "  - difficulty: number (1-5)\n"
        "  - instruction: string\n"
        "  - passage_with_markers: string (①②③ 마커 포함)\n"
        "  - choices: null\n"
        "  - answer: string (e.g. '③')\n"
        "  - explanation: string (한국어)\n"
        "  - test_point: string",
        "plain text"
    ))
    b.append(divider())

    b.append(h2("5-4. DNA 프로필 RAG 확장"))
    b.append(para("기출 DNA 분석 결과(SchoolDnaProfile)도 RAG의 일부로 프롬프트에 주입된다:"))
    b.append(code_block(
        "// prompt-builder.ts:157-245 — formatDnaProfile()\n"
        "// 주입되는 정보:\n"
        "\n"
        "## 학교 출제 스타일 (DNA 프로필)\n"
        "- 학교: 신목고등학교 (1학년)\n"
        "- 분석 신뢰도: high (3회 시험, 90문항 기반)\n"
        "- 선호 유형: vocabulary_choice 25%, grammar_choice 20%, blank_inference 15%\n"
        "- 평균 난이도: 3.2/5 (쉬움 20% / 보통 50% / 어려움 30%)\n"
        "- 난이도 패턴: 전반부 쉬움→후반부 어려움\n"
        "- 문법 집중: 관계대명사, 분사구문, 가정법, to부정사, 접속사\n"
        "- 어휘 출제: 교과서 핵심 어휘 중심, 동의어/반의어 대비\n"
        "- 오답 구성: 의미상 관련 있으나 미묘하게 다른 선지 선호\n"
        "- 시그니처 패턴: 1지문 2문제 쌍 / 밑줄 5개 중 3번 정답 편중 없음\n"
        "\n"
        "→ 이 프로필이 있으면 Claude가 해당 학교 스타일에 맞춰 문제를 생성",
        "plain text"
    ))
    b.append(divider())

    # ============================================================
    # 6. 에러 핸들링 전략
    # ============================================================
    b.append(h1("6. 에러 핸들링 & 복구 전략"))

    b.append(h2("6-1. 에러 계층 구조"))
    b.append(code_block(
        "AnthropicServiceError (anthropic.ts)\n"
        "  ├── code: 'MISSING_API_KEY' | 'EMPTY_RESPONSE'\n"
        "  └── retryable: boolean\n"
        "\n"
        "GeneratorError (generator.ts)\n"
        "  ├── code: 'JSON_PARSE_ERROR' | 'UNEXPECTED_SHAPE' | 'MISSING_QUESTION_NUMBER' | ...\n"
        "  └── retryable: boolean\n"
        "\n"
        "ValidatorError (validator.ts)\n"
        "  ├── code: 'JSON_PARSE_ERROR' | 'INVALID_SHAPE'\n"
        "  └── retryable: boolean\n"
        "\n"
        "모든 에러 클래스에 retryable 플래그 → withRetry()에서 자동 판단",
        "plain text"
    ))
    b.append(divider())

    b.append(h2("6-2. 실패 시나리오별 복구"))
    b.append(table(3, [
        table_row(["시나리오", "복구 전략", "사용자 영향"]),
        table_row(["Claude API 429/5xx", "withRetry (800ms×2^n, 3회)", "지연 발생, 자동 복구"]),
        table_row(["JSON 파싱 실패", "retryable=true → 재시도", "자동 복구"]),
        table_row(["검증 API 실패", "synthetic FAIL 생성 → correction loop", "해당 문제 재생성"]),
        table_row(["correction 자체 실패", "기존 원본 유지 (break)", "불완전하지만 반환"]),
        table_row(["MAX_ROUNDS 초과", "valid만 반환, FAIL 제외", "문제 수 감소 가능"]),
        table_row(["RAG 템플릿 누락", "해당 유형 스킵, 나머지 진행", "일부 유형 미생성"]),
    ]))
    b.append(divider())

    # ============================================================
    # 7. 향후 최적화 로드맵
    # ============================================================
    b.append(h1("7. 향후 최적화 로드맵"))

    b.append(h3("검증 병렬화"))
    b.append(para("현재: 5문제 × 1 validate API 호출 = 순차 5회 (~15초)"))
    b.append(para("목표: Promise.allSettled()로 병렬화 → ~3초 (5x 속도 향상)"))
    b.append(para("주의: Anthropic API rate limit 고려 필요 (concurrent request 제한)"))

    b.append(h3("Anthropic Prompt Caching 활용"))
    b.append(para("system prompt를 cache_control: {type: 'ephemeral'}로 마킹하면 동일 시스템 프롬프트의 반복 호출 시 input token 비용 90% 절감 가능. 현재는 미적용."))

    b.append(h3("Streaming 검증"))
    b.append(para("검증 결과를 SSE로 실시간 전달하여 사용자가 문제 생성 진행 상황을 세밀하게 볼 수 있도록 개선."))

    b.append(h3("토큰 버짓 관리"))
    b.append(para("usage 객체에서 반환되는 input_tokens/output_tokens를 추적하여 사용자별 토큰 소비량 모니터링 및 비용 최적화."))

    b.append(h3("코드 레벨 정적 검증 추가"))
    b.append(para("AI 검증 전에 코드로 체크 가능한 항목(JSON 스키마 준수, 선지 개수, 정답 형식)을 사전 필터링하여 불필요한 validate API 호출 제거."))
    b.append(divider())

    b.append(callout("이 문서는 실제 소스코드(generator.ts, validator.ts, rag.ts, prompt-builder.ts, anthropic.ts)를 분석하여 작성되었습니다.\n코드 라인 번호, 변수명, 함수 시그니처 모두 실제 구현과 일치합니다.\n2026-03-29 | Claude Code (CTO 관점)", "🔬"))

    return b


def main():
    print("=== 기술 심층 문서 작성 시작 ===\n")

    pid = create_page(PARENT_PAGE_ID, "🧠 CTO Deep-Dive: 에이전트 루프 · 토큰 최적화 · RAG 아키텍처", "🧠")
    if not pid:
        return

    blocks = build_blocks()
    print(f"  {len(blocks)}개 블록 추가 중...")
    append_blocks(pid, blocks)

    print(f"\n=== 완료! ===")
    print(f"페이지: https://www.notion.so/{pid.replace('-', '')}")


if __name__ == "__main__":
    main()
