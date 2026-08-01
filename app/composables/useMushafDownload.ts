// Drives the service worker's bulk Mushaf downloader (see app/service-worker/sw.ts).
// The SW does the fetching + caching so the download survives navigation and the
// page just relays start/cancel and renders progress.

export type MushafDownloadState = 'idle' | 'downloading' | 'complete' | 'partial' | 'cancelled' | 'unsupported'

interface SwProgressMessage {
  type: 'MUSHAF_DOWNLOAD_PROGRESS' | 'MUSHAF_DOWNLOAD_COMPLETE' | 'MUSHAF_DOWNLOAD_CANCELLED'
  done: number
  total: number
  failed?: number[]
}

const state = ref<MushafDownloadState>('idle')
const done = ref(0)
const total = ref(604)
const failedCount = ref(0)
let listenerBound = false

export function useMushafDownload() {
  const supported = import.meta.client && 'serviceWorker' in navigator

  const progress = computed(() => (total.value ? Math.round((done.value / total.value) * 100) : 0))
  const isDownloading = computed(() => state.value === 'downloading')

  function bindListener() {
    if (listenerBound || !supported) return
    listenerBound = true
    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data as SwProgressMessage | undefined
      if (!data?.type?.startsWith('MUSHAF_DOWNLOAD')) return
      done.value = data.done
      total.value = data.total
      if (data.type === 'MUSHAF_DOWNLOAD_PROGRESS') {
        state.value = 'downloading'
      } else if (data.type === 'MUSHAF_DOWNLOAD_CANCELLED') {
        state.value = 'cancelled'
      } else if (data.type === 'MUSHAF_DOWNLOAD_COMPLETE') {
        failedCount.value = data.failed?.length ?? 0
        state.value = failedCount.value > 0 ? 'partial' : 'complete'
      }
    })
  }

  async function start() {
    if (!supported) {
      state.value = 'unsupported'
      return
    }
    bindListener()
    // Ask the browser to keep the cache from being evicted under storage pressure.
    try {
      if (navigator.storage?.persist) await navigator.storage.persist()
    } catch {
      // Non-fatal — the download still works, just more evictable.
    }
    state.value = 'downloading'
    done.value = 0
    failedCount.value = 0
    const reg = await navigator.serviceWorker.ready
    reg.active?.postMessage({ type: 'MUSHAF_DOWNLOAD_START' })
  }

  async function cancel() {
    if (!supported) return
    const reg = await navigator.serviceWorker.ready
    reg.active?.postMessage({ type: 'MUSHAF_DOWNLOAD_CANCEL' })
  }

  return { state, done, total, failedCount, progress, isDownloading, supported, start, cancel }
}
