import quranStructure from '~/data/quran-structure.json'
import { verseKeyToGlobal } from '~/utils/quran-structure'

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

/**
 * How many mushaf pages a lesson range touches, counting partial pages. This is
 * the divisor for the evaluation weights: they are calibrated for a one-page
 * lesson, so a two-page range halves each deduction, three thirds it, and so on
 * — otherwise a long revision would be scored harsher than a short one for the
 * same rate of mistakes. Never below 1, so it is always safe to divide by.
 */
export function pageSpan(
  startSurah: number,
  startVerse: number,
  endSurah: number,
  endVerse: number
): number {
  const start = pageForVerseKey(`${startSurah}:${startVerse}`)
  const end = pageForVerseKey(`${endSurah}:${endVerse}`)
  if (!start || !end) return 1
  return Math.max(1, end - start + 1)
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
