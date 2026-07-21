import quranStructure from '~/data/quran-structure.json'
import { TOTAL_VERSES, verseKeyToGlobal, verseToGlobal } from '~/utils/quran-structure'

type VerseToPageMap = Record<string, number>

const PAGE_START_GLOBALS: number[] = (quranStructure.pageStarts as string[]).map(verseKeyToGlobal)

function pageForGlobal(global: number): number | undefined {
  const starts = PAGE_START_GLOBALS
  if (!starts.length || global < starts[0]!) return undefined
  let lo = 0
  let hi = starts.length - 1
  let ans = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (starts[mid]! <= global) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return ans + 1
}

/** Mushaf page a verse sits on. Pure — the page map is a static import. */
export function pageForVerseKey(verseKey: string): number | undefined {
  const [s, v] = verseKey.split(':').map(Number)
  if (!s || !v) return undefined
  return pageForGlobal(verseKeyToGlobal(verseKey))
}

/** First and last global verse index of a mushaf page. */
function pageBounds(page: number): { start: number, end: number } | null {
  const start = PAGE_START_GLOBALS[page - 1]
  if (start === undefined) return null
  const next = PAGE_START_GLOBALS[page]
  return { start, end: (next ?? TOTAL_VERSES + 1) - 1 }
}

export interface VerseRangeLike {
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
}

/**
 * How much of the mushaf a verse range covers, measured in pages and allowed to
 * be fractional: half a page is 0.5, not 1. Coverage of each touched page is its
 * share of that page's verses, since verse counts are the only granularity the
 * page map gives us.
 */
export function pageCoverage(range: VerseRangeLike): number {
  const from = verseToGlobal(range.start_surah, range.start_verse)
  const to = verseToGlobal(range.end_surah, range.end_verse)
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0

  const firstPage = pageForGlobal(from)
  const lastPage = pageForGlobal(to)
  if (!firstPage || !lastPage) return 0

  let total = 0
  for (let p = firstPage; p <= lastPage; p++) {
    const b = pageBounds(p)
    if (!b) continue
    const versesOnPage = b.end - b.start + 1
    const overlap = Math.min(to, b.end) - Math.max(from, b.start) + 1
    if (versesOnPage > 0 && overlap > 0) total += overlap / versesOnPage
  }
  return total
}

/**
 * The divisor for the evaluation weights — how many pages the student actually
 * recited. The weights are calibrated per page, so recite two pages and each
 * deduction is halved; recite half a page and it doubles.
 *
 * For a partial test (مراجعة قريبة/بعيدة recited at chosen مواضع) only the
 * positions were recited, so it is the SUM of their coverage — a page + half a
 * page + a page is 2.5 — not the span of the lesson they were drawn from.
 * `full` measures the lesson range itself.
 *
 * Falls back to 1 when nothing resolves, so it is always safe to divide by.
 */
export function pagesRecited(
  range: VerseRangeLike,
  positions?: readonly VerseRangeLike[] | null
): number {
  const total = positions?.length
    ? positions.reduce((sum, p) => sum + pageCoverage(p), 0)
    : pageCoverage(range)
  return Number.isFinite(total) && total > 0 ? total : 1
}

export function useVerseToPage() {
  const pageFor = pageForVerseKey

  return {
    data: readonly(ref<VerseToPageMap | null>(null)),
    loading: readonly(ref(false)),
    error: readonly(ref<Error | null>(null)),
    pageFor
  }
}
