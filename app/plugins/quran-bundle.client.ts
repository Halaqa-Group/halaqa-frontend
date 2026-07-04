import { primePagesCache, warmAllFontBytes } from '~/composables/useMushafPage'

export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return

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

  const trigger = () => onIdle(() => { void warmUp() })

  if (document.readyState === 'complete') {
    trigger()
  } else {
    window.addEventListener('load', trigger, { once: true })
  }
})
