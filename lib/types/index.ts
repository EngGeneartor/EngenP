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

/** Generation mode determines which prompt template and rules to use */
export type GenerationMode = 'variation' | 'workbook' | 'mock_exam'

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
  /** Generation mode: 'variation' (default), 'workbook', or 'mock_exam' */
  generationMode?: GenerationMode
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
// RAG / Prompt Builder types
// -----------------------------------------------------------

/** Context loaded from a question type template for RAG injection */
export interface TypeContext {
  typeId: QuestionTypeId
  typeName: string
  typeNameKo: string
  description: string
  difficultyRange: [number, number]
  instructionTemplate: string
  generationRules: string[]
  outputSchema: Record<string, string | null>
  examples: GeneratedQuestion[]
}

// -----------------------------------------------------------
// Validation types (enhanced with per-check granularity)
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

/** Verdict for a single validation check */
export type CheckVerdict = 'PASS' | 'WARN' | 'FAIL' | 'SKIP'

/** Per-check detail from the enhanced validator */
export interface ValidationCheckDetail {
  verdict: CheckVerdict
  details: string
  [key: string]: unknown
}

/** Enhanced per-question validation result from the Stage 3 prompt */
export interface DetailedValidationResult {
  validation_id: string
  passage_id: string
  question_number: number
  question_type: string
  overall_verdict: 'PASS' | 'WARN' | 'FAIL'
  corrective_action: 'REGENERATE' | 'PATCH' | 'ESCALATE' | null
  checks: Record<string, ValidationCheckDetail>
  patch_suggestions: Array<{
    field: string
    issue: string
    suggested_fix: string
  }>
  quality_score: number
  validator_notes: string
}

// -----------------------------------------------------------
// School DNA Profile types (Exam DNA Analysis)
// -----------------------------------------------------------

/** Distribution stats for a single question type */
export interface QuestionTypeStats {
  total_count: number
  average_per_exam: number
  presence_rate: number
}

/** Grammar focus point */
export interface GrammarFocusPoint {
  grammar_point: string
  grammar_point_ko: string
  frequency: number
  recency_weight: number
}

/** Recommended question type for generated exams */
export interface RecommendedTypeMix {
  type: string
  count: number
  difficulty_target: number
}

/** Reliability warning */
export interface ReliabilityWarning {
  warning_type: 'INSUFFICIENT_DATA' | 'INCONSISTENT_PATTERN' | 'SINGLE_TEACHER_ASSUMPTION' | 'OTHER'
  description: string
  affected_domains: string[]
}

/**
 * Full Exam DNA profile extracted from past school exam papers.
 * This is the rich profile returned by the AI DNA analysis stage.
 */
export interface SchoolDnaProfile {
  profile_id: string
  school_name?: string
  school_id?: string
  grade?: number
  analysis_basis: {
    total_exams_analyzed: number
    total_questions_analyzed: number
    exam_periods: string[]
    confidence_level: 'LOW' | 'MEDIUM' | 'HIGH'
    analysis_date: string
  }
  question_type_distribution: Record<string, QuestionTypeStats>
  preferred_question_types: string[]
  difficulty_distribution: Record<string, number>
  average_difficulty: number
  easy_ratio: number
  medium_ratio: number
  hard_ratio: number
  difficulty_trend: string
  grammar_focus: {
    top_grammar_points: GrammarFocusPoint[]
    grammar_blind_spots: string[]
    grammar_style_notes: string
  }
  vocabulary_testing_style: {
    antonym_swap_rate: number
    semantic_field_swap_rate: number
    positive_negative_contrast_rate: number
    direction_contrast_rate: number
    connotation_contrast_rate: number
    preferred_vocab_themes: string[]
    difficulty_level: number
    pos_distribution: Record<string, number>
    vocab_style_notes: string
  }
  wrong_answer_patterns: {
    passage_word_recycling_rate: number
    extreme_meaning_rate: number
    partial_truth_rate: number
    scope_mismatch_rate: number
    adjacent_paragraph_confusion_rate: number
    distractor_sophistication: number
    distractor_notes: string
  }
  subjective_question_patterns: {
    total_subjective_count: number
    subjective_score_ratio: number
    common_subtypes: string[]
    grammar_points_in_subjective: string[]
    answer_length_tendency: string
    korean_to_english_rate: number
    subjective_notes: string
  }
  exam_construction_insights: {
    total_questions_per_exam: number
    total_score: number
    question_numbering_style: string
    passage_source_preferences: string[]
    topic_preferences: string[]
    signature_patterns: string[]
  }
  generation_guidelines: {
    recommended_type_mix: RecommendedTypeMix[]
    grammar_priority_list: string[]
    vocab_construction_rule: string
    distractor_construction_rule: string
    difficulty_allocation: string
  }
  reliability_warnings: ReliabilityWarning[]
  raw_exam_data: Array<{
    exam_period: string
    total_questions: number
    questions_by_type: Record<string, number>
    ocr_quality: 'GOOD' | 'FAIR' | 'POOR'
    notes: string | null
  }>
}

// -----------------------------------------------------------
// Export types
// -----------------------------------------------------------

export interface ExportOptions {
  format: 'docx' | 'pdf' | 'json' | 'hwpx'
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
  /** DB row ID from user_files table (undefined for legacy in-memory entries) */
  id?: string
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
  format: ExportOptions['format'] // 'docx' | 'pdf' | 'json' | 'hwpx'
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
