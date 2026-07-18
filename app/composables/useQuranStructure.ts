import quranStructure from '~/data/quran-structure.json'
import { pageStartsFromMap, surahStarts, type PlanUnit } from '~/utils/quran-structure'

interface QuranStructure {
  pageStarts: string[]
  juzStarts: string[]
  hizbStarts: string[]
  rubStarts: string[]
}

// The page/juz/hizb/rub boundaries are fixed canonical data for the Madani
// mushaf, so they're bundled as committed app data rather than fetched from the
// git-ignored, network-built `public/quran/meta/quran-structure.json`. That file
// could arrive missing, truncated (partial download), or stale (browser HTTP
// cache) — which previously left juz/hizb/quarter disabled in the plan wizard and
// collapsed page plans into a single range. Bundling makes every unit available
// synchronously, with no fetch and no cache to go wrong.
const STRUCTURE = quranStructure as QuranStructure

export function useQuranStructure() {
  const data = ref<QuranStructure>(STRUCTURE)
  const loading = ref(false)
  const { data: v2p } = useVerseToPage()

  function unitAvailable(unit: PlanUnit): boolean {
    if (unit === 'surah') return true
    if (unit === 'page') return !!data.value.pageStarts.length || !!v2p.value
    if (unit === 'juz') return !!data.value.juzStarts.length
    if (unit === 'hizb') return !!data.value.hizbStarts.length
    if (unit === 'quarter') return !!data.value.rubStarts.length
    return false
  }

  function boundariesFor(unit: PlanUnit): string[] {
    switch (unit) {
      case 'surah':
        return surahStarts()
      case 'page':
        // Bundled page starts are authoritative; fall back to deriving them from
        // the verse-to-page map only in the unlikely event the bundle is empty.
        if (data.value.pageStarts.length) return data.value.pageStarts
        return v2p.value ? pageStartsFromMap(v2p.value as Record<string, number>) : []
      case 'juz':
        return data.value.juzStarts
      case 'hizb':
        return data.value.hizbStarts
      case 'quarter':
        return data.value.rubStarts
      default:
        return []
    }
  }

  return { data: readonly(data), loading: readonly(loading), unitAvailable, boundariesFor }
}
