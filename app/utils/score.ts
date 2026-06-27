/**
 * Client-side mirror of the backend AchievementScoreService.compute().
 *
 * The backend requires `percentage_score` in the create/update body and derives
 * it from the halaqa's `evaluation_settings` JSON. We compute the same value here
 * so the value we send matches what the backend would have computed.
 *
 * Formula:
 *   score = max(min_score,
 *               base_score
 *                 - mistakes_count       * mistake_weight
 *                 - warnings_count       * warning_weight
 *                 - tajweed_errors_count * tajweed_weight)
 * then rounded to 2 decimal places.
 */

export interface EvaluationSettings {
  base_score: number
  mistake_weight: number
  warning_weight: number
  tajweed_weight: number
  min_score: number
}

export interface ScoreCounts {
  mistakes_count: number
  warnings_count: number
  tajweed_errors_count: number
}

/** Defaults the halaqat module enforces when settings are absent. */
export const DEFAULT_EVALUATION_SETTINGS: EvaluationSettings = {
  base_score: 100,
  mistake_weight: 2,
  warning_weight: 1,
  tajweed_weight: 1.5,
  min_score: 0
}

function num(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

/** Coerce a loose `evaluation_settings` JSON blob into a complete settings object. */
export function normalizeEvaluationSettings(raw: Record<string, unknown> | null | undefined): EvaluationSettings {
  const d = DEFAULT_EVALUATION_SETTINGS
  if (!raw) return { ...d }
  return {
    base_score: num(raw.base_score, d.base_score),
    mistake_weight: num(raw.mistake_weight, d.mistake_weight),
    warning_weight: num(raw.warning_weight, d.warning_weight),
    tajweed_weight: num(raw.tajweed_weight, d.tajweed_weight),
    min_score: num(raw.min_score, d.min_score)
  }
}

export function computePercentageScore(
  counts: ScoreCounts,
  settings: Record<string, unknown> | EvaluationSettings | null | undefined
): number {
  const s = normalizeEvaluationSettings(settings as Record<string, unknown> | null | undefined)
  const raw = s.base_score
    - counts.mistakes_count * s.mistake_weight
    - counts.warnings_count * s.warning_weight
    - counts.tajweed_errors_count * s.tajweed_weight
  const clamped = Math.max(s.min_score, raw)
  return Math.round(clamped * 100) / 100
}
