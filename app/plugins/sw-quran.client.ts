export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return

  const register = () => {
    navigator.serviceWorker
      .register('/sw-quran.js', { scope: '/' })
      .catch((err) => {
        console.warn('[sw-quran] registration failed:', err)
      })
  }

  if (document.readyState === 'complete') {
    register()
  } else {
    window.addEventListener('load', register, { once: true })
  }
})
