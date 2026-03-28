'use server'

/**
 * exporter.ts
 * Document Export Service — server-side only.
 *
 * STUB: Full implementation is handled by a separate agent.
 * This module defines the public interface and exports a placeholder
 * implementation so that other parts of the codebase can import and call
 * the functions without compilation errors.
 *
 * Once the real implementation is ready, replace the bodies of the
 * exported functions below while keeping the signatures identical.
 *
 * Public API:
 *   exportToDocx(questions, passage, options?) → Blob
 *   exportToJson(questions, passage, options?)  → Blob
 */

import type { GeneratedQuestion, StructuredPassage, ExportOptions } from '@/lib/types'

// -----------------------------------------------------------
// Error class
// -----------------------------------------------------------

export class ExporterError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = 'ExporterError'
  }
}

// -----------------------------------------------------------
// Export result shape
// -----------------------------------------------------------

export interface ExportResult {
  /** The exported file as a Blob (can be written to Supabase Storage or sent to the browser) */
  blob: Blob
  /** Suggested filename including extension, e.g. "exam_2026-03-28.docx" */
  filename: string
  /** MIME type of the Blob, e.g. "application/vnd.openxmlformats-officedocument.wordprocessingml.document" */
  mimeType: string
  /** Size of the Blob in bytes */
  sizeBytes: number
}

// -----------------------------------------------------------
// Helpers (stubs)
// -----------------------------------------------------------

function buildFilename(prefix: string, extension: string): string {
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return `${prefix}_${date}.${extension}`
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Export questions and passage to a .docx file.
 *
 * The output format follows the standard Korean high-school exam layout:
 *   - School name / exam title / date in the header
 *   - Questions numbered sequentially with instruction text
 *   - Passage (with markers if applicable) printed below each question
 *   - Multiple-choice options on a separate line (if present)
 *   - Answer key and explanations in an appendix (if includeAnswers / includeExplanations)
 *
 * STUB: returns a minimal placeholder Blob until the full implementation is wired in.
 *
 * @param questions  Array of validated GeneratedQuestion objects
 * @param passage    The StructuredPassage the questions are derived from
 * @param options    Export formatting options; defaults applied if omitted
 */
export async function exportToDocx(
  questions: GeneratedQuestion[],
  passage: StructuredPassage,
  options: Partial<ExportOptions> = {}
): Promise<ExportResult> {
  // -----------------------------------------------------------------
  // STUB — replace this block with the real docx generation logic.
  // The `docx` npm package (already in package.json) should be used.
  // -----------------------------------------------------------------
  const resolvedOptions: ExportOptions = {
    format: 'docx',
    includeAnswers: options.includeAnswers ?? false,
    includeExplanations: options.includeExplanations ?? false,
    schoolName: options.schoolName,
    examTitle: options.examTitle ?? passage.title ?? '영어 시험',
    examDate: options.examDate ?? new Date().toISOString().slice(0, 10),
  }

  console.warn(
    '[exporter] exportToDocx is a STUB — returning placeholder Blob. ' +
      'Implement full docx generation to replace this.'
  )

  const placeholderText = JSON.stringify(
    {
      _stub: true,
      message: 'exportToDocx not yet implemented',
      passage_id: passage.id,
      question_count: questions.length,
      options: resolvedOptions,
    },
    null,
    2
  )

  const blob = new Blob([placeholderText], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  return {
    blob,
    filename: buildFilename('exam', 'docx'),
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: blob.size,
  }
}

/**
 * Export questions and passage to a plain JSON file.
 *
 * Useful for archiving, debugging, or passing data to external systems.
 * This export format is fully implemented even in the stub, because it
 * requires no third-party document library.
 *
 * @param questions  Array of validated GeneratedQuestion objects
 * @param passage    The StructuredPassage the questions are derived from
 * @param options    Export formatting options; defaults applied if omitted
 */
export async function exportToJson(
  questions: GeneratedQuestion[],
  passage: StructuredPassage,
  options: Partial<ExportOptions> = {}
): Promise<ExportResult> {
  const resolvedOptions: ExportOptions = {
    format: 'json',
    includeAnswers: options.includeAnswers ?? true,
    includeExplanations: options.includeExplanations ?? true,
    schoolName: options.schoolName,
    examTitle: options.examTitle ?? passage.title ?? '영어 시험',
    examDate: options.examDate ?? new Date().toISOString().slice(0, 10),
  }

  // Build the export payload
  const exportPayload = {
    meta: {
      exportedAt: new Date().toISOString(),
      schoolName: resolvedOptions.schoolName ?? null,
      examTitle: resolvedOptions.examTitle,
      examDate: resolvedOptions.examDate,
      questionCount: questions.length,
      passageId: passage.id,
      passageWordCount: passage.wordCount,
      estimatedDifficulty: passage.estimatedDifficulty,
    },
    passage: {
      id: passage.id,
      title: passage.title ?? null,
      fullText: passage.fullText,
      topics: passage.topics,
      wordCount: passage.wordCount,
      estimatedDifficulty: passage.estimatedDifficulty,
    },
    questions: questions.map((q) => {
      const base = {
        question_number: q.question_number,
        type_id: q.type_id,
        difficulty: q.difficulty,
        instruction: q.instruction,
        passage_with_markers: q.passage_with_markers ?? null,
        choices: q.choices,
        test_point: q.test_point,
      }
      return {
        ...base,
        ...(resolvedOptions.includeAnswers ? { answer: q.answer } : {}),
        ...(resolvedOptions.includeExplanations ? { explanation: q.explanation } : {}),
      }
    }),
  }

  const jsonString = JSON.stringify(exportPayload, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })

  return {
    blob,
    filename: buildFilename('exam', 'json'),
    mimeType: 'application/json',
    sizeBytes: blob.size,
  }
}

/**
 * Dispatcher: route to the correct exporter based on options.format.
 *
 * @param questions  Array of validated GeneratedQuestion objects
 * @param passage    The StructuredPassage the questions are derived from
 * @param options    Export options; `format` determines which exporter is used
 */
export async function exportQuestions(
  questions: GeneratedQuestion[],
  passage: StructuredPassage,
  options: Partial<ExportOptions> = {}
): Promise<ExportResult> {
  const format = options.format ?? 'json'

  switch (format) {
    case 'docx':
      return exportToDocx(questions, passage, options)
    case 'json':
      return exportToJson(questions, passage, options)
    case 'pdf':
      throw new ExporterError(
        'PDF export is not yet implemented. Use "docx" or "json" for now.',
        'PDF_NOT_IMPLEMENTED'
      )
    default:
      throw new ExporterError(
        `Unknown export format: "${format}". Supported formats: docx, json`,
        'UNKNOWN_FORMAT'
      )
  }
}
