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

export function useVerseToPage() {
  function pageFor(verseKey: string): number | undefined {
    const [s, v] = verseKey.split(':').map(Number)
    if (!s || !v) return undefined
    return pageForGlobal(verseKeyToGlobal(verseKey))
  }

  return {
    data: readonly(ref<VerseToPageMap | null>(null)),
    loading: readonly(ref(false)),
    error: readonly(ref<Error | null>(null)),
    pageFor
  }
}
