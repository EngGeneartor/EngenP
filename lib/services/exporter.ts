'use server'

/**
 * exporter.ts
 * Document Export Service — server-side only.
 *
 * Generates professional Korean English exam .docx files using the `docx`
 * npm package. Supports all question types defined in data/question_types/.
 *
 * Public API:
 *   exportToDocx(questions, passage, options?) → ExportResult   (.docx)
 *   exportToJson(questions, passage, options?)  → ExportResult  (.json)
 *   exportQuestions(questions, passage, options?) → ExportResult (dispatcher)
 *   exportDocument(input) → ArrayBuffer                         (API-route adapter)
 */

import {
  Document,
  FileChild,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageBreak,
  Footer,
  Header,
  Table,
  TableRow,
  TableCell,
  TableBorders,
  WidthType,
  BorderStyle,
  SimpleField,
  UnderlineType,
  LineRuleType,
  convertInchesToTwip,
} from 'docx'
import type { GeneratedQuestion, StructuredPassage, ExportOptions } from '@/lib/types'

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ExporterError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = 'ExporterError'
  }
}

// ---------------------------------------------------------------------------
// Export result shape
// ---------------------------------------------------------------------------

export interface ExportResult {
  /** The exported file as a Blob (can be written to Supabase Storage or sent to the browser) */
  blob: Blob
  /** Suggested filename including extension, e.g. "exam_2026-03-28.docx" */
  filename: string
  /** MIME type of the Blob */
  mimeType: string
  /** Size of the Blob in bytes */
  sizeBytes: number
}

// ---------------------------------------------------------------------------
// Internal style constants
// ---------------------------------------------------------------------------

const FONT_EN = 'Times New Roman'
const FONT_KO = 'Malgun Gothic'
const FONT = { name: FONT_EN, eastAsia: FONT_KO } as const

/** Half-point font sizes (1 pt = 2 units) */
const SZ = { SMALL: 20, BODY: 22, NORMAL: 24, HEADING: 28, TITLE: 34 } as const

const COL = {
  BLACK: '000000',
  DARK: '1A1A1A',
  GRAY: '555555',
  LIGHT: '888888',
  NAVY: '1F3864',
} as const

const MARGIN = {
  top: convertInchesToTwip(1.0),
  bottom: convertInchesToTwip(1.0),
  left: convertInchesToTwip(1.25),
  right: convertInchesToTwip(1.25),
}

/** 1.5× line spacing (240 twips/line × 1.5 = 360) */
const LS_15 = { line: 360, lineRule: LineRuleType.AUTO } as const
const LS_1 = { line: 240, lineRule: LineRuleType.AUTO } as const

const CIRCLED = ['①', '②', '③', '④', '⑤'] as const

const TYPE_LABELS: Record<string, string> = {
  vocabulary_choice: '어휘 선택',
  grammar_choice: '어법 선택',
  blank_inference: '빈칸 추론',
  sentence_ordering: '순서 배열',
  sentence_insertion: '문장 삽입',
  main_idea: '주제/요지',
  true_false: '내용 일치',
  summary: '요약문 완성',
}

// ---------------------------------------------------------------------------
// Filename helper
// ---------------------------------------------------------------------------

function buildFilename(prefix: string, extension: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `${prefix}_${date}.${extension}`
}

// ---------------------------------------------------------------------------
// Low-level element builders
// ---------------------------------------------------------------------------

function spacer(pts = 6): Paragraph {
  return new Paragraph({
    children: [],
    spacing: { before: 0, after: pts * 20, ...LS_1 },
  })
}

function horizontalRule(): Paragraph {
  return new Paragraph({
    children: [],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: COL.LIGHT, space: 1 },
    },
    spacing: { before: 120, after: 120 },
  })
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 360, after: 240, ...LS_1 },
    children: [new TextRun({ text, font: FONT, size: SZ.HEADING, bold: true, color: COL.NAVY })],
  })
}

// ---------------------------------------------------------------------------
// Passage text-run builder
//
// Handles two inline annotation schemes:
//   1. **bold** — AI may wrap key words in double asterisks
//   2. ①②③④⑤ markers — for vocabulary/grammar type, the word immediately
//      following the circled number is underlined when underlineNumbers=true
// ---------------------------------------------------------------------------

