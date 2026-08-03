// Force service-worker update checks so new app code is detected promptly —
// especially on iOS, where a standalone PWA almost never checks for a new worker
// on its own (it mostly checks on a cold start). When update() finds a new SW,
// @vite-pwa flips `$pwa.needRefresh`, which CommonPwaPrompt surfaces as the
// "reload to update" toast. Harmless on Android (which already checks itself).
//
// NOTE: this only refreshes CODE (the service worker + precached assets). The web
// app manifest and apple-* meta tags (theme colour / status bar, icons, name) are
// frozen by iOS at "Add to Home Screen" time and can ONLY change by removing and
// re-adding the app — there is no web API to update them.
export default defineNuxtPlugin(() => {
  if (!import.meta.client || !('serviceWorker' in navigator)) return

  let registration: ServiceWorkerRegistration | null = null

  const check = () => {
    if (document.hidden) return
    registration?.update().catch(() => {})
  }

  navigator.serviceWorker.ready
    .then((reg) => {
      registration = reg
      // The big win on iOS: re-check every time the app comes back to the
      // foreground (the "reopen from the home screen" case).
      document.addEventListener('visibilitychange', check)
      window.addEventListener('focus', check)
      // And periodically while it stays open.
      setInterval(check, 30 * 60 * 1000)
      check()
    })
    .catch(() => {})
})
