import { STORE_OUTBOX, idbGetAll, idbPut, idbDelete } from '~/utils/idb'

// A durable, ordered queue of write requests made while offline (or that failed
// on the network), replayed foreground when connectivity returns.
//
// Why foreground and not SW Background Sync: the API is cross-origin and
// authenticates via a Bearer header derived from a JS-readable cookie that is
// NOT sent cross-site — a service worker has no way to attach it. The page does,
// so the page replays.

export interface OutboxEntry {
  id: string
  /** Coarse type used for optimistic-UI reconciliation, e.g. 'attendance-teachers-sync'. */
  kind: string
  label?: string
  url: string
  method: string
  body?: unknown
  createdAt: number
  retries: number
  /** 'failed' entries are kept (not deleted) so the sync log can show + retry them. */
  status?: 'pending' | 'failed'
  error?: string
}

const entries = ref<OutboxEntry[]>([])
const flushedAt = ref(0)
let flushing = false
let refreshed = false

async function refresh() {
  if (!import.meta.client) return
  try {
    const list = await idbGetAll<OutboxEntry>(STORE_OUTBOX)
    entries.value = list.sort((a, b) => a.createdAt - b.createdAt)
  } catch {
    entries.value = []
  }
}

export function useOfflineOutbox() {
  const pending = computed(() => entries.value.filter(e => e.status !== 'failed'))
  const failed = computed(() => entries.value.filter(e => e.status === 'failed'))
  const pendingCount = computed(() => pending.value.length)

  // Lazily hydrate the reactive list from IndexedDB on first use.
  if (import.meta.client && !refreshed) {
    refreshed = true
    void refresh()
  }

  async function enqueue(input: Omit<OutboxEntry, 'id' | 'createdAt' | 'retries'>): Promise<OutboxEntry> {
    const entry: OutboxEntry = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      retries: 0,
      status: 'pending'
    }
    await idbPut(STORE_OUTBOX, entry)
    await refresh()
    // Best-effort Background-Sync registration so a closed tab still gets nudged.
    try {
      const reg = await navigator.serviceWorker?.ready
      await (reg as unknown as { sync?: { register: (t: string) => Promise<void> } })?.sync?.register('halaqa-outbox')
    } catch {
      // Background Sync unsupported — the online watcher will flush instead.
    }
    return entry
  }

  async function flush(): Promise<void> {
    if (flushing || !import.meta.client || !navigator.onLine) return
    flushing = true
    const token = useAuthToken()
    const config = useRuntimeConfig()
    let changed = 0
    try {
      await refresh()
      // Only replay pending entries in submission order; failed ones wait for an
      // explicit retry.
      for (const entry of entries.value.filter(e => e.status !== 'failed')) {
        try {
          await $fetch(entry.url, {
            baseURL: config.public.apiBase as string,
            method: entry.method as 'POST',
            body: entry.body as Record<string, unknown>,
            credentials: 'include',
            headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined
          })
          await idbDelete(STORE_OUTBOX, entry.id)
          changed++
        } catch (e: unknown) {
          const status = (e as { response?: { status?: number } })?.response?.status
          // A delete that's already gone server-side is a success, not a failure.
          if (entry.kind === 'achievement-delete' && (status === 404 || status === 410)) {
            await idbDelete(STORE_OUTBOX, entry.id)
            changed++
            continue
          }
          if (status && status >= 400 && status < 500 && status !== 401) {
            // Permanent business rejection — keep it, flagged, so the log can show
            // and let the user retry or discard it.
            const message = (e as { data?: { message?: string }, message?: string })?.data?.message
              ?? (e as { message?: string })?.message ?? `HTTP ${status}`
            await idbPut(STORE_OUTBOX, { ...entry, status: 'failed', error: message })
            changed++
          } else {
            // Network / 401 / 5xx — keep it pending and stop; retry on next flush.
            break
          }
        }
      }
      await refresh()
      // Only signal listeners when the flush actually did something, so an empty
      // startup flush doesn't fire a spurious "synced" toast.
      if (changed > 0) flushedAt.value = Date.now()
    } finally {
      flushing = false
    }
  }

  // Move a failed entry back to pending and try again.
  async function retry(id: string) {
    const entry = entries.value.find(e => e.id === id)
    if (!entry) return
    await idbPut(STORE_OUTBOX, { ...entry, status: 'pending', error: undefined, retries: entry.retries + 1 })
    await refresh()
    void flush()
  }

  async function discard(id: string) {
    await idbDelete(STORE_OUTBOX, id)
    await refresh()
  }

  return { entries, pending, failed, pendingCount, flushedAt, enqueue, flush, refresh, retry, discard }
}