function passageRuns(rawText: string, underlineNumbers = false): TextRun[] {
  const runs: TextRun[] = []

  // Split on **bold** spans first
  const boldSplit = rawText.split(/(\*\*[^*]+\*\*)/g)

  for (const seg of boldSplit) {
    if (!seg) continue

    if (/^\*\*[^*]+\*\*$/.test(seg)) {
      runs.push(
        new TextRun({
          text: seg.replace(/^\*\*|\*\*$/g, ''),
          font: FONT,
          size: SZ.BODY,
          bold: true,
          color: COL.BLACK,
        })
      )
      continue
    }

    if (underlineNumbers) {
      // Split around circled numbers so we can underline the following word
      const parts = seg.split(/(①|②|③|④|⑤)/g)
      let markNext = false
      for (const part of parts) {
        if (!part) continue
        if (/^[①②③④⑤]$/.test(part)) {
          runs.push(
            new TextRun({ text: part, font: FONT, size: SZ.BODY, bold: true, color: COL.BLACK })
          )
          markNext = true
        } else if (markNext) {
          const m = part.match(/^(\S+)([\s\S]*)$/)
          if (m) {
            runs.push(
              new TextRun({
                text: m[1],
                font: FONT,
                size: SZ.BODY,
                underline: { type: UnderlineType.SINGLE },
                color: COL.BLACK,
              })
            )
            if (m[2]) {
              runs.push(new TextRun({ text: m[2], font: FONT, size: SZ.BODY, color: COL.DARK }))
            }
          } else {
            runs.push(new TextRun({ text: part, font: FONT, size: SZ.BODY, color: COL.DARK }))
          }
          markNext = false
        } else {
          runs.push(new TextRun({ text: part, font: FONT, size: SZ.BODY, color: COL.DARK }))
        }
      }
    } else {
      runs.push(new TextRun({ text: seg, font: FONT, size: SZ.BODY, color: COL.DARK }))
    }
  }

  return runs.length ? runs : [new TextRun({ text: ' ', font: FONT, size: SZ.BODY })]
}

function passageParagraph(
  text: string,
  opts: { underlineNumbers?: boolean; spaceBefore?: number; spaceAfter?: number } = {}
): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 360 },
    spacing: { before: opts.spaceBefore ?? 0, after: opts.spaceAfter ?? 120, ...LS_15 },
    children: passageRuns(text, opts.underlineNumbers ?? false),
  })
}

// ---------------------------------------------------------------------------
// Choice list renderer
// ---------------------------------------------------------------------------

function choiceParagraphs(choices: string[]): Paragraph[] {
  return choices.map((choice, idx) => {
    const raw = choice.trim()
    // Preserve the circled number if the AI already included it; otherwise prepend
    const label = /^[①②③④⑤]/.test(raw) ? raw : `${CIRCLED[idx] ?? `${idx + 1}.`} ${raw}`
    return new Paragraph({
      alignment: AlignmentType.LEFT,
      indent: { left: 360 },
      spacing: { before: 0, after: 80, ...LS_1 },
      children: [new TextRun({ text: label, font: FONT, size: SZ.BODY, color: COL.DARK })],
    })
  })
}

// ---------------------------------------------------------------------------
// Per-question header elements
// ---------------------------------------------------------------------------

function questionNumberParagraph(q: GeneratedQuestion): Paragraph {
  const typeLabel = TYPE_LABELS[q.type_id] ?? q.type_id
  return new Paragraph({
    spacing: { before: 360, after: 80, ...LS_1 },
    children: [
      new TextRun({ text: `${q.question_number}. `, font: FONT, size: SZ.NORMAL, bold: true, color: COL.NAVY }),
      new TextRun({ text: `[${typeLabel}]`, font: FONT, size: SZ.SMALL, bold: false, color: COL.LIGHT }),
    ],
  })
}

function instructionParagraph(instruction: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 40, after: 120, ...LS_1 },
    children: [
      new TextRun({
        text: instruction,
        font: FONT,
        size: SZ.SMALL,
        italics: true,
        color: COL.GRAY,
      }),
    ],
  })
}

// ---------------------------------------------------------------------------
// Per-type question renderers
// ---------------------------------------------------------------------------

/** 어휘 선택 / 어법 선택: circled numbers inline, target words underlined */
function renderVocabGrammar(q: GeneratedQuestion): Paragraph[] {
  return [
    questionNumberParagraph(q),
    instructionParagraph(q.instruction),
    ...(q.passage_with_markers
      ? [passageParagraph(q.passage_with_markers, { underlineNumbers: true, spaceAfter: 200 })]
      : []),
    spacer(4),
  ]
}

