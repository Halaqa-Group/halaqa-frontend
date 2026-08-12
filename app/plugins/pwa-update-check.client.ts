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
      // Only re-check on a genuine return to the app (backgrounded → foreground)
      // and on a slow timer. Deliberately NOT on initial load / window focus: a
      // check right after a reload can re-detect a (wrongly) "new" SW and feed an
      // update loop if the deployment serves an inconsistent sw.js.
      document.addEventListener('visibilitychange', check)
      // Regaining connectivity is the other moment a check can newly succeed: an
      // app opened offline has no way to see a deploy until it is back online.
      window.addEventListener('online', check)
      setInterval(check, 30 * 60 * 1000)
    })
    .catch(() => {})
})
