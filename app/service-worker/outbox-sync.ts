/// <reference lib="webworker" />
//
// The service worker cannot replay the outbox itself: the API is cross-origin
// and authenticated with a Bearer header the SW has no access to. So on a
// Background-Sync wake-up it simply nudges any open client to run its own
// foreground flush (see app/plugins/outbox-sync.client.ts).
//
export function registerOutboxSync(self: ServiceWorkerGlobalScope): void {
  self.addEventListener('sync', (event) => {
    const syncEvent = event as ExtendableEvent & { tag?: string }
    if (syncEvent.tag !== 'halaqa-outbox') return
    event.waitUntil((async () => {
      const clients = await self.clients.matchAll({ includeUncontrolled: true })
      for (const client of clients) client.postMessage({ type: 'FLUSH_OUTBOX' })
    })())
  })
}