/** 빈칸 추론: passage with blank, 5 choices below */
function renderBlankInference(q: GeneratedQuestion): Paragraph[] {
  return [
    questionNumberParagraph(q),
    instructionParagraph(q.instruction),
    ...(q.passage_with_markers
      ? [passageParagraph(q.passage_with_markers, { spaceAfter: 160 })]
      : []),
    ...(q.choices?.length ? choiceParagraphs(q.choices) : []),
    spacer(4),
  ]
}

/** 순서 배열: intro passage, (A)(B)(C) blocks, then ordering choices */
function renderSentenceOrdering(q: GeneratedQuestion): Paragraph[] {
  const paras: Paragraph[] = [
    questionNumberParagraph(q),
    instructionParagraph(q.instruction),
  ]

  const introText = (q as { intro_passage?: string }).intro_passage ?? q.passage_with_markers
  if (introText) {
    paras.push(passageParagraph(introText, { spaceAfter: 160 }))
  }

  const blocks = (q as { blocks?: Record<string, string> }).blocks
  if (blocks) {
    for (const [label, blockText] of Object.entries(blocks)) {
      paras.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { before: 120, after: 0, ...LS_1 },
          children: [
            new TextRun({ text: `${label}  `, font: FONT, size: SZ.BODY, bold: true, color: COL.NAVY }),
          ],
        })
      )
      paras.push(passageParagraph(blockText, { spaceAfter: 80 }))
    }
  }

  paras.push(spacer(8))
  if (q.choices?.length) paras.push(...choiceParagraphs(q.choices))
  paras.push(spacer(4))
  return paras
}

/** 문장 삽입: boxed insert sentence, passage with ①–⑤ insertion markers, compact choice row */
function renderSentenceInsertion(q: GeneratedQuestion): Paragraph[] {
  const paras: Paragraph[] = [
    questionNumberParagraph(q),
    instructionParagraph(q.instruction),
  ]

  const insertSentence = (q as { insert_sentence?: string }).insert_sentence
  if (insertSentence) {
    paras.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        indent: { left: 360 },
        spacing: { before: 80, after: 80, ...LS_1 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 4, color: COL.LIGHT, space: 6 },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: COL.LIGHT, space: 6 },
          left: { style: BorderStyle.SINGLE, size: 4, color: COL.LIGHT, space: 6 },
          right: { style: BorderStyle.SINGLE, size: 4, color: COL.LIGHT, space: 6 },
        },
        children: [
          new TextRun({
            text: insertSentence,
            font: FONT,
            size: SZ.BODY,
            italics: true,
            color: COL.DARK,
          }),
        ],
      })
    )
    paras.push(spacer(4))
  }

  if (q.passage_with_markers) {
    paras.push(passageParagraph(q.passage_with_markers, { spaceAfter: 160 }))
  }

  if (q.choices?.length) {
    // Insertion position choices are a compact row: ①  ②  ③  ④  ⑤
    paras.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 80, ...LS_1 },
        children: q.choices
          .map((c, i) => [
            new TextRun({
              text: (c.trim() || CIRCLED[i] || ''),
              font: FONT,
              size: SZ.BODY,
              color: COL.DARK,
            }),
            new TextRun({ text: '   ', font: FONT, size: SZ.BODY }),
          ])
          .flat(),
      })
    )
  }

  paras.push(spacer(4))
  return paras
}

/** Generic fallback (주제/요지, 내용 일치, 요약문, etc.) */
function renderGeneric(q: GeneratedQuestion): Paragraph[] {
  const paras: Paragraph[] = [
    questionNumberParagraph(q),
    instructionParagraph(q.instruction),
  ]

  const passageText = q.passage_with_markers ?? q.rawPassage
  if (passageText) paras.push(passageParagraph(passageText, { spaceAfter: 160 }))
  if (q.choices?.length) paras.push(...choiceParagraphs(q.choices))
  paras.push(spacer(4))
  return paras
}

function renderQuestion(q: GeneratedQuestion): Paragraph[] {
  switch (q.type_id) {
    case 'vocabulary_choice':
    case 'grammar_choice':
      return renderVocabGrammar(q)
    case 'blank_inference':
      return renderBlankInference(q)
    case 'sentence_ordering':
      return renderSentenceOrdering(q)
    case 'sentence_insertion':
      return renderSentenceInsertion(q)
    default:
      return renderGeneric(q)
  }
}

// ---------------------------------------------------------------------------
// Answer key section
// ---------------------------------------------------------------------------

