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
  SchoolDnaProfile,
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
 * Format a SchoolDnaProfile into a concise prompt section for the generator.
 */
function formatDnaProfile(dna: SchoolDnaProfile): string {
  const lines: string[] = ['## 학교 출제 스타일 (DNA 프로필)']

  // School identity
  if (dna.school_name) {
    lines.push(`- 학교: ${dna.school_name}${dna.grade ? ` (${dna.grade}학년)` : ''}`)
  }

  // Confidence & analysis basis
  const basis = dna.analysis_basis
  if (basis) {
    lines.push(
      `- 분석 신뢰도: ${basis.confidence_level} ` +
      `(${basis.total_exams_analyzed}회 시험, ${basis.total_questions_analyzed}문항 기반)`
    )
  }

  // Preferred question type distribution
  if (dna.preferred_question_types && dna.preferred_question_types.length > 0) {
    const dist = dna.question_type_distribution ?? {}
    const typeEntries = dna.preferred_question_types
      .map((t) => {
        const stats = dist[t]
        if (!stats) return t
        return `${t} ${Math.round(stats.presence_rate * 100)}%`
      })
      .join(', ')
    lines.push(`- 선호 유형: ${typeEntries}`)
  }

  // Difficulty
  lines.push(`- 평균 난이도: ${dna.average_difficulty}/5 (쉬움 ${Math.round(dna.easy_ratio * 100)}% / 보통 ${Math.round(dna.medium_ratio * 100)}% / 어려움 ${Math.round(dna.hard_ratio * 100)}%)`)
  if (dna.difficulty_trend) {
    lines.push(`- 난이도 패턴: ${dna.difficulty_trend}`)
  }

  // Grammar focus
  const gf = dna.grammar_focus
  if (gf?.top_grammar_points && gf.top_grammar_points.length > 0) {
    const topGrammar = gf.top_grammar_points
      .slice(0, 5)
      .map((g) => g.grammar_point_ko)
      .join(', ')
    lines.push(`- 문법 집중: ${topGrammar}`)
  }
  if (gf?.grammar_style_notes) {
    lines.push(`- 문법 스타일: ${gf.grammar_style_notes}`)
  }

  // Vocabulary style
  const vs = dna.vocabulary_testing_style
  if (vs) {
    lines.push(`- 어휘 출제: ${vs.vocab_style_notes ?? ''}`)
    if (vs.preferred_vocab_themes && vs.preferred_vocab_themes.length > 0) {
      lines.push(`- 어휘 주제: ${vs.preferred_vocab_themes.join(', ')}`)
    }
  }

  // Wrong answer / distractor patterns
  const wp = dna.wrong_answer_patterns
  if (wp?.distractor_notes) {
    lines.push(`- 오답 구성: ${wp.distractor_notes}`)
  }

  // Signature patterns
  const insights = dna.exam_construction_insights
  if (insights?.signature_patterns && insights.signature_patterns.length > 0) {
    lines.push(`- 시그니처 패턴: ${insights.signature_patterns.join(' / ')}`)
  }

  // Generation guidelines from the DNA profile
  const gl = dna.generation_guidelines
  if (gl) {
    if (gl.vocab_construction_rule) {
      lines.push(`- 어휘 문제 구성 원칙: ${gl.vocab_construction_rule}`)
    }
    if (gl.distractor_construction_rule) {
      lines.push(`- 오답 구성 원칙: ${gl.distractor_construction_rule}`)
    }
    if (gl.difficulty_allocation) {
      lines.push(`- 난이도 배분: ${gl.difficulty_allocation}`)
    }
    if (gl.grammar_priority_list && gl.grammar_priority_list.length > 0) {
      lines.push(`- 어법 우선순위: ${gl.grammar_priority_list.join(', ')}`)
    }
  }

  return lines.join('\n')
}

/**
 * Build the dynamic user message for question generation.
 * Assembled with RAG-loaded type contexts, few-shot examples, and options.
 */
export function buildGenerateUserMessage(
  passage: StructuredPassage,
  typeContexts: TypeContext[],
  fewShotExamples: string,
  options: GenerationOptions,
  dnaProfile?: SchoolDnaProfile
): string {
  const typeRulesSection = typeContexts
    .map((t) => formatTypeRules(t))
    .join('\n\n---\n\n')

  const perTypeCount = Math.max(1, Math.ceil(options.count / typeContexts.length))

  // Build the DNA section if a profile is provided
  const dnaSection = dnaProfile
    ? `\n---\n\n${formatDnaProfile(dnaProfile)}\n`
    : ''

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
  "school_profile": ${dnaProfile ? `"${dnaProfile.profile_id}"` : 'null'}
}
\`\`\`
${dnaSection}
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
${dnaProfile ? `- DNA 프로필 적용: 위 [학교 출제 스타일] 섹션의 지침을 따라 해당 학교의 출제 스타일에 맞게 문제를 생성하세요.` : ''}

위 지문과 규칙에 따라 ${options.count}개의 변형문제를 JSON 배열로 생성하세요.
question_number는 1부터 순차적으로 부여하세요.`
}

// -----------------------------------------------------------
// Public API: Workbook prompts
// -----------------------------------------------------------

/**
 * Build the static system prompt for workbook generation.
 * Reads from data/prompts/workbook_generate.txt.
 *
 * Workbook mode uses a completely separate prompt template
 * with its own 10 question type specifications and formatting rules.
 */
export async function buildWorkbookSystemPrompt(): Promise<string> {
  return loadPromptFile('workbook_generate.txt')
}

/**
 * Build the dynamic user message for workbook generation.
 * Formatted specifically for the workbook prompt template's expected input.
 */
export function buildWorkbookUserMessage(
  passage: StructuredPassage,
  typeContexts: TypeContext[],
  options: GenerationOptions
): string {
  const typeIds = typeContexts.map((t) => t.typeId)

  return `## 입력 지문 (Passage)

${formatPassageForPrompt(passage)}

---

## 생성 요청 (Generation Request)

\`\`\`json
{
  "passage_text": ${JSON.stringify(passage.fullText)},
  "passage_source": ${JSON.stringify(passage.title ?? passage.topics?.join(', ') ?? '(unknown)')},
  "question_types": ${JSON.stringify(typeIds)},
  "difficulty": ${options.difficulty}
}
\`\`\`

---

## 최종 생성 지시

- 목표 난이도: ${options.difficulty}/5
- 요청 유형: ${typeIds.join(', ')}
- 설명 언어: ${options.explanationLanguage === 'en' ? 'English' : '한국어 (Korean)'}
- 전수 유형(03 동사변형, 08 단어배열, 09 해석쓰기, 10 영작)은 모든 문장을 순서대로 빠짐없이 문제화하세요.
- 지문 전체 포함 유형(01 어휘선택, 02 어법선택, 04 오류수정, 05 TF, 06 순서, 07 삽입)은 지문 전체를 문제 지문에 포함하세요.

위 지문과 규칙에 따라 워크북 문제를 JSON 형식으로 생성하세요.`
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
