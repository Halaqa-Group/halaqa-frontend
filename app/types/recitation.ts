import type { ScoreCounts } from '~/utils/score'

// Recitation marks follow Tarteel's error-highlighting model: instead of tagging
// a word by the *type* of mistake, each marked word carries a *severity* on a
// red→yellow→green spectrum. Tapping a word cycles it down that spectrum
// and then clears it (see `useRecitationSession`).
export type Severity = 'severe' | 'light' | 'minor'

export type WordKey = string

export type RecitationMarks = Record<WordKey, Severity>

// Words marked together as one drag-selected run share a block id. A block counts
// as a single mistake (one count, one score hit, one error row) even though every
// word in it is still highlighted individually. Words absent from this map are
// standalone single-word marks. See `useRecitationSession`.
export type MarkGroups = Record<WordKey, string>

/**
 * Is this verse ("surah:ayah") off-limits? Used while a new موضع is being
 * picked: verses already inside one are simply inert — not tappable, not
 * selectable — with no styling of their own.
 */
export type VerseLock = (verseKey: string) => boolean

/**
 * Does this verse's ayah-end ornament bound a tested موضع? True for the ornament
 * immediately before a موضع begins and the one at its last verse — the mushaf's
 * own glyphs act as the passage's opening and closing marks.
 */
export type VerseEdge = (verseKey: string) => boolean

export interface MarkCounts {
  severe: number
  light: number
  minor: number
  total: number
}

// Which weighted achievement bucket a severity feeds when scoring. Every level
// charges against one of the halaqa's إعدادات التقييم weights — there is no
// unscored severity. Mirrors `AchievementErrorType`.
export type ScoreSlot = 'mistake' | 'warning' | 'harakat'

export interface SeverityMeta {
  key: Severity
  /**
   * i18n key for the label shown in the toolbar legend and the severity picker.
   * Deliberately the SAME key the achievement form's counters and the halaqa's
   * إعدادات التقييم use, so the three names can never drift apart across the
   * three screens. The colour already conveys the severity; the label spends
   * its space naming the weight the mark is charged against.
   */
  labelKey: string
  icon: string
  /** Themeable color used for the word shading and legend swatch. */
  rgb: string
  scoreSlot: ScoreSlot
}

// Ordered most-severe → least-severe. This order is also the tap-cycle order:
//   (unmarked) → severe → light → minor → (unmarked)
export const SEVERITY_LEVELS: readonly SeverityMeta[] = [
  { key: 'severe', labelKey: 'pages.achievements.mistakes', icon: 'i-lucide-circle-x', rgb: '220 38 38', scoreSlot: 'mistake' },
  { key: 'light', labelKey: 'pages.achievements.warnings', icon: 'i-lucide-circle-dot', rgb: '234 179 8', scoreSlot: 'warning' },
  { key: 'minor', labelKey: 'pages.achievements.harakat', icon: 'i-lucide-circle', rgb: '22 163 74', scoreSlot: 'harakat' }
] as const

export const SEVERITY_ORDER: readonly Severity[] = SEVERITY_LEVELS.map(l => l.key)

/** The `ScoreCounts` field each severity's weighted bucket accumulates into. */
const SLOT_FIELD: Record<ScoreSlot, keyof ScoreCounts> = {
  mistake: 'mistakes_count',
  warning: 'warnings_count',
  harakat: 'harakat_errors_count'
}

/**
 * Collapse the severity counts onto the weighted score buckets the backend
 * expects. Every level charges its own weight from the halaqa's إعدادات التقييم:
 * green (`minor`) feeds `harakat_errors_count` — the same bucket the numeric
 * quick-entry form fills — so a mushaf recitation and a quick entry of the same
 * mistakes score identically.
 */
export function toScoreCounts(counts: MarkCounts): ScoreCounts {
  const out: ScoreCounts = { mistakes_count: 0, warnings_count: 0, harakat_errors_count: 0 }
  for (const lvl of SEVERITY_LEVELS) out[SLOT_FIELD[lvl.scoreSlot]] += counts[lvl.key]
  return out
}
