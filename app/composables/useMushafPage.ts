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
      onIdle(() => warmNeighbourPages(page))
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

// Neighbour radius for the idle warm-up after a successful page load.
// ±3 keeps page-by-page scrolling and back/forward navigation hot without
// touching pages the user is unlikely to reach from here.
const NEIGHBOUR_RADIUS = 3

function warmNeighbourPages(page: number) {
  for (let d = 1; d <= NEIGHBOUR_RADIUS; d++) {
    prefetchMushafPage(page - d)
    prefetchMushafPage(page + d)
  }
}

// One-shot, best-effort: fetch every page's woff2 into the SW cache so future
// FontFace loads never touch the network. We deliberately do NOT call
// FontFace.load() for these — that would register all 604 fonts with
// document.fonts (~42 MB of parsed font data in memory). The bytes-only
// strategy keeps memory bounded while still making cold-page font loads
// hit the SW cache (~3 ms) instead of the network (~50-500 ms).
//
// Pacing: 2 parallel fetches with an idle gap between each, so this can
// run for a minute in the background without competing with active use.
// Skipped on metered/slow connections so we don't burn the user's data.
let warmAllFontBytesPromise: Promise<void> | null = null

export function warmAllFontBytes(): Promise<void> {
  if (warmAllFontBytesPromise) return warmAllFontBytesPromise

  warmAllFontBytesPromise = (async () => {
    if (typeof navigator === 'undefined') return
    // NetworkInformation is non-standard — guard accordingly.
    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean, effectiveType?: string }
    }).connection
    if (conn?.saveData) return
    if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return

    const CONCURRENCY = 2
    const queue: number[] = []
    for (let p = 1; p <= 604; p++) queue.push(p)

    async function paceIdle(): Promise<void> {
      return new Promise((r) => {
        if (typeof requestIdleCallback === 'function') {
          requestIdleCallback(() => r(), { timeout: 500 })
        } else {
          setTimeout(r, 50)
        }
      })
    }

    async function worker() {
      while (queue.length) {
        const p = queue.shift()!
        // Skip pages whose font is already fully registered — going through
        // the network again would just churn the SW cache for no gain.
        if (fontReady.has(p)) { await paceIdle(); continue }
        try {
          // `cache: 'force-cache'` short-circuits to HTTP cache when present;
          // SW still gets a fetch event either way and serves from its cache
          // if it has one. Reading the blob ensures the body is fully
          // downloaded so the SW writes a complete response.
          const res = await fetch(`/quran/fonts/v1/p${p}.woff2`, { cache: 'force-cache' })
          await res.blob()
        } catch {
          // Best-effort — log nothing, the on-demand FontFace.load() path
          // will handle this page later.
        }
        await paceIdle()
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  })()

  return warmAllFontBytesPromise
}

// Bulk-prime the in-memory pageCache from /quran/meta/pages-all.json.
// Called once at idle time by app/plugins/quran-bundle.client.ts. After
// this runs, every loadPageJson() call for a known page returns
// synchronously from cache — the only thing the slow path still waits on
// is the per-page font (which the SW caches on first use).
//
// Existing entries are kept as-is. Anything that already ran a per-page
// fetch (e.g. the initial preloaded range) wins — we don't clobber.
export function primePagesCache(rawPages: unknown[]): number {
  if (!Array.isArray(rawPages)) return 0
  let primed = 0
  for (const raw of rawPages) {
    const wire = raw as WirePage
    if (!wire || typeof wire.page !== 'number') continue
    if (pageCache.has(wire.page)) continue
    pageCache.set(wire.page, normalizePage(wire))
    primed++
  }
  return primed
}
