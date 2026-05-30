import type { MushafApiLine, MushafPageData, MushafWord } from '~/types/mushaf'

// ── Wire format ────────────────────────────────────────────────────────────
//
// public/quran/pages/{N}.json uses a compact tuple shape for size:
//   - line-level k present  → word tuple = [char, position]            or [char, position, type]
//   - line-level k absent   → word tuple = [char, verseKey, position]  or [char, verseKey, position, type]
//
// We normalize back to {c,k,p,t} objects after fetch so every downstream
// consumer (synthesizeLines, MushafLine, RecitationSession) sees the same
// shape regardless of wire format. ~40% smaller on disk, ~0.1ms transform.
type WireWord = [string, number] | [string, number, string] | [string, string, number] | [string, string, number, string]
interface WireLine { n: number, k?: string, w: WireWord[] }
interface WirePage { page: number, surahs: number[], verses: string[], lines: WireLine[] }

function normalizeWord(tuple: WireWord, lineK: string | undefined): MushafWord {
  if (lineK) {
    // [char, position]  or  [char, position, type]
    const [c, p, t] = tuple as [string, number, string?]
    const w: MushafWord = { c, k: lineK, p }
    if (t) w.t = t as MushafWord['t']
    return w
  }
  // [char, verseKey, position]  or  [char, verseKey, position, type]
  const [c, k, p, t] = tuple as [string, string, number, string?]
  const w: MushafWord = { c, k, p }
  if (t) w.t = t as MushafWord['t']
  return w
}

function normalizePage(wire: WirePage): MushafPageData {
  const lines: MushafApiLine[] = wire.lines.map(line => ({
    n: line.n,
    words: line.w.map(t => normalizeWord(t, line.k))
  }))
  return { page: wire.page, surahs: wire.surahs, verses: wire.verses, lines }
}

// Pages whose @font-face has already been injected into <head>.
const injectedFonts = new Set<number>()

// Per-page font load promise — cached so concurrent callers share one load,
// and so prefetched fonts are awaited (not re-fetched) when the user navigates.
const fontLoaded = new Map<number, Promise<void>>()

// Pages whose font has finished loading and is ready to paint. We track this
// ourselves instead of relying on `document.fonts.check()` — that API returns
// false until the next paint cycle even after FontFace.load() resolves, which
// kept forcing the slow path (and the skeleton flash) for pages that were
// actually ready.
const fontReady = new Set<number>()

// Cache page JSON across the app — pages are immutable, so one fetch per page
// per session is enough.
const pageCache = new Map<number, MushafPageData>()
const inflight = new Map<number, Promise<MushafPageData>>()

// Self-hosted under public/quran/fonts/v1/ — see scripts/build-quran-assets.mjs.
// Serving fonts from same-origin eliminates the per-page DNS + TLS round-trip
// that made navigating to a fresh page take ~2 seconds against Tarteel's CDN.
//
// Layout: KFGQPC v1 (1405H print). Glyph codes (code_v1) and per-page font
// files are paired — each font remaps PUA codepoints to that page's glyphs.
const FONT_URL = (page: number) => `/quran/fonts/v1/p${page}.woff2`

// Padded local() name matches QUL's CSS pattern (QCF_P001..QCF_P604) so
// installed system copies of the v1 fonts get picked up where available.
function paddedPage(page: number): string {
  return String(page).padStart(3, '0')
}

// Inject only the small `.pN-v1 { font-family: 'pN-v1' }` class binding.
// The actual @font-face is built imperatively via the FontFace API in
// ensureFontLoaded() so we can detect download failures (CSS @font-face
// silently swallows network errors).
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
  // FontFace.load() rejects on network failure (unlike `document.fonts.load`
  // against an @font-face declaration). This is what surfaces font outages
  // to the caller so the UI can show a meaningful error.
  const ff = new FontFace(
    `p${page}-v1`,
    `local(QCF_P${paddedPage(page)}), url(${FONT_URL(page)}) format('woff2')`,
    { display: 'block' }
  )
  const p = ff.load().then(loaded => {
    document.fonts.add(loaded)
    injectClassBinding(page)
    fontReady.add(page)
  })
  fontLoaded.set(page, p)
  // Drop the cached failure so the user can retry by re-navigating.
  p.catch(() => { fontLoaded.delete(page); fontReady.delete(page) })
  return p
}

function loadPageJson(page: number): Promise<MushafPageData> {
  const cached = pageCache.get(page)
  if (cached) return Promise.resolve(cached)
  const existing = inflight.get(page)
  if (existing) return existing
  const p = $fetch<WirePage>(`/quran/pages/${page}.json`).then((wire) => {
    const data = normalizePage(wire)
    pageCache.set(page, data)
    inflight.delete(page)
    return data
  })
  inflight.set(page, p)
  return p
}

// requestIdleCallback isn't on older Safari — small fallback so we don't crash.
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
  // Token used to detect stale loads — if the user navigates while a load is
  // in flight, we drop the older result so it can't clobber the newer one.
  let token = 0

  async function load(page: number) {
    if (!page || page < 1 || page > 604) {
      data.value = null
      error.value = new Error(`Invalid page number: ${page}`)
      return
    }
    const myToken = ++token
    error.value = null

    // Fast path: both the JSON and the font are already in memory. Skip the
    // loading flag entirely so the skeleton never flashes for prefetched
    // / recently-viewed pages — navigation looks instant.
    const cachedJson = pageCache.get(page)
    if (cachedJson && fontReady.has(page) && injectedFonts.has(page)) {
      data.value = cachedJson
      loading.value = false
      onIdle(() => {
        prefetchMushafPage(page - 1)
        prefetchMushafPage(page + 1)
      })
      return
    }

    // Slow path: at least one of (font, JSON) needs to load. With local
    // fonts this is ~30ms cold, so we don't even bother showing the
    // skeleton during the wait — the old page stays put for one frame.
    loading.value = true
    try {
      const [pageData] = await Promise.all([
        loadPageJson(page),
        ensureFontLoaded(page)
      ])
      if (myToken !== token) return
      data.value = pageData
      onIdle(() => {
        prefetchMushafPage(page - 1)
        prefetchMushafPage(page + 1)
      })
    } catch (e) {
      if (myToken !== token) return
      error.value = e as Error
      data.value = null
    } finally {
      if (myToken === token) loading.value = false
    }
  }

  watch(() => toValue(pageNumber), p => load(p), { immediate: true })

  // Plain refs (not readonly()) so consumers can pass page.value through
  // synthesizeLines() etc. without DeepReadonly type fights. Mutation is
  // a convention, not a wall — we trust callers not to write to these.
  return { page: data, loading, error }
}

// Public prefetch — used internally for neighbour warm-up, and by callers
// (e.g. RangeViewer in Phase 2) to pre-warm any page they're about to render.
export function prefetchMushafPage(page: number) {
  if (page < 1 || page > 604) return
  void ensureFontLoaded(page)
  void loadPageJson(page)
}
