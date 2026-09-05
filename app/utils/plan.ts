import type { BadgeColor } from '~/utils/halaqa'
import type { MemorizationDirection } from '~/types'
import { VERSE_COUNTS } from '~/utils/quran'
import { formatDateObj, toYmd } from '~/utils/date'
import type { PlanDirection, VerseRange } from '~/utils/quran-structure'

const LAST_SURAH = 114

/**
 * Where a teacher's plans and records almost always open — سورة الروم, the start of
 * جزء ٢١. Forms seed their "start from" picker here (passed explicitly) instead of
 * defaulting to either end of the mushaf.
 */
export const DEFAULT_PLAN_START_SURAH = 30

/**
 * The student's `memorization_direction` as the planner's own direction flag.
 * Anything unset falls back to `desc` — the API's column default.
 */
export function planDirectionOf(direction: MemorizationDirection | null | undefined): PlanDirection {
  return direction === 'ascending' ? 'asc' : 'desc'
}

/**
 * Where a fresh session starts when nothing else is known: the first surah going
 * forwards, the last one going backwards (`descending` starts at An-Nas). Covers
 * the whole anchor surah, which is what a new lesson usually gets trimmed from.
 * Pass `anchorSurah` to seed a specific surah instead (e.g. DEFAULT_PLAN_START_SURAH).
 */
export function defaultSessionRange(direction: PlanDirection, anchorSurah?: number): VerseRange {
  const surah = anchorSurah ?? (direction === 'desc' ? LAST_SURAH : 1)
  return { start_surah: surah, start_verse: 1, end_surah: surah, end_verse: VERSE_COUNTS[surah] || 1 }
}

export function backendDayOfWeek(d: Date): number {
  return (d.getDay() + 1) % 7
}

export function startOfWeekSat(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  r.setDate(r.getDate() - backendDayOfWeek(r))
  return r
}

/**
 * A planner day's long-form label — "الأحد ٣ أغسطس" — using Latin digits, with a
 * graceful fall back to the ISO date when the locale's formatter chokes.
 */
export function dateOfDayLabel(d: Date, locale: string): string {
  return formatDateObj(d, locale, { weekday: 'long', day: 'numeric', month: 'long' }, toYmd(d))
}

export function planItemStatusColor(status: string): BadgeColor {
  switch (status) {
    case 'completed': return 'success'
    case 'partial': return 'warning'
    case 'overdue': return 'error'
    default: return 'neutral'
  }
}

export function planItemStatusDot(status: string): string {
  switch (status) {
    case 'completed': return 'bg-success-500'
    case 'partial': return 'bg-warning-500'
    case 'overdue': return 'bg-error-500'
    default: return 'bg-neutral-400'
  }
}
