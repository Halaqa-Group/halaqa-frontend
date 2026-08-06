import type { ApiWeeklyPlan, ApiWeeklyPlanItem } from '~/types'
import type { QuranPlanProps, QuranPlanRow } from '~/components/pdf/QuranPlan.vue'
import { SURAH_NAMES } from '~/data/constants'
import { formatVerseRange } from '~/utils/quran'

// Maps a real weekly plan (`ApiWeeklyPlan`) onto the printable `QuranPlan`
// component's props. Kept as a pure function — no Vue/composable dependency — so
// it is trivially testable and reusable anywhere a plan needs printing.

type TrackType = 'Hifz' | 'Near' | 'Far'

/** DOM id the print dialog captures for PDF export. */
export const PLAN_PDF_ELEMENT_ID = 'quran-plan-print'

/** Arabic weekday name with no digits (safe for html2canvas). */
function arabicWeekday(d: Date): string {
  return d.toLocaleDateString('ar', { weekday: 'long', numberingSystem: 'latn' })
}

/**
 * Gregorian (ميلادي) date as `YYYY/MM/DD` in Western digits — built from the
 * date's own numeric parts so the numerals are always Latin (never rendered as
 * Arabic-Indic glyphs) regardless of locale.
 */
export function formatPlanDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

/** Join every session's verse range for one track/day into a single cell string. */
function rangeText(items: ApiWeeklyPlanItem[]): string {
  return items
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id)
    .map(it => formatVerseRange(it.start_surah, it.start_verse, it.end_surah, it.end_verse, SURAH_NAMES))
    .join('، ')
}

/** Overall span of a set of items as "من <first surah> إلى <last surah>". */
function spanText(items: ApiWeeklyPlanItem[]): string {
  if (!items.length) return ''
  const firstStart = items.reduce((m, it) =>
    it.start_surah < m.start_surah || (it.start_surah === m.start_surah && it.start_verse < m.start_verse) ? it : m)
  const lastEnd = items.reduce((m, it) =>
    it.end_surah > m.end_surah || (it.end_surah === m.end_surah && it.end_verse > m.end_verse) ? it : m)
  return `من ${SURAH_NAMES[firstStart.start_surah]} إلى ${SURAH_NAMES[lastEnd.end_surah]}`
}

/**
 * Auto-derive the "الإنجاز" completion line: the span of new memorization (Hifz)
 * for the week, i.e. "من <first surah> إلى <last surah>". Review tracks are
 * intentionally excluded — الإنجاز reflects what was memorized, not reviewed.
 */
export function deriveCompletionText(items: ApiWeeklyPlanItem[]): string {
  return spanText(items.filter(i => i.track_type === 'Hifz'))
}

export interface WeeklyPlanToPdfOptions {
  /** Student the plan belongs to. */
  studentName: string
  /** Resolves a `day_of_week` (0 = Saturday) to its calendar date. */
  dateForDay: (dayOfWeek: number) => Date
  /** Optional logo shown beside the title. */
  logo?: string
  /** Optional stamp image (falls back to the text stamp). */
  stampImage?: string
  /** Override the auto-derived completion text. */
  completionText?: string
}

/**
 * Build `QuranPlanProps` from a weekly plan. Produces one table row per planned
 * day (days with no sessions are omitted), each aggregating that day's Hifz /
 * Far / Near sessions into the memorization / major-review / minor-review cells.
 */
export function weeklyPlanToQuranPlan(
  plan: ApiWeeklyPlan | null,
  opts: WeeklyPlanToPdfOptions
): QuranPlanProps {
  const items = plan?.items ?? []

  const byDay = new Map<number, ApiWeeklyPlanItem[]>()
  for (const it of items) {
    const list = byDay.get(it.day_of_week) ?? []
    list.push(it)
    byDay.set(it.day_of_week, list)
  }

  const rows: QuranPlanRow[] = [...byDay.keys()]
    .sort((a, b) => a - b)
    .map((day) => {
      const dayItems = byDay.get(day)!
      const pick = (track: TrackType) => dayItems.filter(i => i.track_type === track)
      const d = opts.dateForDay(day)
      return {
        day: arabicWeekday(d),
        date: formatPlanDate(d),
        memorization: rangeText(pick('Hifz')) || '—',
        majorReview: rangeText(pick('Far')),
        minorReview: rangeText(pick('Near'))
      }
    })

  return {
    studentName: opts.studentName,
    approved: plan?.status === 'approved',
    logo: opts.logo,
    stampImage: opts.stampImage,
    completionText: opts.completionText ?? deriveCompletionText(items),
    rows,
    elementId: PLAN_PDF_ELEMENT_ID
  }
}
