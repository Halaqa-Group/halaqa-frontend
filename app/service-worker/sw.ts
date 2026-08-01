/// <reference lib="webworker" />
//
// Halaqa service worker (injectManifest / Workbox).
//
// Replaces the old hand-written public/sw-quran.js as the single root-scoped
// worker. Responsibilities:
//   • precache the built app shell (JS/CSS/fonts/icons) so the app loads offline
//   • serve document navigations network-first with an offline shell fallback
//   • cache-first the immutable Quran page/font assets (ported from sw-quran.js,
//     content-type guarded against the SPA-HTML fallback, honouring cache:reload)
//   • bulk-download the whole Mushaf on demand, reporting progress to the page
//   • cache remote DiceBear avatars so rosters survive offline
//   • replay the offline write outbox via Background Sync (see registerOutboxSync)
//
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { registerOutboxSync } from './outbox-sync'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string, revision: string | null }>
}

// Reused from the old worker so existing users keep their already-cached Quran
// assets across the migration — bump only when the Quran corpus itself changes.
const QURAN_CACHE = 'halaqa-quran-v2'
const SHELL_CACHE = 'halaqa-shell-v1'
const AVATAR_CACHE = 'halaqa-avatars-v1'
const SHELL_URL = '/'

// ─── Precache the built app shell ────────────────────────────────────────────
// __WB_MANIFEST is injected at build time with the hashed JS/CSS/font/icon
// assets (the 46MB /quran corpus is excluded via globIgnores in nuxt.config).
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ─── Quran assets: cache-first, immutable ────────────────────────────────────
function isQuranAsset(url: URL): boolean {
  if (url.origin !== self.location.origin) return false
  const p = url.pathname
  return p.startsWith('/quran/pages/')
    || p.startsWith('/quran/fonts/')
    || p.startsWith('/quran/meta/')
}

// A missing asset does not 404 here — the host serves the SPA shell (200,
// text/html) for any unmatched path. That response is `ok`, so a plain status
// check would cache HTML forever under an asset URL and the page stays broken
// long after the real files ship. Match content-type against the extension.
function isExpectedType(url: URL, response: Response): boolean {
  const type = (response.headers.get('content-type') || '').toLowerCase()
  if (url.pathname.endsWith('.json')) return type.includes('json')
  if (url.pathname.endsWith('.woff2')) return type.includes('woff2')
  return true
}

async function cacheQuranAsset(cache: Cache, request: Request, url: URL, response: Response) {
  // Only cache successful, complete responses of the right kind — partial (206),
  // error, or HTML-fallback responses would poison the cache for the next load.
  if (response.ok && response.status === 200 && isExpectedType(url, response)) {
    // Clone BEFORE the body is consumed by the caller.
    await cache.put(request, response.clone()).catch(() => {
      // QuotaExceeded / storage pressure — degrade silently. The fetch already
      // succeeded; we just won't get a cache hit next time.
    })
  }
}

registerRoute(
  ({ url }) => isQuranAsset(url),
  async ({ request }) => {
    const url = new URL(request.url)
    const cache = await caches.open(QURAN_CACHE)
    // useMushafPage retries with `cache: 'reload'` to get past a poisoned HTTP
    // cache — answering from our cache would defeat that recovery.
    const bypass = request.cache === 'reload' || request.cache === 'no-store'
    const cached = bypass ? undefined : await cache.match(request)
    if (cached) return cached
    const response = await fetch(request)
    await cacheQuranAsset(cache, request, url, response)
    return response
  }
)

// ─── DiceBear avatars: cache-first (small immutable SVGs) ─────────────────────
registerRoute(
  ({ url }) => url.origin === 'https://api.dicebear.com',
  new CacheFirst({
    cacheName: AVATAR_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true })
    ]
  })
)

// ─── Document navigations: network-first, offline shell fallback ─────────────
// Keeps online users on the freshest HTML while guaranteeing the SPA shell is
// available offline. /api and /quran are never navigations, so they don't hit
// this route.
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event }) => {
    const cache = await caches.open(SHELL_CACHE)
    try {
      const response = await fetch((event as FetchEvent).request)
      if (response.ok) cache.put(SHELL_URL, response.clone()).catch(() => {})
      return response
    } catch {
      const shell = await cache.match(SHELL_URL)
      if (shell) return shell
      return Response.error()
    }
  }
)

// ─── Lifecycle ───────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  // Prime the offline shell so a first-load-offline still renders.
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE)
    try {
      await cache.add(new Request(SHELL_URL, { cache: 'reload' }))
    } catch {
      // Offline at install time — the navigation route will backfill it later.
    }
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// registerType: 'prompt' — the page asks the waiting worker to take over when
// the user accepts the update (vite-pwa useRegisterSW posts this).
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// ─── Bulk Mushaf download (Phase 1) ──────────────────────────────────────────
// Driven from the page via postMessage; streams progress back so the UI can
// show a bar and support cancellation.
const TOTAL_PAGES = 604
let downloadCancelled = false

async function postToClients(message: unknown) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true })
  for (const client of clients) client.postMessage(message)
}

async function downloadFullMushaf() {
  downloadCancelled = false
  const cache = await caches.open(QURAN_CACHE)
  let done = 0
  const failed: number[] = []

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    if (downloadCancelled) {
      await postToClients({ type: 'MUSHAF_DOWNLOAD_CANCELLED', done, total: TOTAL_PAGES })
      return
    }
    const targets = [
      { url: `/quran/pages/${page}.json`, expect: 'json' as const },
      { url: `/quran/fonts/v1/p${page}.woff2`, expect: 'woff2' as const }
    ]
    for (const { url, expect } of targets) {
      try {
        const req = new Request(url)
        const already = await cache.match(req)
        if (already) continue
        const res = await fetch(req)
        const u = new URL(url, self.location.origin)
        if (res.ok && res.status === 200 && isExpectedType(u, res)) {
          await cache.put(req, res.clone())
        } else {
          failed.push(page)
        }
      } catch {
        failed.push(page)
      }
    }
    done++
    // Report every few pages to avoid flooding the message channel.
    if (done % 4 === 0 || done === TOTAL_PAGES) {
      await postToClients({ type: 'MUSHAF_DOWNLOAD_PROGRESS', done, total: TOTAL_PAGES })
    }
  }
  await postToClients({
    type: 'MUSHAF_DOWNLOAD_COMPLETE',
    done,
    total: TOTAL_PAGES,
    failed: [...new Set(failed)]
  })
}

self.addEventListener('message', (event) => {
  const type = event.data?.type
  if (type === 'MUSHAF_DOWNLOAD_START') {
    event.waitUntil(downloadFullMushaf())
  } else if (type === 'MUSHAF_DOWNLOAD_CANCEL') {
    downloadCancelled = true
  }
})

// ─── Offline write outbox replay (Phase 4) ───────────────────────────────────
registerOutboxSync(self)
