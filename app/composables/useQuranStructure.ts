/**
 * Loads mushaf structural boundaries used by the plan generator.
 *
 * `meta/quran-structure.json` (built by scripts/build-quran-assets.mjs) holds
 * ascending verse_key arrays for pages / juz / hizb / rub-el-hizb (quarter).
 * It's optional: `surah` boundaries are computed locally and `page` falls back
 * to verse-to-page.json, so the wizard's core units keep working even before
 * the asset is generated. juz/hizb/quarter simply report unavailable until then.
 */
import { pageStartsFromMap, surahStarts, type PlanUnit } from '~/utils/quran-structure'

interface QuranStructure {
  pageStarts: string[]
  juzStarts: string[]
  hizbStarts: string[]
  rubStarts: string[]
}

let cache: QuranStructure | null = null
let inflight: Promise<QuranStructure | null> | null = null

async function loadStructure(): Promise<QuranStructure | null> {
  if (cache) return cache
  if (inflight) return inflight
  inflight = $fetch<QuranStructure>('/quran/meta/quran-structure.json')
    .then((s) => {
      cache = s
      inflight = null
      return s
    })
    .catch(() => {
      // Asset not built yet — degrade gracefully.
      inflight = null
      return null
    })
  return inflight
}

export function useQuranStructure() {
  const data = ref<QuranStructure | null>(cache)
  const loading = ref(!cache)
  const { data: v2p } = useVerseToPage()

  if (!cache) {
    loadStructure()
      .then((s) => { data.value = s })
      .finally(() => { loading.value = false })
  }

  /** Whether a unit can be generated right now (has boundary data). */
  function unitAvailable(unit: PlanUnit): boolean {
    if (unit === 'surah') return true
    if (unit === 'page') return !!data.value?.pageStarts?.length || !!v2p.value
    if (unit === 'juz') return !!data.value?.juzStarts?.length
    if (unit === 'hizb') return !!data.value?.hizbStarts?.length
    if (unit === 'quarter') return !!data.value?.rubStarts?.length
    return false
  }

  /** Ascending unit-start verse_keys for a unit, or [] when unavailable. */
  function boundariesFor(unit: PlanUnit): string[] {
    switch (unit) {
      case 'surah':
        return surahStarts()
      case 'page':
        if (data.value?.pageStarts?.length) return data.value.pageStarts
        return v2p.value ? pageStartsFromMap(v2p.value as Record<string, number>) : []
      case 'juz':
        return data.value?.juzStarts ?? []
      case 'hizb':
        return data.value?.hizbStarts ?? []
      case 'quarter':
        return data.value?.rubStarts ?? []
      default:
        return []
    }
  }

  return { data: readonly(data), loading: readonly(loading), unitAvailable, boundariesFor }
}
