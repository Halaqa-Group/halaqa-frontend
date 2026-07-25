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

export function surahStartGlobal(surah: number): number {
  return SURAH_OFFSETS[surah]! + 1
}

export function surahEndGlobal(surah: number): number {
  return SURAH_OFFSETS[surah]! + VERSE_COUNTS[surah]!
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

// اتجاه الخطة: مع ترتيب المصحف (الفاتحة ← البقرة) أو عكسه (البقرة ← الفاتحة).
export type PlanDirection = 'asc' | 'desc'

export interface ExpandPlanOptions {
  direction?: PlanDirection
  // A day never mixes two surahs: it stops at the surah's edge and the next day
  // opens the neighbouring surah. Without it a 2-page day starting in السجدة
  // spills a page of الأحزاب (or لقمان when descending) into the same day.
  //
  // It never overrides نوع المقدار though — see `surahHoldsWholeUnit`.
  keepWithinSurah?: boolean
}

// Trimming a day at the surah edge only makes sense when the surah is big enough
// to hold at least one whole unit of the chosen نوع المقدار. A juz is wider than
// most surahs, so trimming there would hand back a fragment instead of the juz
// the teacher asked for (a juz-a-day plan would open with الفاتحة alone). Same for
// the short surahs of جزء عمّ, several of which share a single page.
function surahHoldsWholeUnit(sortedGlobals: number[], surah: number): boolean {
  const surahStart = surahStartGlobal(surah)
  const surahEnd = surahEndGlobal(surah)
  const idx = firstBoundaryAtOrAfter(sortedGlobals, surahStart)
  if (idx < 0) return false
  const unitEnd = idx + 1 < sortedGlobals.length ? sortedGlobals[idx + 1]! - 1 : TOTAL_VERSES
  return unitEnd <= surahEnd
}

export function expandPlan(
  startKey: string,
  dailyAmount: number,
  boundaries: string[],
  activeDayCount: number,
  options: ExpandPlanOptions = {}
): VerseRange[] {
  const { direction = 'asc', keepWithinSurah = true } = options
  const bg = boundaries.map(verseKeyToGlobal).sort((a, b) => a - b)
  if (bg.length === 0 || activeDayCount <= 0) return []

  const amount = Math.max(1, dailyAmount)
  const ranges: VerseRange[] = []
  let cursor = verseKeyToGlobal(startKey)

  function push(startG: number, endG: number) {
    const start = globalToVerse(startG)
    const end = globalToVerse(endG)
    ranges.push({
      start_surah: start.surah,
      start_verse: start.verse,
      end_surah: end.surah,
      end_verse: end.verse
    })
  }

  for (let day = 0; day < activeDayCount; day++) {
    if (direction === 'asc') {
      if (cursor > TOTAL_VERSES) break
      const startG = cursor
      const unitIdx = lastBoundaryAtOrBefore(bg, startG)
      const nextIdx = unitIdx + amount
      let endG = nextIdx < bg.length ? bg[nextIdx]! - 1 : TOTAL_VERSES
      const startSurah = globalToVerse(startG).surah
      if (keepWithinSurah && surahHoldsWholeUnit(bg, startSurah)) {
        endG = Math.min(endG, surahEndGlobal(startSurah))
      }
      endG = Math.min(endG, TOTAL_VERSES)
      push(startG, endG)
      cursor = endG + 1
    } else {
      // Walking backwards: the cursor is the *end* of the day, and the day grows
      // towards the beginning of the mushaf.
      if (cursor < 1) break
      const endG = cursor
      const unitIdx = lastBoundaryAtOrBefore(bg, endG)
      const firstIdx = unitIdx - (amount - 1)
      let startG = firstIdx >= 0 ? bg[firstIdx]! : 1
      const endSurah = globalToVerse(endG).surah
      if (keepWithinSurah && surahHoldsWholeUnit(bg, endSurah)) {
        startG = Math.max(startG, surahStartGlobal(endSurah))
      }
      startG = Math.max(startG, 1)
      push(startG, endG)
      cursor = startG - 1
    }
  }

  return ranges
}

function firstBoundaryAtOrAfter(sortedGlobals: number[], target: number): number {
  let lo = 0
  let hi = sortedGlobals.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (sortedGlobals[mid]! >= target) {
      ans = mid
      hi = mid - 1
    } else {
      lo = mid + 1
    }
  }
  return ans
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
