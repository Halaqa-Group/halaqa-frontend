import type { MushafApiLine, MushafPageData, MushafWord } from '~/types/mushaf'

type WireWord = [string, number] | [string, number, string] | [string, string, number] | [string, string, number, string]
interface WireLine {
  n: number
  k?: string
  w?: WireWord[]
  lt?: 'ayah' | 'surah_name' | 'basmallah'
  sn?: number
}
interface WirePage { page: number, surahs: number[], verses: string[], lines: WireLine[] }

function normalizeWord(tuple: WireWord, lineK: string | undefined): MushafWord {
  if (lineK) {
    const [c, p, t] = tuple as [string, number, string?]
    const w: MushafWord = { c, k: lineK, p }
    if (t) w.t = t as MushafWord['t']
    return w
  }
  const [c, k, p, t] = tuple as [string, string, number, string?]
  const w: MushafWord = { c, k, p }
  if (t) w.t = t as MushafWord['t']
  return w
}

function normalizePage(wire: WirePage): MushafPageData {
  const lines: MushafApiLine[] = wire.lines.map(line => ({
    n: line.n,
    words: (line.w ?? []).map(t => normalizeWord(t, line.k)),
    lt: line.lt,
    surah: line.sn
  }))
  return { page: wire.page, surahs: wire.surahs, verses: wire.verses, lines }
}

const injectedFonts = new Set<number>()

const fontLoaded = new Map<number, Promise<void>>()

const fontReady = new Set<number>()

const pageCache = new Map<number, MushafPageData>()
const inflight = new Map<number, Promise<MushafPageData>>()

const FONT_URL = (page: number) => `/quran/fonts/v1/p${page}.woff2`

function paddedPage(page: number): string {
  return String(page).padStart(3, '0')
}

function injectClassBinding(page: number) {
  if (injectedFonts.has(page)) return
  injectedFonts.add(page)
  const style = document.createElement('style')
  style.dataset.mushafFontPage = String(page)
  style.textContent = `.p${page}-v1 { font-family: 'p${page}-v1'; }`
  document.head.appendChild(style)
}

function ensureFontLoaded(page: number): Promise<void> {
  const cached = fontLoaded.get(page)
  if (cached) return cached
  const ff = new FontFace(
    `p${page}-v1`,
    `local(QCF_P${paddedPage(page)}), url(${FONT_URL(page)}) format('woff2')`,
    { display: 'block' }
  )
  const p = ff.load().then((loaded) => {
    document.fonts.add(loaded)
    injectClassBinding(page)
    fontReady.add(page)
  })
  fontLoaded.set(page, p)
  p.catch(() => {
    fontLoaded.delete(page)
    fontReady.delete(page)
  })
  return p
}

function loadPageJson(page: number): Promise<MushafPageData> {
  const cached = pageCache.get(page)
  if (cached) return Promise.resolve(cached)
  const existing = inflight.get(page)
  if (existing) return existing
  // `force-cache`: the page files are immutable, so a copy already in the HTTP
  // cache is served without a revalidation round-trip.
  const p = $fetch<WirePage>(`/quran/pages/${page}.json`, { cache: 'force-cache' }).then((wire) => {
    const data = normalizePage(wire)
    pageCache.set(page, data)
    inflight.delete(page)
    return data
  })
  inflight.set(page, p)
  return p
}

function onIdle(fn: () => void) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(fn, { timeout: 2000 })
  } else {
    setTimeout(fn, 200)
  }
}

export function useMushafPage(pageNumber: MaybeRefOrGetter<number>) {
  const data = ref<MushafPageData | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)
  let token = 0

  async function load(page: number) {
    if (!page || page < 1 || page > 604) {
      data.value = null
      error.value = new Error(`Invalid page number: ${page}`)
      return
    }
    const myToken = ++token
    error.value = null

    const cachedJson = pageCache.get(page)
    if (cachedJson && fontReady.has(page) && injectedFonts.has(page)) {
      data.value = cachedJson
      loading.value = false
      onIdle(() => warmNeighbourPages(page))
      return
    }

    loading.value = true
    try {
      const [pageData] = await Promise.all([
        loadPageJson(page),
        ensureFontLoaded(page)
      ])
      if (myToken !== token) return
      data.value = pageData
      onIdle(() => warmNeighbourPages(page))
    } catch (e) {
      if (myToken !== token) return
      error.value = e as Error
      data.value = null
    } finally {
      if (myToken === token) loading.value = false
    }
  }

  watch(() => toValue(pageNumber), p => load(p), { immediate: true })

  return { page: data, loading, error }
}

export function prefetchMushafPage(page: number) {
  if (page < 1 || page > 604) return
  void ensureFontLoaded(page)
  void loadPageJson(page)
}

// Just the two pages a prev/next tap or a swipe can reach. It used to be ±3,
// i.e. six page JSONs + six fonts warmed for every page viewed.
const NEIGHBOUR_RADIUS = 1

function warmNeighbourPages(page: number) {
  for (let d = 1; d <= NEIGHBOUR_RADIUS; d++) {
    prefetchMushafPage(page - d)
    prefetchMushafPage(page + d)
  }
}
