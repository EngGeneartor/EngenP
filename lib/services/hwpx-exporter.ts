/**
 * hwpx-exporter.ts
 * Document Export Service — .hwpx (Hancom 한글) format — server-side only.
 *
 * HWPX is an XML-based ZIP format (application/hwp+zip) used by Hancom Office.
 * Since no mature JS library exists for this format we generate the XML files
 * manually and package them with JSZip.
 *
 * File layout inside the ZIP:
 *   mimetype                  (STORE, no compression — must be first)
 *   META-INF/container.xml
 *   Contents/content.hpf      (package manifest)
 *   Contents/header.xml       (document settings / styles)
 *   Contents/section0.xml     (actual exam content)
 *
 * HWPX paragraph XML basics used here:
 *   <hp:p>       paragraph
 *   <hp:pPr>     paragraph properties (alignment, spacing, indent)
 *   <hp:run>     text run
 *   <hp:rPr>     run properties (font, size, bold, underline…)
 *   <hp:t>       text content
 *   <hp:ctrl>    control object — used for page break (type="pageBreak")
 *
 * Font sizes in HWPX use "hwpUnit" (1/100 pt), so:
 *   1000 = 10 pt,  1100 = 11 pt,  1200 = 12 pt,  1400 = 14 pt,  1700 = 17 pt
 *
 * Public API:
 *   exportToHwpx(questions, passage, options) → Promise<Buffer>
 */

import JSZip from 'jszip'
import type { GeneratedQuestion, StructuredPassage, ExportOptions } from '@/lib/types'

// ---------------------------------------------------------------------------
// Internal style constants
// ---------------------------------------------------------------------------

/** HWPX font sizes (hwpUnit = 1/100 pt) */
const SZ = {
  SMALL:   1000,   // 10 pt
  BODY:    1100,   // 11 pt
  NORMAL:  1200,   // 12 pt
  HEADING: 1400,   // 14 pt
  TITLE:   1700,   // 17 pt
} as const

const FONT_HAN = '맑은 고딕'
const FONT_ENG = 'Times New Roman'

const CIRCLED = ['①', '②', '③', '④', '⑤'] as const

const TYPE_LABELS: Record<string, string> = {
  vocabulary_choice: '어휘 선택',
  grammar_choice:    '어법 선택',
  blank_inference:   '빈칸 추론',
  sentence_ordering: '순서 배열',
  sentence_insertion:'문장 삽입',
  main_idea:         '주제/요지',
  true_false:        '내용 일치',
  summary:           '요약문 완성',
}

// ---------------------------------------------------------------------------
// XML escape helper
// ---------------------------------------------------------------------------

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ---------------------------------------------------------------------------
// Run / paragraph XML helpers
// ---------------------------------------------------------------------------

interface RunOptions {
  size?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  hangul?: string
  latin?: string
}

/**
 * Build a single <hp:run> with text content.
 * Wraps the text in a <hp:t> element with XML-space preserved.
 */
function run(text: string, opts: RunOptions = {}): string {
  const sz     = opts.size    ?? SZ.BODY
  const hangul = opts.hangul  ?? FONT_HAN
  const latin  = opts.latin   ?? FONT_ENG

  const boldTag      = opts.bold      ? '<hp:b/>'      : ''
  const italicTag    = opts.italic    ? '<hp:i/>'      : ''
  const underlineTag = opts.underline ? '<hp:u val="single"/>' : ''

  return `<hp:run>
      <hp:rPr>
        <hp:sz val="${sz}"/>
        <hp:fontRef hangul="${esc(hangul)}" latin="${esc(latin)}"/>
        ${boldTag}${italicTag}${underlineTag}
      </hp:rPr>
      <hp:t xml:space="preserve">${esc(text)}</hp:t>
    </hp:run>`
}

interface ParaOptions {
  align?: 'left' | 'center' | 'right' | 'justify'
  spaceBefore?: number   // hwpUnit
  spaceAfter?: number    // hwpUnit
  indentLeft?: number    // hwpUnit
}

