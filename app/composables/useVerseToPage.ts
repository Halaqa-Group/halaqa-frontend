type VerseToPageMap = Record<string, number>

let cache: VerseToPageMap | null = null
let inflight: Promise<VerseToPageMap> | null = null

async function loadMap(): Promise<VerseToPageMap> {
  if (cache) return cache
  if (inflight) return inflight
  inflight = $fetch<VerseToPageMap>('/quran/meta/verse-to-page.json').then((m) => {
    cache = m
    inflight = null
    return m
  })
  return inflight
}

export function useVerseToPage() {
  const data = ref<VerseToPageMap | null>(cache)
  const loading = ref(!cache)
  const error = ref<Error | null>(null)

  if (!cache) {
    loadMap()
      .then((m) => { data.value = m })
      .catch((e) => { error.value = e as Error })
      .finally(() => { loading.value = false })
  }

  function pageFor(verseKey: string): number | undefined {
    return data.value?.[verseKey]
  }

  return { data: readonly(data), loading: readonly(loading), error: readonly(error), pageFor }
}
