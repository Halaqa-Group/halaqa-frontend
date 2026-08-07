// Nuxt renders the SPA loading template as a sibling overlay (#__nuxt-loader,
// position:fixed, on top of the app) and removes it ONLY on `app:suspense:resolve`
// — see nuxt/dist/app/entry.js. When that hook is delayed or never fires, the
// app mounts and runs fine underneath but the overlay never lifts, trapping the
// user on the preloader. This was seen on iOS Safari offline, where the app
// booted (offline worked before the preloader existed) yet the splash stayed up.
//
// Tearing it down on `app:mounted` as well — which fires the moment vueApp.mount()
// returns, independent of Suspense — guarantees the overlay lifts as soon as the
// app is live, restoring the pre-preloader "it just works" behaviour. Removing an
// already-removed node is a no-op, so running on both hooks is safe.
//
// The id mirrors Nuxt's `appSpaLoaderAttrs.id`; it has been '__nuxt-loader' since
// the outside-template mode landed. The optional chaining means a rename just
// makes this a harmless no-op (the watchdog in spa-loading-template.html remains
// the final safety net).
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return

  const removeLoader = () => {
    document.getElementById('__nuxt-loader')?.remove()
  }

  nuxtApp.hook('app:mounted', removeLoader)
  nuxtApp.hook('app:suspense:resolve', removeLoader)
})
