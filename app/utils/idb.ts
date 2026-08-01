// Minimal promise wrapper over IndexedDB, shared by the offline read-cache
// (Phase 3) and the write outbox (Phase 4). Kept dependency-free and tiny; if
// this grows, swap in the `idb` package behind the same surface.

const DB_NAME = 'halaqa-offline'
const DB_VERSION = 2
export const STORE_READCACHE = 'read-cache'
export const STORE_OUTBOX = 'outbox'
// Offline recitation drafts, keyed by session so autosync ticks overwrite one
// draft instead of stacking duplicate creates (POST /achievements is not
// idempotent server-side).
export const STORE_DRAFTS = 'achievement-drafts'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_READCACHE)) db.createObjectStore(STORE_READCACHE)
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) db.createObjectStore(STORE_OUTBOX, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) db.createObjectStore(STORE_DRAFTS, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(db => new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(store, mode)
    const request = fn(transaction.objectStore(store))
    request.onsuccess = () => resolve(request.result as T)
    request.onerror = () => reject(request.error)
  }))
}

export const idbGet = <T>(store: string, key: IDBValidKey) =>
  run<T | undefined>(store, 'readonly', s => s.get(key))

export const idbGetAll = <T>(store: string) =>
  run<T[]>(store, 'readonly', s => s.getAll())

export const idbPut = (store: string, value: unknown, key?: IDBValidKey) =>
  run<IDBValidKey>(store, 'readwrite', s => (key !== undefined ? s.put(value, key) : s.put(value)))

export const idbDelete = (store: string, key: IDBValidKey) =>
  run<undefined>(store, 'readwrite', s => s.delete(key))

export const idbClear = (store: string) =>
  run<undefined>(store, 'readwrite', s => s.clear())

// Keep a store from growing without bound: when it holds more than `max`
// records, delete the oldest by `tsField`. Cheap under the cap (just a count());
// only scans when eviction is actually needed. Records flagged `pinned` (e.g.
// data deliberately prefetched for offline) are never eviction candidates.
export function idbEnforceCap(store: string, max: number, tsField: string): Promise<void> {
  return openDb().then(db => new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const os = tx.objectStore(store)
    const countReq = os.count()
    countReq.onsuccess = () => {
      const overflow = countReq.result - max
      if (overflow <= 0) return
      const entries: { key: IDBValidKey, ts: number }[] = []
      const cursorReq = os.openCursor()
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (cursor) {
          const value = cursor.value as Record<string, unknown>
          if (!value?.pinned) {
            entries.push({ key: cursor.primaryKey, ts: Number(value?.[tsField]) || 0 })
          }
          cursor.continue()
        } else {
          entries.sort((a, b) => a.ts - b.ts)
          const toDelete = Math.min(overflow, entries.length)
          for (let i = 0; i < toDelete; i++) os.delete(entries[i]!.key)
        }
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }))
}
