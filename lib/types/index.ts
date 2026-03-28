// ============================================================
// All shared TypeScript interfaces for the EngenP project
// ============================================================

// -----------------------------------------------------------
// Passage / Structurization types
// -----------------------------------------------------------

/** A single sentence extracted from a passage */
export interface Sentence {
  index: number
  text: string
  /** Circled-number marker, e.g. "①", if the sentence carries one */
  marker?: string
}

/** A paragraph within a structured passage */
export interface Paragraph {
  index: number
  sentences: Sentence[]
  rawText: string
}

/** Key vocabulary item identified in a passage */
export interface KeyVocab {
  word: string
  pos: string // Part of speech: noun, verb, adj, adv, …
  definition: string
  definitionKo?: string
  sentenceIndex: number
}

/** The fully structured representation of an uploaded reading passage */
export interface StructuredPassage {
  /** Unique identifier – usually the Supabase storage path of the source file */
  id: string
  title?: string
  paragraphs: Paragraph[]
  keyVocab: KeyVocab[]
  /** Plain concatenated text of the whole passage */
  fullText: string
  wordCount: number
  /** Estimated CEFR/수능 difficulty level, 1-5 */
  estimatedDifficulty: number
  /** Topic/genre tags inferred by Claude, e.g. ["science", "environment"] */
  topics: string[]
  /** ISO timestamp when structurization was performed */
  structurizedAt: string
  /** Metadata forwarded from the original uploaded file */
  sourceFile?: UploadedFile
}

// -----------------------------------------------------------
// Question generation types
// -----------------------------------------------------------

/**
 * Identifiers matching the JSON files in data/question_types/
 * Extend this union as new type files are added.
 */
export type QuestionTypeId =
  | 'vocabulary_choice'
  | 'main_idea'
  | 'order'
  | 'blank_filling'
  | 'summary'
  | 'grammar'
  | 'true_false'
  | string // allow future types without breaking builds

/** Metadata loaded from a data/question_types/<id>.json file */
export interface QuestionTypeTemplate {
  type_id: QuestionTypeId
  type_name_ko: string
  type_name_en: string
  description: string
  difficulty_range: [number, number]
  instruction_template: string
  output_schema: Record<string, string | null>
  generation_rules: string[]
  examples: GeneratedQuestion[]
}

/** Options passed to the generator service */
export interface GenerationOptions {
  /** Which question type IDs to generate */
  types: QuestionTypeId[]
  /** Target difficulty on a 1-5 scale */
  difficulty: number
  /** Total number of questions to produce (distributed across types) */
  count: number
  /** BCP-47 language tag for explanations; defaults to "ko" */
  explanationLanguage?: string
  /** Seed text / topic hints to bias generation */
  topicHints?: string[]
}

/** A single generated exam question */
export interface GeneratedQuestion {
  /** Sequential question number within the exam */
  question_number: number
  type_id: QuestionTypeId
  difficulty: number
  instruction: string
  /** Passage text, possibly annotated with ①②③④⑤ markers */
  passage_with_markers?: string
  /** Multiple-choice answers; null for question types that don't use them */
  choices: string[] | null
  answer: string
  /** Korean (or target-language) explanation */
  explanation: string
  test_point: string
  /** Raw passage used for this question (may differ from structurized text) */
  rawPassage?: string
}

// -----------------------------------------------------------
// Validation types
// -----------------------------------------------------------

/** Result of validating a single question */
export interface QuestionValidationIssue {
  questionNumber: number
  field: string
  severity: 'error' | 'warning'
  message: string
}

/** Aggregate validation result for a batch of questions */
export interface ValidationResult {
  valid: boolean
  issues: QuestionValidationIssue[]
  /** Questions that failed validation and need to be regenerated */
  invalidQuestionNumbers: number[]
}

// -----------------------------------------------------------
// Export types
// -----------------------------------------------------------

export interface ExportOptions {
  format: 'docx' | 'pdf' | 'json'
  includeAnswers: boolean
  includeExplanations: boolean
  /** Korean school name to appear in the header */
  schoolName?: string
  examTitle?: string
  examDate?: string
}

// -----------------------------------------------------------
// File upload types (kept from lib/types.ts)
// -----------------------------------------------------------

export interface UploadedFile {
  name: string
  size: number
  path: string
  type: string // MIME type
  uploadedAt: Date
  publicUrl?: string
}

// -----------------------------------------------------------
// Supabase / Database types
// -----------------------------------------------------------

/** Row in the `passages` table */
export interface PassageRow {
  id: string
  user_id: string
  title: string | null
  source_file_path: string | null
  source_file_url: string | null
  structured_data: StructuredPassage | null
  word_count: number | null
  estimated_difficulty: number | null
  topics: string[] | null
  created_at: string
  updated_at: string
}

/** Row in the `exams` table */
export interface ExamRow {
  id: string
  user_id: string
  passage_id: string
  title: string | null
  generation_options: GenerationOptions | null
  questions: GeneratedQuestion[] | null
  validation_result: ValidationResult | null
  status: 'draft' | 'generating' | 'ready' | 'exported' | 'error'
  error_message: string | null
  created_at: string
  updated_at: string
}

/** Row in the `exports` table */
export interface ExportRow {
  id: string
  exam_id: string
  user_id: string
  format: ExportOptions['format']
  options: ExportOptions | null
  file_path: string | null
  file_url: string | null
  created_at: string
}

/** Supabase database schema helper (pass as the generic param to createClient) */
export interface Database {
  public: {
    Tables: {
      passages: {
        Row: PassageRow
        Insert: Omit<PassageRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PassageRow, 'id' | 'created_at'>>
      }
      exams: {
        Row: ExamRow
        Insert: Omit<ExamRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ExamRow, 'id' | 'created_at'>>
      }
      exports: {
        Row: ExportRow
        Insert: Omit<ExportRow, 'id' | 'created_at'>
        Update: Partial<Omit<ExportRow, 'id' | 'created_at'>>
      }
    }
  }
}
