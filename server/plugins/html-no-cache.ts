// The SPA shell must never be held by an HTTP cache.
//
// Nitro serves the hashed `/_nuxt/*` bundles `immutable` (correct — their names
// change every build) but sends the HTML document with NO cache-control at all.
// A bare 200 with no directives is up to the browser/CDN heuristics, and once a
// proxy or an iOS PWA decides to hold it, the app keeps booting the previous
// deploy's chunk URLs — the state that could only be escaped by clearing site
// data. `no-cache` still allows a cached copy, it just forces revalidation, so
// the cost is one conditional GET (304, ~0 bytes) per cold start.
//
// Applied to documents only, by content-type, so it covers `/` and every SPA
// fallback route (/students, /halaqat/…) without touching asset headers.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response) => {
    const type = String(response.headers?.['content-type'] ?? '')
    if (!type.includes('text/html')) return
    response.headers = {
      ...response.headers,
      'cache-control': 'no-cache'
    }
  })
})