/**
 * Wrap runs inside a <hp:p> paragraph element.
 */
function para(runs: string, opts: ParaOptions = {}): string {
  const align       = opts.align       ?? 'left'
  const spaceBefore = opts.spaceBefore ?? 0
  const spaceAfter  = opts.spaceAfter  ?? 0
  const indentLeft  = opts.indentLeft  ?? 0

  return `<hp:p>
    <hp:pPr>
      <hp:jc val="${align}"/>
      <hp:spacing before="${spaceBefore}" after="${spaceAfter}" lineRule="auto" line="160"/>
      <hp:ind left="${indentLeft}"/>
    </hp:pPr>
    ${runs}
  </hp:p>`
}

/** An empty spacer paragraph. */
function spacer(): string {
  return para(run(' ', { size: SZ.SMALL }), { spaceAfter: 300 })
}

/** A centred bold section heading (e.g. "문  제" or "정답 및 해설"). */
function sectionHeading(text: string): string {
  return para(
    run(text, { size: SZ.HEADING, bold: true }),
    { align: 'center', spaceBefore: 600, spaceAfter: 400 }
  )
}

/**
 * A horizontal rule approximated by a paragraph whose bottom border is set.
 * HWPX supports paragraph borders via <hp:pBdr>.
 */
function horizontalRule(): string {
  return `<hp:p>
    <hp:pPr>
      <hp:spacing before="100" after="100" lineRule="auto" line="160"/>
      <hp:pBdr>
        <hp:bottom style="single" sz="6" color="888888" space="4"/>
      </hp:pBdr>
    </hp:pPr>
    ${run(' ', { size: SZ.SMALL })}
  </hp:p>`
}

/** A page break control paragraph. */
function pageBreak(): string {
  return `<hp:p>
    <hp:pPr>
      <hp:spacing before="0" after="0" lineRule="auto" line="160"/>
    </hp:pPr>
    <hp:ctrl id="pageBreak" type="pageBreak"/>
  </hp:p>`
}

// ---------------------------------------------------------------------------
// Passage text parser
// Handles:
//   **bold** spans
//   ①②③④⑤ inline markers with optional underline on the following word
// ---------------------------------------------------------------------------

function passageRuns(rawText: string, underlineNumbers = false): string {
  const parts = rawText.split(/(\*\*[^*]+\*\*)/g)
  const result: string[] = []

  for (const seg of parts) {
    if (!seg) continue

    if (/^\*\*[^*]+\*\*$/.test(seg)) {
      result.push(run(seg.replace(/^\*\*|\*\*$/g, ''), { bold: true }))
      continue
    }

    if (underlineNumbers) {
      const subparts = seg.split(/(①|②|③|④|⑤)/g)
      let markNext = false
      for (const part of subparts) {
        if (!part) continue
        if (/^[①②③④⑤]$/.test(part)) {
          result.push(run(part, { bold: true }))
          markNext = true
        } else if (markNext) {
          const m = part.match(/^(\S+)([\s\S]*)$/)
          if (m) {
            result.push(run(m[1], { underline: true }))
            if (m[2]) result.push(run(m[2]))
          } else {
            result.push(run(part))
          }
          markNext = false
        } else {
          result.push(run(part))
        }
      }
    } else {
      result.push(run(seg))
    }
  }

  return result.join('\n    ') || run(' ')
}

function passagePara(
  text: string,
  opts: { underlineNumbers?: boolean; spaceBefore?: number; spaceAfter?: number } = {}
): string {
  return para(passageRuns(text, opts.underlineNumbers), {
    align: 'justify',
    indentLeft: 600,
    spaceBefore: opts.spaceBefore ?? 0,
    spaceAfter:  opts.spaceAfter  ?? 200,
  })
}

// ---------------------------------------------------------------------------
// Choice list renderer
// ---------------------------------------------------------------------------