function buildAnswerKey(questions: GeneratedQuestion[], includeExplanations: boolean): Paragraph[] {
  const paras: Paragraph[] = [
    new Paragraph({ children: [new PageBreak()] }),
    sectionHeading('정답 및 해설'),
    horizontalRule(),
    spacer(8),
  ]

  for (const q of questions) {
    const typeLabel = TYPE_LABELS[q.type_id] ?? q.type_id

    paras.push(
      new Paragraph({
        spacing: { before: 240, after: 40, ...LS_1 },
        children: [
          new TextRun({ text: `${q.question_number}번  `, font: FONT, size: SZ.NORMAL, bold: true, color: COL.NAVY }),
          new TextRun({ text: `정답: ${q.answer}`, font: FONT, size: SZ.NORMAL, bold: true, color: COL.BLACK }),
          new TextRun({ text: `   [${typeLabel}]`, font: FONT, size: SZ.SMALL, color: COL.LIGHT }),
        ],
      })
    )

    if (q.test_point) {
      paras.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { before: 0, after: 40, ...LS_1 },
          children: [
            new TextRun({ text: '출제 포인트: ', font: FONT, size: SZ.SMALL, bold: true, color: COL.GRAY }),
            new TextRun({ text: q.test_point, font: FONT, size: SZ.SMALL, color: COL.GRAY }),
          ],
        })
      )
    }

    if (includeExplanations && q.explanation) {
      paras.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 360 },
          spacing: { before: 40, after: 80, ...LS_15 },
          children: [
            new TextRun({ text: '해설: ', font: FONT, size: SZ.BODY, bold: true, color: COL.DARK }),
            new TextRun({ text: q.explanation, font: FONT, size: SZ.BODY, color: COL.DARK }),
          ],
        })
      )
    }

    paras.push(horizontalRule())
  }

  return paras
}

// ---------------------------------------------------------------------------
// Header / cover page
// ---------------------------------------------------------------------------

function buildCoverPage(
  questions: GeneratedQuestion[],
  passage: StructuredPassage,
  options: ExportOptions
): FileChild[] {
  const title = options.examTitle ?? passage.title ?? '영어 시험지'
  const dateStr = options.examDate
    ? new Date(options.examDate).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  const school = options.schoolName ?? ''

  const paras: FileChild[] = [spacer(24)]

  if (school) {
    paras.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80, ...LS_1 },
        children: [new TextRun({ text: school, font: FONT, size: SZ.HEADING, color: COL.GRAY })],
      })
    )
  }

  paras.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120, ...LS_1 },
      children: [new TextRun({ text: title, font: FONT, size: SZ.TITLE, bold: true, color: COL.NAVY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 240, ...LS_1 },
      children: [new TextRun({ text: dateStr, font: FONT, size: SZ.BODY, color: COL.GRAY })],
    }),
    horizontalRule(),
    spacer(16),

    // Student info table
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: TableBorders.NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: '학교: ', font: FONT, size: SZ.BODY, bold: true, color: COL.DARK }),
                    new TextRun({ text: '___________________', font: FONT, size: SZ.BODY, color: COL.LIGHT }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: '학년/반: ', font: FONT, size: SZ.BODY, bold: true, color: COL.DARK }),
                    new TextRun({ text: '________________', font: FONT, size: SZ.BODY, color: COL.LIGHT }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: 120 },
                  children: [
                    new TextRun({ text: '이름: ', font: FONT, size: SZ.BODY, bold: true, color: COL.DARK }),
                    new TextRun({ text: '___________________', font: FONT, size: SZ.BODY, color: COL.LIGHT }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: 120 },
                  children: [
                    new TextRun({ text: '번호: ', font: FONT, size: SZ.BODY, bold: true, color: COL.DARK }),
                    new TextRun({ text: '___________________', font: FONT, size: SZ.BODY, color: COL.LIGHT }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: 120 },
                  children: [
                    new TextRun({ text: '점수: ', font: FONT, size: SZ.BODY, bold: true, color: COL.DARK }),
                    new TextRun({ text: '_____ / 100', font: FONT, size: SZ.BODY, color: COL.LIGHT }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: 120 },
                  children: [
                    new TextRun({ text: '총 문항 수: ', font: FONT, size: SZ.BODY, bold: true, color: COL.DARK }),
                    new TextRun({ text: `${questions.length}문항`, font: FONT, size: SZ.BODY, color: COL.DARK }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),

    spacer(16),
    horizontalRule(),
    spacer(8),

    // Instructions
    ...[
      '* 각 문항을 잘 읽고 가장 적절한 답을 고르십시오.',
      '* 답안지에 학년, 반, 번호, 이름을 정확히 기재하십시오.',
      '* 시험 시간 내에 답안을 작성하고 부정행위를 하지 마십시오.',
    ].map(
      (line) =>
        new Paragraph({
          indent: { left: 240 },
          spacing: { before: 0, after: 60, ...LS_1 },
          children: [new TextRun({ text: line, font: FONT, size: SZ.SMALL, color: COL.GRAY })],
        })
    ),

    spacer(16),
  )

  return paras
}

// ---------------------------------------------------------------------------
// Core docx builder
// ---------------------------------------------------------------------------

async function buildDocxBuffer(
  questions: GeneratedQuestion[],
  passage: StructuredPassage,
  options: ExportOptions
): Promise<Buffer> {
  const coverPage = buildCoverPage(questions, passage, options)

  const questionSection: FileChild[] = [
    sectionHeading('문  제'),
    horizontalRule(),
    ...questions.flatMap(renderQuestion),
  ]

  const answerSection: FileChild[] = options.includeAnswers
    ? buildAnswerKey(questions, options.includeExplanations)
    : []

  const examTitle = options.examTitle ?? passage.title ?? '영어 시험지'

  const doc = new Document({
    creator: 'EngenP Exam Generator',
    title: examTitle,
    description: examTitle,

    styles: {
      default: {
        document: {
          run: { size: SZ.BODY },
          paragraph: { spacing: { line: 276, lineRule: LineRuleType.AUTO } },
        },
      },
    },

    sections: [
      {
        properties: { page: { margin: MARGIN } },

        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({ text: examTitle, font: FONT, size: SZ.SMALL, color: COL.LIGHT }),
                ],
              }),
            ],
          }),
        },

        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({ text: '- ', font: FONT, size: SZ.SMALL, color: COL.LIGHT }),
                  new SimpleField('PAGE'),
                  new TextRun({ text: ' -', font: FONT, size: SZ.SMALL, color: COL.LIGHT }),
                ],
              }),
            ],
          }),
        },

        children: [...coverPage, ...questionSection, ...answerSection],
      },
    ],
  })

  return Packer.toBuffer(doc)
}

