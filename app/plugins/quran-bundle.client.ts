// Warms the in-memory pageCache from /quran/meta/pages-all.json (built by
// scripts/build-quran-assets.mjs). One ~400 KB gzipped fetch replaces up to
// 604 per-page round-trips. Runs at idle time after first paint so it
// doesn't compete with the route boot or with the initial range preload.
//
// Pairs with sw-quran (Phase 2): on first visit the bundle goes through
// the network, then the SW caches it; on subsequent reloads it's served
// from disk in a few ms.
//
// The font corpus is still lazy per-page — 42 MB is too big to bundle.
// Phase 1's 120 ms skeleton delay covers the font wait for warm pages.

import { primePagesCache, warmAllFontBytes } from '~/composables/useMushafPage'

export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return

  function onIdle(fn: () => void) {
    if (typeof requestIdleCallback === 'function') {
      // Hold up to 4s of headroom — we'd rather warm late than steal cycles
      // during a critical first interaction.
      requestIdleCallback(fn, { timeout: 4000 })
    } else {
      // Safari < 18 has no rIC. A fixed delay is a coarse substitute, but
      // 1.5s is past first-paint on every realistic device.
      setTimeout(fn, 1500)
    }
  }

  async function warmUp() {
    try {
      const res = await fetch('/quran/meta/pages-all.json', {
        // Don't tie this to the user's HTTP cache TTL — the SW will keep
        // the cached copy, and bundle content is immutable per build.
        cache: 'default'
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const pages = await res.json() as unknown[]
      const primed = primePagesCache(pages)
      if (import.meta.dev) {
        console.info(`[quran-bundle] primed ${primed}/${Array.isArray(pages) ? pages.length : 0} pages`)
      }
      // Phase 4: now that the JSON corpus is in memory, fire the background
      // font-bytes sweep. It self-paces via requestIdleCallback and skips on
      // metered/slow connections; we don't await it, the user gets value
      // even if they close the tab partway through.
      void warmAllFontBytes()
    } catch (err) {
      // Non-fatal — the existing per-page fetch path still works, just no
      // sync fast-path until the user has actually visited each page.
      console.warn('[quran-bundle] warm-up failed:', err)
    }
  }

  const trigger = () => onIdle(() => { void warmUp() })

  if (document.readyState === 'complete') {
    trigger()
  } else {
    window.addEventListener('load', trigger, { once: true })
  }
})
