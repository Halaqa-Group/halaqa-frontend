import type { ScoreCounts } from '~/utils/score'

// Recitation marks follow Tarteel's error-highlighting model: instead of tagging
// a word by the *type* of mistake, each marked word carries a *severity* on a
// red→orange→yellow→green spectrum. Tapping a word cycles it down that spectrum
// and then clears it (see `useRecitationSession`).
export type Severity = 'severe' | 'medium' | 'light' | 'minor'

export type WordKey = string

export type RecitationMarks = Record<WordKey, Severity>

// Words marked together as one drag-selected run share a block id. A block counts
// as a single mistake (one count, one score hit, one error row) even though every
// word in it is still highlighted individually. Words absent from this map are
// standalone single-word marks. See `useRecitationSession`.
export type MarkGroups = Record<WordKey, string>

export interface MarkCounts {
  severe: number
  medium: number
  light: number
  minor: number
  total: number
}

// Which weighted achievement bucket a severity feeds when scoring. The backend
// still stores three counts (mistakes/warnings/tajweed); we reuse those weighted
// slots. 'none' = green: a "watch" flag that carries no penalty.
export type ScoreSlot = 'mistake' | 'tajweed' | 'warning' | 'none'

export interface SeverityMeta {
  key: Severity
  /** Arabic label shown in the toolbar legend and dialogs. */
  label: string
  icon: string
  /** Themeable color used for the word shading and legend swatch. */
  rgb: string
  scoreSlot: ScoreSlot
}

// Ordered most-severe → least-severe. This order is also the tap-cycle order:
//   (unmarked) → severe → medium → light → minor → (unmarked)
export const SEVERITY_LEVELS: readonly SeverityMeta[] = [
  { key: 'severe', label: 'خطأ جسيم', icon: 'i-lucide-circle-x', rgb: '220 38 38', scoreSlot: 'mistake' },
  { key: 'medium', label: 'خطأ متوسط', icon: 'i-lucide-circle-alert', rgb: '234 88 12', scoreSlot: 'tajweed' },
  { key: 'light', label: 'خطأ خفيف', icon: 'i-lucide-circle-dot', rgb: '234 179 8', scoreSlot: 'warning' },
  { key: 'minor', label: 'تنبيه بسيط', icon: 'i-lucide-circle', rgb: '22 163 74', scoreSlot: 'none' }
] as const

export const SEVERITY_ORDER: readonly Severity[] = SEVERITY_LEVELS.map(l => l.key)

/**
 * Collapse the four severity counts onto the weighted score buckets the backend
 * expects. Green (`minor`) is intentionally dropped — it carries no penalty.
 * The mushaf severity spectrum has no `harakat` concept (that error type is only
 * captured via the numeric quick-entry form), so `harakat_errors_count` is 0
 * from this flow.
 */
export function toScoreCounts(counts: MarkCounts): ScoreCounts {
  let mistakes_count = 0
  let warnings_count = 0
  let tajweed_errors_count = 0
  for (const lvl of SEVERITY_LEVELS) {
    const n = counts[lvl.key]
    if (lvl.scoreSlot === 'mistake') mistakes_count += n
    else if (lvl.scoreSlot === 'warning') warnings_count += n
    else if (lvl.scoreSlot === 'tajweed') tajweed_errors_count += n
  }
  return { mistakes_count, warnings_count, tajweed_errors_count, harakat_errors_count: 0 }
}
