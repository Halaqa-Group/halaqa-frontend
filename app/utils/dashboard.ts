import type { DashboardRange } from '~/types'

/**
 * Display helpers for the KPI dashboard (`GET /dashboard/*`).
 *
 * The backend hands back three different numeric units and they must never be
 * formatted with the same function:
 *   • rates  → fractions 0..1  → `formatKpiRate`  ("92%")
 *   • scores → 0..100          → `formatKpiScore` ("84.5")
 *   • ethics → 1..5            → `formatKpiEthics` ("4.9")
 *   • pages  → fractional      → `formatKpiPages` ("12.5")
 * Everything here renders `null`/`undefined` as an em dash rather than "0",
 * because the API uses `null` for "not authorized / no rows" and 0 for a real
 * zero — collapsing the two would lie about the data.
 */

const DASH = '—'

/** A rate fraction (0..1) as a whole-percent string. */
export function formatKpiRate(value: number | null | undefined, dash = DASH): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return dash
  return `${Math.round(value * 100)}%`
}

/** Trims trailing zeros so 24.00 → "24" but 12.50 → "12.5". */
function trim(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)))
}

/** Fractional mushaf pages (الصفحات) — up to 2 decimals, zeros trimmed. */
export function formatKpiPages(value: number | null | undefined, dash = DASH): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return dash
  return trim(value, 2)
}

/** An average `percentage_score` (0..100) — up to 1 decimal. */
export function formatKpiScore(value: number | null | undefined, dash = DASH): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return dash
  return trim(value, 1)
}

/** An average ethics rating (1..5) — up to 1 decimal. A 0 average means "no rows". */
export function formatKpiEthics(value: number | null | undefined, dash = DASH): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) return dash
  return trim(value, 1)
}

export type TrendDirection = 'up' | 'down' | 'flat'

export interface Trend {
  direction: TrendDirection
  /** Change in the metric's own unit (a rate delta stays a fraction). */
  delta: number
  /** Change relative to the previous window; `null` when that window was 0. */
  ratio: number | null
}

/**
 * Compares a KPI against the same KPI over the preceding window.
 *
 * Returns `null` — meaning "no comparison to show" — when the request did not
 * ask for `compare=true` or when either side is `null` (e.g. a teacher never
 * receives `teacher_attendance_rate`, so there is nothing to trend).
 *
 * `ratio` is deliberately `null` when the previous value was 0: going from 0 to
 * anything is an infinite percentage, so callers should show the raw `delta`.
 */
export function trendOf(
  current: number | null | undefined,
  previous: number | null | undefined
): Trend | null {
  if (current === null || current === undefined || !Number.isFinite(current)) return null
  if (previous === null || previous === undefined || !Number.isFinite(previous)) return null

  const delta = current - previous
  // Rates carry 4 decimals and pages 2, so anything smaller is rounding noise.
  const direction: TrendDirection
    = Math.abs(delta) < 0.00005 ? 'flat' : delta > 0 ? 'up' : 'down'

  return {
    direction,
    delta,
    ratio: previous === 0 ? null : delta / previous
  }
}

/** A trend badge's colour, given whether a rise is good news for this metric. */
export function trendColor(direction: TrendDirection, higherIsBetter = true): 'success' | 'error' | 'neutral' {
  if (direction === 'flat') return 'neutral'
  const good = direction === 'up' ? higherIsBetter : !higherIsBetter
  return good ? 'success' : 'error'
}

export function trendIcon(direction: TrendDirection): string {
  if (direction === 'up') return 'i-lucide-trending-up'
  if (direction === 'down') return 'i-lucide-trending-down'
  return 'i-lucide-minus'
}

/**
 * The relative change as a signed percent ("+12%").
 *
 * Returns an empty string — not a dash — when the previous window was 0, since
 * the rise is real but has no finite percentage. Callers render the direction
 * arrow on its own in that case rather than printing a misleading figure.
 */
export function formatTrendRatio(trend: Trend): string {
  if (trend.direction === 'flat') return '0%'
  if (trend.ratio === null) return ''
  const pct = Math.round(Math.abs(trend.ratio) * 100)
  if (pct === 0) return '0%'
  return `${trend.direction === 'up' ? '+' : '−'}${pct}%`
}

/** "1 Jul – 25 Jul" in the active locale; collapses to one date when from === to. */
export function formatKpiRange(range: DashboardRange | null | undefined, locale: string): string {
  if (!range) return ''
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const tag = locale === 'ar' ? 'ar-SA' : 'en-US'
  const from = new Date(`${range.from}T00:00:00`).toLocaleDateString(tag, opts)
  if (range.from === range.to) return from
  const to = new Date(`${range.to}T00:00:00`).toLocaleDateString(tag, opts)
  return `${from} – ${to}`
}

/** Medal styling for the top-students leaderboard; ranks past 3 get a plain chip. */
export function rankStyle(rank: number): { style: string, icon: string | null } {
  switch (rank) {
    case 1:
      return { style: 'background-color: var(--color-rank-gold-bg); color: var(--color-rank-gold);', icon: 'i-lucide-crown' }
    case 2:
      return { style: 'background-color: var(--color-rank-silver-bg); color: var(--color-rank-silver);', icon: 'i-lucide-medal' }
    case 3:
      return { style: 'background-color: var(--color-rank-bronze-bg); color: var(--color-rank-bronze);', icon: 'i-lucide-award' }
    default:
      return { style: 'background-color: var(--color-surface-container); color: var(--color-on-surface-variant);', icon: null }
  }
}
