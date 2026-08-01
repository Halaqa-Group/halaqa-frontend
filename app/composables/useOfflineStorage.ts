import { STORE_READCACHE, idbClear } from '~/utils/idb'

// Reports how much the app has cached and frees it on demand. Used by the
// Mushaf download card so users can see and manage their offline footprint.

function formatBytes(n: number): string {
  if (!n) return '0 MB'
  const mb = n / (1024 * 1024)
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
}

export function useOfflineStorage() {
  const usageBytes = ref(0)
  const quotaBytes = ref(0)
  const supported = import.meta.client && !!navigator.storage?.estimate

  const usageLabel = computed(() => formatBytes(usageBytes.value))
  const quotaLabel = computed(() => formatBytes(quotaBytes.value))
  const percent = computed(() =>
    quotaBytes.value ? Math.min(100, Math.round((usageBytes.value / quotaBytes.value) * 100)) : 0
  )

  async function refresh() {
    if (!supported) return
    try {
      const est = await navigator.storage.estimate()
      usageBytes.value = est.usage ?? 0
      quotaBytes.value = est.quota ?? 0
    } catch {
      // Estimation unavailable — leave the last known values.
    }
  }

  // Frees space by dropping the downloaded Mushaf, cached avatars, and the
  // browse read-cache. Pending writes (outbox + achievement drafts) are left
  // intact so nothing unsynced is lost.
  async function clearOfflineCaches() {
    if (!import.meta.client) return
    try {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter(k => k.startsWith('halaqa-quran-') || k.startsWith('halaqa-avatars-'))
          .map(k => caches.delete(k))
      )
      await idbClear(STORE_READCACHE)
    } catch {
      // Best-effort.
    }
    await refresh()
  }

  return { usageBytes, quotaBytes, usageLabel, quotaLabel, percent, supported, refresh, clearOfflineCaches }
}
