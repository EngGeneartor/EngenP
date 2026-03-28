/**
 * prompt-builder.ts
 * Prompt Assembly Service — server-side only.
 *
 * Separates static system prompts from dynamic RAG-injected content.
 * Reads prompt templates from data/prompts/ files (never hardcodes them).
 *
 * Key principle: system prompt = static rules, user message = RAG-injected
 * dynamic content (passage, type contexts, few-shot examples, options).
 *
 * Public API:
 *   buildStructurizeSystemPrompt(passageId)                          → string
 *   buildGenerateSystemPrompt()                                      → string
 *   buildGenerateUserMessage(passage, typeContexts, examples, opts)  → string
 *   buildValidateSystemPrompt()                                      → string
 *   buildValidateUserMessage(question, passage)                      → string
 *   buildCorrectionMessage(failed, feedback, passage, typeContexts)  → string
 */

import path from 'path'
import fs from 'fs/promises'
import type {
  StructuredPassage,
  GeneratedQuestion,
  GenerationOptions,
  TypeContext,
  DetailedValidationResult,
} from '@/lib/types'

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

const PROMPTS_DIR = path.join(process.cwd(), 'data', 'prompts')

// -----------------------------------------------------------
// In-memory cache for prompt files
// -----------------------------------------------------------

const promptCache: Map<string, string> = new Map()

/**
 * Read a prompt template file. Cached after first read.
 */
async function loadPromptFile(filename: string): Promise<string> {
  if (promptCache.has(filename)) {
    return promptCache.get(filename)!
  }

  const filePath = path.join(PROMPTS_DIR, filename)
  const content = await fs.readFile(filePath, 'utf-8')
  promptCache.set(filename, content)
  return content
}

// -----------------------------------------------------------
// Formatting helpers
// -----------------------------------------------------------

/**
 * Format a TypeContext into a compact prompt section with rules and schema.
 */
function formatTypeRules(ctx: TypeContext): string {
  const rulesStr = ctx.generationRules
    .map((r, i) => `  ${i + 1}. ${r}`)
    .join('\n')

  const schemaStr = Object.entries(ctx.outputSchema)
    .map(([k, v]) => `  - ${k}: ${v ?? 'null'}`)
    .join('\n')

  return (
    `### 유형: ${ctx.typeId} (${ctx.typeName} / ${ctx.typeNameKo})\n` +
    `설명: ${ctx.description}\n` +
    `난이도 범위: ${ctx.difficultyRange[0]}–${ctx.difficultyRange[1]}\n` +
    `지시문 템플릿: "${ctx.instructionTemplate}"\n` +
    `생성 규칙:\n${rulesStr}\n` +
    `출력 스키마:\n${schemaStr}`
  )
}

/**
 * Serialize passage for prompt injection. Includes metadata and full text.
 */
function formatPassageForPrompt(passage: StructuredPassage): string {
  const lines: string[] = [
    `제목: ${passage.title ?? '(untitled)'}`,
    `단어 수: ${passage.wordCount}`,
    `추정 난이도: ${passage.estimatedDifficulty}/5`,
    `주제: ${passage.topics.join(', ')}`,
    `단락 수: ${passage.paragraphs.length}`,
    '',
    '전문 (Full text):',
    '"""',
    passage.fullText,
    '"""',
  ]

  // Include per-paragraph sentence-level detail for the generation prompt
  if (passage.paragraphs.length > 0) {
    lines.push('')
    lines.push('단락별 문장 구조:')
    for (const para of passage.paragraphs) {
      lines.push(`  단락 ${para.index}:`)
      for (const sent of para.sentences) {
        lines.push(`    [${para.index}.${sent.index}] ${sent.text}`)
      }
    }
  }

  // Include key vocabulary if available
  if (passage.keyVocab && passage.keyVocab.length > 0) {
    lines.push('')
    lines.push('핵심 어휘:')
    for (const v of passage.keyVocab) {
      lines.push(`  - ${v.word} (${v.pos}): ${v.definitionKo ?? v.definition}`)
    }
  }

  return lines.join('\n')
}

// -----------------------------------------------------------
// Public API: Structurize prompts
// -----------------------------------------------------------

/**
 * Build the system prompt for passage structurization (Stage 1).
 * Reads from data/prompts/structurize_passage.txt and injects the passage ID.
 */
export async function buildStructurizeSystemPrompt(passageId: string): Promise<string> {
  let template = await loadPromptFile('structurize_passage.txt')
  // Replace the placeholder passage_id with the actual ID
  template = template.replace('"passage_id": "auto"', `"passage_id": "${passageId}"`)
  return template
}

// -----------------------------------------------------------
// Public API: Generate prompts
// -----------------------------------------------------------

/**
 * Build the static system prompt for question generation (Stage 2).
 * Reads from data/prompts/generate_questions.txt.
 *
 * This prompt contains the universal constraints and rules that apply
 * to every generation request regardless of question types or passage.
 */
export async function buildGenerateSystemPrompt(): Promise<string> {
  return loadPromptFile('generate_questions.txt')
}

/**
 * Build the dynamic user message for question generation.
 * Assembled with RAG-loaded type contexts, few-shot examples, and options.
 */
