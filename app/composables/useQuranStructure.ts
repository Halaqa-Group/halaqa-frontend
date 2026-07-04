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

  function unitAvailable(unit: PlanUnit): boolean {
    if (unit === 'surah') return true
    if (unit === 'page') return !!data.value?.pageStarts?.length || !!v2p.value
    if (unit === 'juz') return !!data.value?.juzStarts?.length
    if (unit === 'hizb') return !!data.value?.hizbStarts?.length
    if (unit === 'quarter') return !!data.value?.rubStarts?.length
    return false
  }

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
