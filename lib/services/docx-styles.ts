/**
 * Reusable style constants for Korean English exam .docx export.
 *
 * All twip values use: 1 inch = 1440 twips, 1 pt = 20 twips.
 * Line spacing 276 = ~1.15x, 360 = 1.5x, 480 = 2x at 240 twips/line.
 */

import {
  AlignmentType,
  LineRuleType,
  UnderlineType,
  convertInchesToTwip,
} from 'docx'

// ---------------------------------------------------------------------------
// Page layout
// ---------------------------------------------------------------------------

/** Standard Korean exam paper margins (twips) */
export const PAGE_MARGIN = {
  top: convertInchesToTwip(1.0),
  bottom: convertInchesToTwip(1.0),
  left: convertInchesToTwip(1.25),
  right: convertInchesToTwip(1.25),
}

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

export const FONT_KOREAN = 'Malgun Gothic'
export const FONT_ENGLISH = 'Times New Roman'

/** Combined font definition used for most runs */
export const FONT_COMPLEX = { name: FONT_ENGLISH, eastAsia: FONT_KOREAN }

// ---------------------------------------------------------------------------
// Font sizes (half-points for docx)
// ---------------------------------------------------------------------------

export const SIZE = {
  /** 10 pt */
  SMALL: 20,
  /** 11 pt */
  BODY: 22,
  /** 12 pt */
  NORMAL: 24,
  /** 13 pt */
  MEDIUM: 26,
  /** 14 pt */
  HEADING: 28,
  /** 16 pt */
  TITLE: 32,
  /** 18 pt */
  LARGE_TITLE: 36,
} as const

// ---------------------------------------------------------------------------
// Colours (hex without #)
// ---------------------------------------------------------------------------

export const COLOR = {
  BLACK: '000000',
  DARK_GRAY: '333333',
  GRAY: '666666',
  LIGHT_GRAY: 'AAAAAA',
  WHITE: 'FFFFFF',
  ACCENT: '1F3864', // deep navy for headings
} as const

// ---------------------------------------------------------------------------
// Spacing helpers
// ---------------------------------------------------------------------------

/** 1.5× line spacing (240 twips per line × 1.5 = 360) */
export const LINE_SPACING_1_5 = {
  line: 360,
  lineRule: LineRuleType.AUTO,
} as const

/** 1.15× line spacing */
export const LINE_SPACING_1_15 = {
  line: 276,
  lineRule: LineRuleType.AUTO,
} as const

/** Single line spacing */
export const LINE_SPACING_SINGLE = {
  line: 240,
  lineRule: LineRuleType.AUTO,
} as const

/** Space after a question block (12 pt = 240 twips) */
export const SPACE_AFTER_QUESTION = { before: 0, after: 240, ...LINE_SPACING_1_5 }

/** Space after a section heading */
export const SPACE_AFTER_HEADING = { before: 240, after: 120 }

/** Space after a paragraph within a passage */
export const SPACE_PASSAGE_PARA = { before: 0, after: 120, ...LINE_SPACING_1_5 }

// ---------------------------------------------------------------------------
// Indent helpers (twips)
// ---------------------------------------------------------------------------

/** Standard passage indent from left margin */
export const INDENT_PASSAGE = { left: 360, firstLine: 0 }

/** Choices indent */
export const INDENT_CHOICE = { left: 360 }

// ---------------------------------------------------------------------------
// Convenience style objects
// ---------------------------------------------------------------------------

/** Base run style for body text */
export const RUN_BODY = {
  font: FONT_COMPLEX,
  size: SIZE.BODY,
  color: COLOR.DARK_GRAY,
} as const

/** Base run style for passage text */
export const RUN_PASSAGE = {
  font: FONT_COMPLEX,
  size: SIZE.BODY,
  color: COLOR.BLACK,
} as const

/** Style for bold question numbers */
export const RUN_Q_NUMBER = {
  font: { name: FONT_ENGLISH, eastAsia: FONT_KOREAN },
  size: SIZE.NORMAL,
  bold: true,
  color: COLOR.ACCENT,
} as const

/** Style for Korean instruction text */
export const RUN_INSTRUCTION = {
  font: { name: FONT_ENGLISH, eastAsia: FONT_KOREAN },
  size: SIZE.SMALL,
  bold: false,
  color: COLOR.DARK_GRAY,
} as const

/** Style for answer key labels */
export const RUN_ANSWER_LABEL = {
  font: { name: FONT_ENGLISH, eastAsia: FONT_KOREAN },
  size: SIZE.BODY,
  bold: true,
  color: COLOR.ACCENT,
} as const

/** Style for underlined words in vocabulary/grammar passages */
export const RUN_UNDERLINE = {
  ...RUN_PASSAGE,
  underline: { type: UnderlineType.SINGLE },
} as const

/** Alignment shorthand */
export const ALIGN = AlignmentType