export function buildGenerateUserMessage(
  passage: StructuredPassage,
  typeContexts: TypeContext[],
  fewShotExamples: string,
  options: GenerationOptions
): string {
  const typeRulesSection = typeContexts
    .map((t) => formatTypeRules(t))
    .join('\n\n---\n\n')

  const perTypeCount = Math.max(1, Math.ceil(options.count / typeContexts.length))

  return `## INPUT 1: 구조화된 지문 (Structured Passage)

${formatPassageForPrompt(passage)}

---

## INPUT 2: 생성 요청 (Generation Request)

\`\`\`json
{
  "question_types": ${JSON.stringify(typeContexts.map((t) => t.typeId))},
  "count_per_type": ${perTypeCount},
  "target_difficulty": ${options.difficulty},
  "difficulty_variance": 1,
  "passage_coverage": "full",
  "school_profile": null
}
\`\`\`

---

## INPUT 3: 유형별 규칙 및 스키마 (Type Rules & Schemas)

${typeRulesSection}

---

## 참고 예시 (Few-shot Examples)

${fewShotExamples}

---

## 최종 생성 지시

- 목표 난이도: ${options.difficulty}/5
- 총 문항 수: ${options.count}
- 유형 배분: ${typeContexts.map((t) => `${t.typeId} (${t.typeNameKo})`).join(', ')}
- 설명 언어: ${options.explanationLanguage === 'en' ? 'English' : '한국어 (Korean)'}
${options.topicHints?.length ? `- 주제 힌트: ${options.topicHints.join(', ')}` : ''}

위 지문과 규칙에 따라 ${options.count}개의 변형문제를 JSON 배열로 생성하세요.
question_number는 1부터 순차적으로 부여하세요.`
}

// -----------------------------------------------------------
// Public API: Validation prompts
// -----------------------------------------------------------

/**
 * Build the system prompt for question validation (Stage 3).
 * Reads from data/prompts/validate_question.txt.
 */
export async function buildValidateSystemPrompt(): Promise<string> {
  return loadPromptFile('validate_question.txt')
}

/**
 * Build the user message for validating a single question.
 * The enhanced validator checks one question at a time for thorough 7-check analysis.
 */
export function buildValidateUserMessage(
  question: GeneratedQuestion,
  passage: StructuredPassage
): string {
  return `## INPUT 1: 원본 구조화 지문 (Original Structured Passage JSON)

\`\`\`json
${JSON.stringify(
  {
    passage_id: passage.id,
    title: passage.title,
    word_count: passage.wordCount,
    overall_difficulty: passage.estimatedDifficulty,
    topics: passage.topics,
    paragraphs: passage.paragraphs.map((p) => ({
      index: p.index,
      text: p.rawText,
      sentences: p.sentences.map((s) => ({
        index: s.index,
        text: s.text,
      })),
    })),
  },
  null,
  2
)}
\`\`\`

---

## INPUT 2: 검증 대상 문제 (Question to Validate)

\`\`\`json
${JSON.stringify(question, null, 2)}
\`\`\`

---

위 원본 지문을 기준으로 이 문제를 7가지 체크리스트에 따라 검증하고 결과를 JSON으로 출력하세요.`
}

// -----------------------------------------------------------
// Public API: Correction prompts
// -----------------------------------------------------------

/**
 * Build a correction prompt for re-generating only the failed questions.
 * Includes the validation feedback so Claude knows what to fix.
 */
export function buildCorrectionMessage(
  failedQuestions: GeneratedQuestion[],
  validationResults: DetailedValidationResult[],
  passage: StructuredPassage,
  typeContexts: TypeContext[]
): string {
  // Build per-question feedback sections
  const feedbackSections = failedQuestions.map((q) => {
    const valResult = validationResults.find((v) => v.question_number === q.question_number)
    if (!valResult) {
      return `### 문제 ${q.question_number} (${q.type_id})\n피드백 없음 — 재생성 필요`
    }

    const failedChecks = Object.entries(valResult.checks)
      .filter(([, check]) => check.verdict === 'FAIL')
      .map(([name, check]) => `  - ${name}: ${check.details}`)
      .join('\n')

    const patches = valResult.patch_suggestions
      .map((p) => `  - [${p.field}] ${p.issue} → ${p.suggested_fix}`)
      .join('\n')

    return (
      `### 문제 ${q.question_number} (${q.type_id}) — ${valResult.corrective_action}\n` +
      `점수: ${valResult.quality_score}/100\n` +
      `실패한 검증 항목:\n${failedChecks || '  (없음)'}\n` +
      `수정 제안:\n${patches || '  (없음)'}`
    )
  }).join('\n\n')

  // Only include type rules for the types that need correction
  const relevantTypeIds = [...new Set(failedQuestions.map((q) => q.type_id))]
  const relevantContexts = typeContexts.filter((t) => relevantTypeIds.includes(t.typeId))
  const typeRulesSection = relevantContexts
    .map((t) => formatTypeRules(t))
    .join('\n\n---\n\n')

  return `## 수정 요청 (Correction Request)

다음 문제들이 검증에서 실패했습니다. 아래 피드백을 반영하여 수정된 문제를 생성하세요.

---

## 원본 지문

${formatPassageForPrompt(passage)}

---

## 실패한 문제 및 피드백

${feedbackSections}

---

## 해당 유형 규칙 (참고)

${typeRulesSection}

---

## 지시

- 위 피드백을 반영하여 실패한 ${failedQuestions.length}개의 문제를 다시 생성하세요.
- 각 문제의 question_number는 원래 번호를 유지하세요: ${failedQuestions.map((q) => q.question_number).join(', ')}
- 모든 제약 조건(외부 지문 사용 금지, 답의 명확성, 포맷 일관성 등)을 준수하세요.
- JSON 배열로 출력하세요.`
}

/**
 * Clear the in-memory prompt cache.
 */
export function clearPromptCache(): void {
  promptCache.clear()
}
