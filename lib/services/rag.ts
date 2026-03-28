/**
 * rag.ts
 * RAG (Retrieval-Augmented Generation) Service — server-side only.
 *
 * Selectively loads question-type templates from data/question_types/
 * based on the user's chosen types. Extracts generation rules, output
 * schemas, and few-shot examples for prompt injection.
 *
 * Key principle: only load what's needed — never stuff all 10 types
 * into a single prompt.
 *
 * Public API:
 *   loadQuestionTypeContext(selectedTypes)        → TypeContext[]
 *   loadFewShotExamples(types, countPerType)      → string
 *   loadAllAvailableTypeIds()                     → QuestionTypeId[]
 */

import path from 'path'
import fs from 'fs/promises'
import type {
  QuestionTypeId,
  QuestionTypeTemplate,
  TypeContext,
} from '@/lib/types'

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

const QUESTION_TYPES_DIR = path.join(process.cwd(), 'data', 'question_types')

// -----------------------------------------------------------
// In-memory cache
// -----------------------------------------------------------

const templateCache: Map<QuestionTypeId, QuestionTypeTemplate> = new Map()

// -----------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------

/**
 * Load and parse a single template JSON file from disk.
 * Results are cached for the lifetime of the process.
 */
async function loadTemplateFile(typeId: QuestionTypeId): Promise<QuestionTypeTemplate | null> {
  if (templateCache.has(typeId)) {
    return templateCache.get(typeId)!
  }

  const filePath = path.join(QUESTION_TYPES_DIR, `${typeId}.json`)
  let raw: string
  try {
    raw = await fs.readFile(filePath, 'utf-8')
  } catch {
    console.warn(`[rag] Template file not found for type "${typeId}" at ${filePath}`)
    return null
  }

  let template: QuestionTypeTemplate
  try {
    template = JSON.parse(raw) as QuestionTypeTemplate
  } catch (err) {
    console.error(`[rag] Failed to parse template JSON for "${typeId}":`, err)
    return null
  }

  if (!template.type_id || !template.generation_rules || !template.output_schema) {
    console.error(`[rag] Template for "${typeId}" is missing required fields`)
    return null
  }

  templateCache.set(typeId, template)
  return template
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Load question type context for the selected types only.
 * Extracts the fields needed for prompt injection — generation rules,
 * output schema, and examples — without including the raw template.
 *
 * Skips types whose template files are missing or invalid.
 *
 * @param selectedTypes  Array of QuestionTypeId strings to load
 * @returns              Array of TypeContext objects ready for prompt injection
 */
export async function loadQuestionTypeContext(
  selectedTypes: QuestionTypeId[]
): Promise<TypeContext[]> {
  const contexts: TypeContext[] = []

  for (const typeId of selectedTypes) {
    const template = await loadTemplateFile(typeId)
    if (!template) continue

    contexts.push({
      typeId: template.type_id,
      typeName: template.type_name_en,
      typeNameKo: template.type_name_ko,
      description: template.description,
      difficultyRange: template.difficulty_range,
      instructionTemplate: template.instruction_template,
      generationRules: template.generation_rules,
      outputSchema: template.output_schema,
      examples: template.examples,
    })
  }

  if (contexts.length === 0) {
    throw new Error(
      `[rag] None of the requested question types could be loaded: ${selectedTypes.join(', ')}`
    )
  }

  return contexts
}

/**
 * Build a formatted few-shot example string from the loaded templates.
 * Selects up to `countPerType` examples from each requested type.
 *
 * @param types         Question type IDs to pull examples from
 * @param countPerType  Maximum examples per type (default: 1)
 * @returns             Formatted few-shot string ready for prompt injection
 */
export async function loadFewShotExamples(
  types: QuestionTypeId[],
  countPerType: number = 1
): Promise<string> {
  const sections: string[] = []

  for (const typeId of types) {
    const template = await loadTemplateFile(typeId)
    if (!template || !template.examples || template.examples.length === 0) continue

    const examples = template.examples.slice(0, countPerType)
    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i]
      sections.push(
        `### 예시: ${template.type_name_ko} (${template.type_name_en})\n` +
        `\`\`\`json\n${JSON.stringify(ex, null, 2)}\n\`\`\``
      )
    }
  }

  if (sections.length === 0) {
    return '(참고 예시 없음)'
  }

  return sections.join('\n\n')
}

/**
 * List all available question type IDs by scanning the templates directory.
 * Useful for admin UIs or validation of user input.
 */
export async function loadAllAvailableTypeIds(): Promise<QuestionTypeId[]> {
  let files: string[]
  try {
    files = await fs.readdir(QUESTION_TYPES_DIR)
  } catch {
    return []
  }

  return files
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', '') as QuestionTypeId)
    .sort()
}

/**
 * Get the raw QuestionTypeTemplate objects for the selected types.
 * Used when the caller needs the full template (e.g., for legacy compatibility).
 */
export async function loadRawTemplates(
  typeIds: QuestionTypeId[]
): Promise<QuestionTypeTemplate[]> {
  const templates: QuestionTypeTemplate[] = []
  for (const typeId of typeIds) {
    const template = await loadTemplateFile(typeId)
    if (template) templates.push(template)
  }
  return templates
}

/**
 * Clear the in-memory template cache.
 * Useful in tests or when templates are updated at runtime.
 */
export function clearTemplateCache(): void {
  templateCache.clear()
}
