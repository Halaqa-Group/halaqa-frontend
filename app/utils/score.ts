// Per-halaqa evaluation weights. Mirrors the backend's closed, typed
// `evaluation_settings` object: exactly four per-error-type weights, each the
// number of points deducted per single error of that type. There is no stored
// `base_score`/`min_score` — the 100-point base and 0 floor are frontend
// conventions (see score-formula.md in the backend).
export interface EvaluationSettings {
  mistake_weight: number
  warning_weight: number
  tajweed_weight: number
  harakat_weight: number
}

export interface ScoreCounts {
  mistakes_count: number
  warnings_count: number
  tajweed_errors_count: number
  harakat_errors_count: number
}

const BASE_SCORE = 100
const MIN_SCORE = 0

export const DEFAULT_EVALUATION_SETTINGS: EvaluationSettings = {
  mistake_weight: 4,
  warning_weight: 2,
  tajweed_weight: 1,
  harakat_weight: 2
}

function num(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

// Merges stored weights over the defaults (per-key fallback), so a partially
// configured halaqa still resolves to all four weights — matching the backend's
// `resolveEvaluationSettings()`.
export function normalizeEvaluationSettings(raw: Record<string, unknown> | null | undefined): EvaluationSettings {
  const d = DEFAULT_EVALUATION_SETTINGS
  if (!raw) return { ...d }
  return {
    mistake_weight: num(raw.mistake_weight, d.mistake_weight),
    warning_weight: num(raw.warning_weight, d.warning_weight),
    tajweed_weight: num(raw.tajweed_weight, d.tajweed_weight),
    harakat_weight: num(raw.harakat_weight, d.harakat_weight)
  }
}

/**
 * score = max(0, 100 − (Σ countᵢ·weightᵢ) ÷ pages), rounded to 2 decimals.
 *
 * The weights are defined per mushaf page: one page deducts them as configured,
 * two pages halve each deduction, three pages third it. Without that divisor a
 * long revision would be punished harder than a short one for the same rate of
 * mistakes. `pages` is fractional — half a page doubles each deduction — and for
 * a partial test it is the SUM of the tested positions, not the lesson's span.
 *
 * Defaults to 1 — pass `pagesRecited(range, positions)` for a real lesson.
 */
export function computePercentageScore(
  counts: ScoreCounts,
  settings: Record<string, unknown> | EvaluationSettings | null | undefined,
  pages: number = 1
): number {
  const s = normalizeEvaluationSettings(settings as Record<string, unknown> | null | undefined)
  const divisor = Number.isFinite(pages) && pages >= 1 ? pages : 1
  const deduction = (
    counts.mistakes_count * s.mistake_weight
    + counts.warnings_count * s.warning_weight
    + counts.tajweed_errors_count * s.tajweed_weight
    + counts.harakat_errors_count * s.harakat_weight
  ) / divisor
  const clamped = Math.max(MIN_SCORE, BASE_SCORE - deduction)
  return Math.round(clamped * 100) / 100
}
