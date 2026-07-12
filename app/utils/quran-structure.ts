import { VERSE_COUNTS } from '~/utils/quran'

export type PlanUnit = 'page' | 'juz' | 'hizb' | 'quarter' | 'surah'

// Whole-Quran totals per unit — the upper bound for a daily amount of each
// نوع المقدار. A daily amount is only meaningful up to the number of units the
// Quran holds (e.g. at most 30 juz, 240 quarters).
export const UNIT_TOTALS: Record<PlanUnit, number> = {
  page: 614,
  juz: 30,
  hizb: 60,
  quarter: 240,
  surah: 114
}

export interface VerseRange {
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
}

const SURAH_OFFSETS: number[] = (() => {
  const offsets = [0, 0]
  let acc = 0
  for (let s = 1; s <= 114; s++) {
    offsets[s] = acc
    acc += VERSE_COUNTS[s]!
  }
  return offsets
})()

export const TOTAL_VERSES = SURAH_OFFSETS[114]! + VERSE_COUNTS[114]!

export function verseToGlobal(surah: number, verse: number): number {
  return SURAH_OFFSETS[surah]! + verse
}

export function globalToVerse(global: number): { surah: number, verse: number } {
  const g = Math.min(Math.max(global, 1), TOTAL_VERSES)
  for (let s = 114; s >= 1; s--) {
    if (SURAH_OFFSETS[s]! < g) return { surah: s, verse: g - SURAH_OFFSETS[s]! }
  }
  return { surah: 1, verse: 1 }
}

export function verseKeyToGlobal(key: string): number {
  const [s, v] = key.split(':').map(Number)
  return verseToGlobal(s!, v!)
}

export function compareVerse(a: string, b: string): number {
  return verseKeyToGlobal(a) - verseKeyToGlobal(b)
}

export function nextVerseKey(key: string): string | null {
  const g = verseKeyToGlobal(key) + 1
  if (g > TOTAL_VERSES) return null
  const { surah, verse } = globalToVerse(g)
  return `${surah}:${verse}`
}

export function surahStarts(): string[] {
  const out: string[] = []
  for (let s = 1; s <= 114; s++) out.push(`${s}:1`)
  return out
}

export function pageStartsFromMap(verseToPage: Record<string, number>): string[] {
  const firstOfPage = new Map<number, number>()
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
