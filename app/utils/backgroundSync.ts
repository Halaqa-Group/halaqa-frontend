// Ask the browser to wake the service worker via one-off Background Sync when
// connectivity returns, so a CLOSED app still gets its outbox flushed / the user
// notified about unsynced changes (app/service-worker/outbox-sync.ts).
//
// No-op where Background Sync is unsupported (iOS/Safari, Firefox) — there the
// online watcher and on-load flush (app/plugins/outbox-sync.client.ts) handle
// sync the next time the app is opened.
export const OUTBOX_SYNC_TAG = 'halaqa-outbox'

export async function requestBackgroundSync(): Promise<void> {
  if (!import.meta.client) return
  try {
    const reg = await navigator.serviceWorker?.ready
    await (reg as unknown as { sync?: { register: (t: string) => Promise<void> } })
      ?.sync?.register(OUTBOX_SYNC_TAG)
  } catch {
    // Unsupported, or registration blocked — safe to ignore.
  }
}
