// Registers public/sw-quran.js — a tiny cache-first service worker that
// persists the Quran corpus across reloads. See sw-quran.js for rationale.
//
// We register after `load` so the SW install doesn't compete with route boot
// or first-paint work. The cache-control immutable headers on Quran assets
// already give us fast subsequent fetches; the SW adds cross-session
// stickiness (HTTP cache is the first thing evicted under disk pressure)
// and offline support.

export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return

  const register = () => {
    navigator.serviceWorker
      .register('/sw-quran.js', { scope: '/' })
      .catch((err) => {
        // Registration failures are non-fatal — the app still works, just
        // without the persistent cache. Surface in the console for debugging
        // but don't toast/alert the user.
        console.warn('[sw-quran] registration failed:', err)
      })
  }

  if (document.readyState === 'complete') {
    register()
  } else {
    window.addEventListener('load', register, { once: true })
  }
})
