/// <reference lib="webworker" />
//
// The service worker cannot replay the outbox itself: the API is cross-origin
// and authenticated with a Bearer header the SW has no access to. So on a
// Background-Sync wake-up it nudges any open client to run its own foreground
// flush (see app/plugins/outbox-sync.client.ts).
//
// When connectivity returns but the app is CLOSED (no open clients), there is no
// page to nudge and the queued writes would sit until the user next opens the
// app. In that case we raise a local notification prompting them to reopen and
// sync. The SW still never syncs in the background — the notification just
// brings the user back to the foreground flush.
//
// Reads a few records straight from IndexedDB (reading local data needs no
// auth): the pending-work counts and the localized notification text the page
// persisted (the SW has no i18n). Store/DB names mirror app/utils/idb.ts.

const DB_NAME = 'halaqa-offline'
const STORE_OUTBOX = 'outbox'
const STORE_DRAFTS = 'achievement-drafts'
const STORE_META = 'meta'
const META_KEY = 'reconnect-notif'
const NOTIFICATION_TAG = 'halaqa-unsynced'

interface OutboxRecord { status?: 'pending' | 'failed' }
interface ReconnectNotifText { key: string, title: string, body: string, lang?: string, dir?: 'ltr' | 'rtl' }

// Arabic fallback (the default locale) for the rare case the page never got to
// persist the localized copy before the app was closed.
const FALLBACK_TEXT: ReconnectNotifText = {
  key: META_KEY,
  title: 'عادت الشبكة',
  body: 'لديك تغييرات غير محفوظة. افتح التطبيق لمزامنتها.',
  lang: 'ar',
  dir: 'rtl'
}

// Open WITHOUT a version so the SW only ever attaches to the DB the page owns —
// it must never trigger an upgrade or create schema. If the page hasn't created
// the DB yet, the missing-store guards below just yield empty reads.
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function getAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(store)) { resolve([]); return }
    const req = db.transaction(store, 'readonly').objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => resolve([])
  })
}

function get<T>(db: IDBDatabase, store: string, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(store)) { resolve(undefined); return }
    const req = db.transaction(store, 'readonly').objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => resolve(undefined)
  })
}

// Work a foreground flush would actually send: pending (non-failed) outbox
// entries + all recitation drafts. Failed entries are excluded — they need a
// manual retry, not an automatic reconnect nudge.
async function readState(): Promise<{ count: number, text: ReconnectNotifText }> {
  let db: IDBDatabase | undefined
  try {
    db = await openDb()
    const [outbox, drafts, text] = await Promise.all([
      getAll<OutboxRecord>(db, STORE_OUTBOX),
      getAll<unknown>(db, STORE_DRAFTS),
      get<ReconnectNotifText>(db, STORE_META, META_KEY)
    ])
    const pending = outbox.filter(e => e?.status !== 'failed').length
    return { count: pending + drafts.length, text: text ?? FALLBACK_TEXT }
  } catch {
    return { count: 0, text: FALLBACK_TEXT }
  } finally {
    db?.close()
  }
}

async function handleOutboxSync(self: ServiceWorkerGlobalScope): Promise<void> {
  const clients = await self.clients.matchAll({ includeUncontrolled: true })
  if (clients.length > 0) {
    // App is open — let the page run the authenticated flush.
    for (const client of clients) client.postMessage({ type: 'FLUSH_OUTBOX' })
    return
  }
  // App is closed. Only bother if the user opted into notifications AND there is
  // actually something queued.
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const { count, text } = await readState()
  if (count === 0) return
  await self.registration.showNotification(text.title, {
    body: text.body,
    tag: NOTIFICATION_TAG, // collapses repeat nudges into one
    icon: '/icons/pwa-192x192.png',
    badge: '/icons/pwa-64x64.png',
    lang: text.lang,
    dir: text.dir ?? 'auto',
    data: { url: '/' }
  })
}

export function registerOutboxSync(self: ServiceWorkerGlobalScope): void {
  self.addEventListener('sync', (event) => {
    // Background Sync's SyncEvent isn't in the standard SW lib types, so `event`
    // widens to a plain Event — cast to the ExtendableEvent shape we rely on.
    const syncEvent = event as ExtendableEvent & { tag?: string }
    if (syncEvent.tag !== 'halaqa-outbox') return
    syncEvent.waitUntil(handleOutboxSync(self))
  })

  // Tapping the reconnect notification returns the user to the app; focus an
  // already-open window if there is one, otherwise open a fresh one. The
  // foreground flush then runs on load (app/plugins/outbox-sync.client.ts).
  self.addEventListener('notificationclick', (event) => {
    if (event.notification.tag !== NOTIFICATION_TAG) return
    event.notification.close()
    event.waitUntil((async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clients) {
        if ('focus' in client) return void client.focus()
      }
      await self.clients.openWindow('/')
    })())
  })
}
