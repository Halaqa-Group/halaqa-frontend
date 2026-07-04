import { primePagesCache, warmAllFontBytes } from '~/composables/useMushafPage'

// Only these routes render the mushaf (recite + dev tools). The corpus is
// ~42MB of page fonts + a 1.5MB page-index JSON, so we only pre-warm it once
// the user is actually on a mushaf route — a dashboard/attendance user who
// never opens the mushaf pays nothing.
const MUSHAF_ROUTE_RE = /^\/(recite|dev\/(mushaf|range|recite))(\/|$)/

export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return

  let warmed = false

  function onIdle(fn: () => void) {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(fn, { timeout: 4000 })
    } else {
      setTimeout(fn, 1500)
    }
  }

  async function warmUp() {
    try {
      const res = await fetch('/quran/meta/pages-all.json', {
        cache: 'default'
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const pages = await res.json() as unknown[]
      const primed = primePagesCache(pages)
      if (import.meta.dev) {
        console.info(`[quran-bundle] primed ${primed}/${Array.isArray(pages) ? pages.length : 0} pages`)
      }
      void warmAllFontBytes()
    } catch (err) {
      console.warn('[quran-bundle] warm-up failed:', err)
    }
  }

  // Kick the (idempotent) warm-up at most once, only for mushaf routes.
  function maybeWarm(path: string) {
    if (warmed || !MUSHAF_ROUTE_RE.test(path)) return
    warmed = true
    const trigger = () => onIdle(() => { void warmUp() })
    if (document.readyState === 'complete') {
      trigger()
    } else {
      window.addEventListener('load', trigger, { once: true })
    }
  }

  const router = useRouter()
  // Hard-load directly into a mushaf route.
  maybeWarm(router.currentRoute.value.path)
  // First client-side navigation into a mushaf route.
  router.afterEach(to => maybeWarm(to.path))
})
