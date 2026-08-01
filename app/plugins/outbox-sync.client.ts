import { useOnline } from '@vueuse/core'

// Drains the offline write outbox whenever we regain connectivity, on startup,
// or when the service worker nudges us via a Background-Sync 'sync' event.
// UI (toasts/i18n) lives in CommonConnectionStatus — plugins have no setup
// context, so setup-only composables must not be called here.
export default defineNuxtPlugin(() => {
  const { flush } = useOfflineOutbox()
  const { flush: flushDrafts } = useAchievementDrafts()
  const online = useOnline()

  const flushAll = () => {
    void flush()
    void flushDrafts()
  }

  watch(online, (isOnline) => {
    if (isOnline) flushAll()
  })

  // The SW can't authenticate the replay itself (cross-origin Bearer auth), so
  // it just asks an open client to flush.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'FLUSH_OUTBOX') flushAll()
    })
  }

  // Attempt a flush on load in case writes/drafts were left from a prior session.
  if (online.value) flushAll()
})