function choiceParas(choices: string[]): string {
  return choices
    .map((choice, idx) => {
      const raw   = choice.trim()
      const label = /^[①②③④⑤]/.test(raw) ? raw : `${CIRCLED[idx] ?? `${idx + 1}.`} ${raw}`
      return para(run(label), { indentLeft: 600, spaceAfter: 100 })
    })
    .join('\n')
}

// ---------------------------------------------------------------------------
// Per-question header elements
// ---------------------------------------------------------------------------

function questionNumberPara(q: GeneratedQuestion): string {
  const typeLabel = TYPE_LABELS[q.type_id] ?? q.type_id
  return `<hp:p>
    <hp:pPr>
      <hp:spacing before="600" after="100" lineRule="auto" line="160"/>
    </hp:pPr>
    ${run(`${q.question_number}. `, { size: SZ.NORMAL, bold: true })}
    ${run(`[${typeLabel}]`, { size: SZ.SMALL })}
  </hp:p>`
}

function instructionPara(instruction: string): string {
  return para(run(instruction, { size: SZ.SMALL, italic: true }), {
    spaceAfter: 200,
  })
}

// ---------------------------------------------------------------------------
// Per-type question renderers — mirror the logic in exporter.ts
// ---------------------------------------------------------------------------

function renderVocabGrammar(q: GeneratedQuestion): string {
  return [
    questionNumberPara(q),
    instructionPara(q.instruction),
    q.passage_with_markers
      ? passagePara(q.passage_with_markers, { underlineNumbers: true, spaceAfter: 300 })
      : '',
    spacer(),
  ].join('\n')
}

function renderBlankInference(q: GeneratedQuestion): string {
  return [
    questionNumberPara(q),
    instructionPara(q.instruction),
    q.passage_with_markers ? passagePara(q.passage_with_markers, { spaceAfter: 200 }) : '',
    q.choices?.length ? choiceParas(q.choices) : '',
    spacer(),
  ].join('\n')
}

function renderSentenceOrdering(q: GeneratedQuestion): string {
  const introText = (q as { intro_passage?: string }).intro_passage ?? q.passage_with_markers
  const blocks    = (q as { blocks?: Record<string, string> }).blocks

  const blockXml = blocks
    ? Object.entries(blocks)
        .map(([label, blockText]) =>
          para(run(`${label}  `, { bold: true }) + '\n    ' + run(blockText), {
            indentLeft: 600, spaceBefore: 200,
          })
        )
        .join('\n')
    : ''

  return [
    questionNumberPara(q),
    instructionPara(q.instruction),
    introText ? passagePara(introText, { spaceAfter: 200 }) : '',
    blockXml,
    spacer(),
    q.choices?.length ? choiceParas(q.choices) : '',
    spacer(),
  ].join('\n')
}

function renderSentenceInsertion(q: GeneratedQuestion): string {
  const insertSentence = (q as { insert_sentence?: string }).insert_sentence

  const insertBox = insertSentence
    ? `<hp:p>
    <hp:pPr>
      <hp:spacing before="100" after="100" lineRule="auto" line="160"/>
      <hp:ind left="600"/>
      <hp:pBdr>
        <hp:top    style="single" sz="4" color="AAAAAA" space="4"/>
        <hp:bottom style="single" sz="4" color="AAAAAA" space="4"/>
        <hp:left   style="single" sz="4" color="AAAAAA" space="4"/>
        <hp:right  style="single" sz="4" color="AAAAAA" space="4"/>
      </hp:pBdr>
    </hp:pPr>
    ${run(insertSentence, { italic: true })}
  </hp:p>`
    : ''

  const choiceRow = q.choices?.length
    ? para(
        q.choices.map((c, i) => run((c.trim() || CIRCLED[i] || '') + '   ')).join('\n    '),
        { align: 'center' }
      )
    : ''

  return [
    questionNumberPara(q),
    instructionPara(q.instruction),
    insertBox,
    spacer(),
    q.passage_with_markers ? passagePara(q.passage_with_markers, { spaceAfter: 200 }) : '',
    choiceRow,
    spacer(),
  ].join('\n')
}

