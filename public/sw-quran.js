// halaqa-nuxtjs — Quran asset service worker
//
// Cache-first for /quran/pages/*.json, /quran/fonts/v1/*.woff2, and
// /quran/meta/*.json. These files are immutable per build (already tagged
// `cache-control: immutable` by Nitro routeRules), so we never need to
// revalidate — first fetch wins, every subsequent fetch is a disk read.
//
// Why an SW on top of the HTTP cache: persists across cache eviction
// pressure (HTTP cache is the first thing the browser evicts under disk
// pressure; SW caches are stickier), gives us offline support for free,
// and lets the in-memory caches in useMushafPage stay tiny because the
// SW handles the heavy lifting.
//
// Versioning: bump QURAN_CACHE when the Quran asset corpus changes
// (e.g. after re-running `pnpm build:quran`). Activate cleans up old
// versions so disk usage stays bounded.

// v2: v1 cached the SPA HTML fallback (see isExpectedType below).
const QURAN_CACHE = 'halaqa-quran-v2'

function isQuranAsset(url) {
  if (url.origin !== self.location.origin) return false
  const p = url.pathname
  return p.startsWith('/quran/pages/')
    || p.startsWith('/quran/fonts/')
    || p.startsWith('/quran/meta/')
}

// A missing asset does not 404 here: the host serves the SPA shell — 200,
// `text/html` — for any unmatched path. That response is `ok`, so a plain
// status check caches it forever and the page stays broken long after the
// real files are deployed. Match the content-type against the extension.
function isExpectedType(url, response) {
  const type = (response.headers.get('content-type') || '').toLowerCase()
  if (url.pathname.endsWith('.json')) return type.includes('json')
  if (url.pathname.endsWith('.woff2')) return type.includes('woff2')
  return true
}

self.addEventListener('install', () => {
  // Take over from any previous worker right away — the user just bumped
  // QURAN_CACHE and is waiting for the new corpus to land.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter(k => k.startsWith('halaqa-quran-') && k !== QURAN_CACHE)
        .map(k => caches.delete(k))
    )
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (!isQuranAsset(url)) return

  event.respondWith((async () => {
    const cache = await caches.open(QURAN_CACHE)
    // useMushafPage retries with `cache: 'reload'` when an asset comes back
    // wrong, to get past a poisoned HTTP cache. Honour that here too —
    // answering it from our own cache would defeat the recovery.
    const bypass = req.cache === 'reload' || req.cache === 'no-store'
    const cached = bypass ? undefined : await cache.match(req)
    if (cached) return cached
    const response = await fetch(req)
    // Only cache successful, complete responses of the right kind — partial
    // (206), error, or HTML-fallback responses would poison the cache for the
    // next reload.
    if (response.ok && response.status === 200 && isExpectedType(url, response)) {
      // Clone BEFORE returning — once consumed by the caller the body is
      // gone, so cache.put has to be handed its own copy.
      cache.put(req, response.clone()).catch(() => {
        // QuotaExceeded / storage pressure — degrade silently. The network
        // fetch already succeeded, the user sees content; we just won't
        // get a cache hit next time.
      })
    }
    return response
  })())
})
