/**
 * Quran structural math for the weekly-plan generator.
 *
 * Everything here works on a single linear verse index (1..6236, where global
 * 1 === "1:1") derived from VERSE_COUNTS. That lets us treat "advance N pages"
 * / "advance N juz" uniformly: a *unit* is just an ordered list of verse_keys
 * that each begin a chunk, and expanding a plan is walking that list.
 *
 * Page starts come from verse-to-page.json (already shipped); surah starts are
 * computed here; juz/hizb/quarter starts come from meta/quran-structure.json
 * (see scripts/build-quran-assets.mjs + useQuranStructure()).
 */
import { VERSE_COUNTS } from '~/utils/quran'

export type PlanUnit = 'page' | 'juz' | 'hizb' | 'quarter' | 'surah'

export interface VerseRange {
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
}

/** Cumulative verse offset before each surah. SURAH_OFFSETS[s] + v === global index of s:v. */
const SURAH_OFFSETS: number[] = (() => {
  const offsets = [0, 0] // index 0 unused; surah 1 starts after 0 verses
  let acc = 0
  for (let s = 1; s <= 114; s++) {
    offsets[s] = acc
    acc += VERSE_COUNTS[s]!
  }
  return offsets
})()

/** Total ayat in the mushaf (6236). */
export const TOTAL_VERSES = SURAH_OFFSETS[114]! + VERSE_COUNTS[114]!

/** 1-based global index of a verse. global(1,1) === 1. */
export function verseToGlobal(surah: number, verse: number): number {
  return SURAH_OFFSETS[surah]! + verse
}

/** Inverse of verseToGlobal. Clamps to [1, TOTAL_VERSES]. */
export function globalToVerse(global: number): { surah: number, verse: number } {
  const g = Math.min(Math.max(global, 1), TOTAL_VERSES)
  // SURAH_OFFSETS is monotonic — walk from the top so the first surah whose
  // offset is below g owns the verse. Linear over 114 is trivially fast.
  for (let s = 114; s >= 1; s--) {
    if (SURAH_OFFSETS[s]! < g) return { surah: s, verse: g - SURAH_OFFSETS[s]! }
  }
  return { surah: 1, verse: 1 }
}

export function verseKeyToGlobal(key: string): number {
  const [s, v] = key.split(':').map(Number)
  return verseToGlobal(s!, v!)
}

/** Compare two "s:v" keys by reading order. <0, 0, >0. */
export function compareVerse(a: string, b: string): number {
  return verseKeyToGlobal(a) - verseKeyToGlobal(b)
}

/** The next verse_key in reading order, or null past the end of the mushaf. */
export function nextVerseKey(key: string): string | null {
  const g = verseKeyToGlobal(key) + 1
  if (g > TOTAL_VERSES) return null
  const { surah, verse } = globalToVerse(g)
  return `${surah}:${verse}`
}

/** verse_key of the first ayah of every surah — the "surah" unit boundaries. */
export function surahStarts(): string[] {
  const out: string[] = []
  for (let s = 1; s <= 114; s++) out.push(`${s}:1`)
  return out
}

/**
 * Invert a verse-to-page map into ascending page-start verse_keys. The first
 * verse_key encountered (by global order) for each page begins that page.
 */
export function pageStartsFromMap(verseToPage: Record<string, number>): string[] {
  const firstOfPage = new Map<number, number>() // page -> smallest global index
  for (const [key, page] of Object.entries(verseToPage)) {
    const g = verseKeyToGlobal(key)
    const cur = firstOfPage.get(page)
    if (cur === undefined || g < cur) firstOfPage.set(page, g)
  }
  return Array.from(firstOfPage.values())
    .sort((a, b) => a - b)
    .map((g) => {
      const { surah, verse } = globalToVerse(g)
      return `${surah}:${verse}`
    })
}

/**
 * Expand a track into one verse-range per active day.
 *
 * `boundaries` is the ascending list of unit-start verse_keys for the chosen
 * unit (e.g. every page start). Starting at `startKey`, each day consumes
 * `dailyAmount` whole units — counting the (possibly partial) unit that
 * contains the cursor as the first. So starting mid-page with 1 page/day makes
 * day 1 run from the chosen ayah to the end of that page, then full pages after.
 *
 * Returns up to `activeDayCount` ranges (fewer if the mushaf ends first).
 */
export function expandPlan(
  startKey: string,
  dailyAmount: number,
  boundaries: string[],
  activeDayCount: number
): VerseRange[] {
  const bg = boundaries.map(verseKeyToGlobal).sort((a, b) => a - b)
  if (bg.length === 0 || activeDayCount <= 0) return []

  const amount = Math.max(1, dailyAmount)
  const ranges: VerseRange[] = []
  let cursor = verseKeyToGlobal(startKey)

  for (let day = 0; day < activeDayCount && cursor <= TOTAL_VERSES; day++) {
    const startG = cursor
    // Index of the boundary at or before the cursor (the unit it sits in).
    const unitIdx = lastBoundaryAtOrBefore(bg, startG)
    const nextIdx = unitIdx + amount
    const endG = nextIdx < bg.length ? bg[nextIdx]! - 1 : TOTAL_VERSES
    const clampedEnd = Math.min(endG, TOTAL_VERSES)

    const start = globalToVerse(startG)
    const end = globalToVerse(clampedEnd)
    ranges.push({
      start_surah: start.surah,
      start_verse: start.verse,
      end_surah: end.surah,
      end_verse: end.verse
    })

    cursor = clampedEnd + 1
  }

  return ranges
}

/** Binary search: index of the greatest boundary <= target (>= 0). */
function lastBoundaryAtOrBefore(sortedGlobals: number[], target: number): number {
  let lo = 0
  let hi = sortedGlobals.length - 1
  let ans = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (sortedGlobals[mid]! <= target) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return ans
}