function renderGeneric(q: GeneratedQuestion): string {
  const passageText = q.passage_with_markers ?? q.rawPassage
  return [
    questionNumberPara(q),
    instructionPara(q.instruction),
    passageText ? passagePara(passageText, { spaceAfter: 200 }) : '',
    q.choices?.length ? choiceParas(q.choices) : '',
    spacer(),
  ].join('\n')
}

function renderQuestion(q: GeneratedQuestion): string {
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

function buildAnswerKeyXml(
  questions: GeneratedQuestion[],
  includeExplanations: boolean
): string {
  const items = questions
    .map((q) => {
      const typeLabel = TYPE_LABELS[q.type_id] ?? q.type_id
      const testPointXml = q.test_point
        ? para(
            run('출제 포인트: ', { size: SZ.SMALL, bold: true }) +
            '\n    ' +
            run(q.test_point, { size: SZ.SMALL }),
            { indentLeft: 600 }
          )
        : ''
      const explanationXml =
        includeExplanations && q.explanation
          ? para(
              run('해설: ', { bold: true }) +
              '\n    ' +
              run(q.explanation),
              { align: 'justify', indentLeft: 600, spaceBefore: 100, spaceAfter: 150 }
            )
          : ''

      return [
        `<hp:p>
    <hp:pPr>
      <hp:spacing before="400" after="100" lineRule="auto" line="160"/>
    </hp:pPr>
    ${run(`${q.question_number}번  `, { size: SZ.NORMAL, bold: true })}
    ${run(`정답: ${q.answer}`, { size: SZ.NORMAL, bold: true })}
    ${run(`   [${typeLabel}]`, { size: SZ.SMALL })}
  </hp:p>`,
        testPointXml,
        explanationXml,
        horizontalRule(),
      ].join('\n')
    })
    .join('\n')

  return [
    pageBreak(),
    sectionHeading('정답 및 해설'),
    horizontalRule(),
    spacer(),
    items,
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Cover page / header XML
// ---------------------------------------------------------------------------

function buildCoverXml(
  questions: GeneratedQuestion[],
  passage: StructuredPassage,
  options: ExportOptions
): string {
  const title   = options.examTitle ?? passage.title ?? '영어 시험지'
  const school  = options.schoolName ?? ''
  const dateStr = options.examDate
    ? new Date(options.examDate).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  const schoolPara = school
    ? para(run(school, { size: SZ.HEADING }), { align: 'center', spaceAfter: 150 })
    : ''

  const infoLines = [
    '* 각 문항을 잘 읽고 가장 적절한 답을 고르십시오.',
    '* 답안지에 학년, 반, 번호, 이름을 정확히 기재하십시오.',
    '* 시험 시간 내에 답안을 작성하고 부정행위를 하지 마십시오.',
  ]
    .map((line) => para(run(line, { size: SZ.SMALL }), { indentLeft: 400, spaceAfter: 100 }))
    .join('\n')

  const studentFields = [
    ['학교', '___________________'],
    ['학년/반', '________________'],
    ['이름', '___________________'],
    ['번호', '___________________'],
    ['점수', `_____ / 100   총 ${questions.length}문항`],
  ]
    .map(([label, blank]) =>
      para(
        run(`${label}: `, { bold: true }) + '\n    ' + run(blank, { size: SZ.SMALL }),
        { spaceAfter: 150 }
      )
    )
    .join('\n')

  return [
    spacer(),
    spacer(),
    schoolPara,
    para(run(title, { size: SZ.TITLE, bold: true }), {
      align: 'center', spaceAfter: 200,
    }),
    para(run(dateStr), { align: 'center', spaceAfter: 400 }),
    horizontalRule(),
    spacer(),
    studentFields,
    spacer(),
    horizontalRule(),
    spacer(),
    infoLines,
    spacer(),
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Full section0.xml builder
// ---------------------------------------------------------------------------

function buildSectionXml(
  questions: GeneratedQuestion[],
  passage: StructuredPassage,
  options: ExportOptions
): string {
  const cover = buildCoverXml(questions, passage, options)

  const questionsXml = [
    sectionHeading('문  제'),
    horizontalRule(),
    questions.map(renderQuestion).join('\n'),
  ].join('\n')

  const answerKeyXml = options.includeAnswers
    ? buildAnswerKeyXml(questions, options.includeExplanations)
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2016/section"
        xmlns:hp="http://www.hancom.co.kr/hwpml/2016/paragraph"
        xmlns:hc="http://www.hancom.co.kr/hwpml/2016/core">
${cover}
${questionsXml}
${answerKeyXml}
</hs:sec>`
}

// ---------------------------------------------------------------------------
// Static XML files for the HWPX ZIP
// ---------------------------------------------------------------------------

function buildContainerXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="Contents/content.hpf"
              media-type="application/hwpml-package+xml"/>
  </rootfiles>
</container>`
}

function buildContentHpf(title: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<opf:package xmlns:opf="http://www.idpf.org/2007/opf"
             xmlns:dc="http://purl.org/dc/elements/1.1/"
             version="1.0">
  <opf:metadata>
    <dc:title>${esc(title)}</dc:title>
    <dc:creator>EngenP Exam Generator</dc:creator>
    <dc:language>ko</dc:language>
  </opf:metadata>
  <opf:manifest>
    <opf:item id="header"   href="header.xml"   media-type="application/xml"/>
    <opf:item id="section0" href="section0.xml" media-type="application/xml"/>
  </opf:manifest>
  <opf:spine>
    <opf:itemref idref="section0"/>
  </opf:spine>
</opf:package>`
}

function buildHeaderXml(title: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<hh:head xmlns:hh="http://www.hancom.co.kr/hwpml/2016/head">
  <hh:docInfo>
    <hh:title>${esc(title)}</hh:title>
    <hh:country>KO</hh:country>
    <hh:language>ko</hh:language>
  </hh:docInfo>
  <hh:beginNum page="1"/>
  <hh:refList>
    <hh:fontfaces>
      <hh:fontface lang="hangul">
        <hh:font name="${esc(FONT_HAN)}" type="TTF"/>
      </hh:fontface>
      <hh:fontface lang="latin">
        <hh:font name="${esc(FONT_ENG)}" type="TTF"/>
      </hh:fontface>
    </hh:fontfaces>
  </hh:refList>
</hh:head>`
}

// ---------------------------------------------------------------------------
// Public API — exportToHwpx
// ---------------------------------------------------------------------------

/**
 * Build a .hwpx ZIP buffer from the given questions, passage, and options.
 *
 * @param questions  Validated array of GeneratedQuestion objects
 * @param passage    The StructuredPassage the questions were derived from
 * @param options    Export formatting options
 * @returns          A Node.js Buffer containing the complete .hwpx ZIP
 */
export async function exportToHwpx(
  questions: GeneratedQuestion[],
  passage: StructuredPassage,
  options: ExportOptions
): Promise<Buffer> {
  const title = options.examTitle ?? passage.title ?? '영어 시험지'

  const zip = new JSZip()

  // mimetype MUST be the first file and stored uncompressed
  zip.file('mimetype', 'application/hwp+zip', { compression: 'STORE' })

  zip.file('META-INF/container.xml', buildContainerXml())
  zip.file('Contents/content.hpf',   buildContentHpf(title))
  zip.file('Contents/header.xml',    buildHeaderXml(title))
  zip.file('Contents/section0.xml',  buildSectionXml(questions, passage, options))

  const arrayBuffer = await zip.generateAsync({
    type: 'arraybuffer',
    // DEFLATE for everything except mimetype (which overrides to STORE above)
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return Buffer.from(arrayBuffer)
}