// ---------------------------------------------------------------------------
// Public API — exportToDocx
// ---------------------------------------------------------------------------

/**
 * Export questions and passage to a .docx file.
 *
 * The output format follows the standard Korean high-school exam layout:
 *   - School name / exam title / date in the header
 *   - Student info fields (name, class, score) on the cover
 *   - Questions numbered sequentially with Korean instruction text
 *   - Passage (with markers) formatted per question type
 *   - Multiple-choice options below each passage
 *   - Answer key and explanations in an appendix (if includeAnswers / includeExplanations)
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
  const resolvedOptions: ExportOptions = {
    format: 'docx',
    includeAnswers: options.includeAnswers ?? false,
    includeExplanations: options.includeExplanations ?? false,
    schoolName: options.schoolName,
    examTitle: options.examTitle ?? passage.title ?? '영어 시험',
    examDate: options.examDate ?? new Date().toISOString().slice(0, 10),
  }

  const buffer = await buildDocxBuffer(questions, passage, resolvedOptions)
  const blob = new Blob([buffer], {
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

// -----------------------------------------------------------
// API-route-compatible adapter
// -----------------------------------------------------------

export interface ExportDocumentInput {
  questions: GeneratedQuestion[]
  passage: StructuredPassage
  format?: 'docx' | 'json' | 'pdf'
  options?: Partial<ExportOptions>
}

/**
 * Thin adapter used by the /api/export route.
 * Returns an ArrayBuffer (suitable for streaming as a NextResponse body)
 * rather than an ExportResult Blob, since the route writes the bytes
 * directly to the HTTP response.
 *
 * @param input  Export request payload from the API route
 */
export async function exportDocument(input: ExportDocumentInput): Promise<ArrayBuffer> {
  const { questions, passage, format = 'docx', options = {} } = input
  const result = await exportQuestions(questions, passage, { ...options, format })
  return result.blob.arrayBuffer()
}

// -----------------------------------------------------------
// Re-export types so the API route can import them from this module
// -----------------------------------------------------------
export type { GeneratedQuestion, StructuredPassage, ExportOptions } from '@/lib/types'
