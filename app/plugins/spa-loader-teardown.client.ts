// Nuxt renders the SPA loading template as a sibling overlay (#__nuxt-loader,
// position:fixed, on top of the app) and removes it ONLY on `app:suspense:resolve`
// — see nuxt/dist/app/entry.js. That hook was seen not to fire on iOS Safari
// offline: the app mounts and renders underneath, but the overlay never lifts,
// trapping the user on the splash. (Offline worked before the preloader existed,
// which is why the overlay — not the app — is the thing that gets stuck.)
//
// Timing matters here. `<NuxtPage>` is wrapped in <Suspense>, and vueApp.mount()
// returns — firing `app:mounted` — BEFORE that Suspense resolves. Removing the
// overlay on `app:mounted` therefore uncovers the empty Suspense fallback for a
// beat: splash → blank white → content. So:
//
//   • Primary: remove on `app:suspense:resolve` — the moment the initial page's
//     content is actually ready, so the splash hands straight to the UI with no
//     blank frame.
//   • Fallback: `app:mounted` fires reliably at mount, so arm a short delay from
//     there. On a healthy boot `app:suspense:resolve` wins first and this is a
//     no-op (no flash); on the broken iOS path it lifts the overlay to reveal the
//     already-rendered app instead of leaving it stuck. `remove()` is idempotent,
//     so whichever fires first wins and the other is harmless.
//
// The 12s watchdog in spa-loading-template.html remains the last-resort net for
// the case where the app never mounts at all.
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return

  const removeLoader = () => {
    document.getElementById('__nuxt-loader')?.remove()
  }

  nuxtApp.hook('app:suspense:resolve', removeLoader)
  nuxtApp.hook('app:mounted', () => {
    window.setTimeout(removeLoader, 2000)
  })
})
