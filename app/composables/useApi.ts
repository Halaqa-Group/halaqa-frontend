import type { FetchOptions } from 'ofetch'
import type { Ref } from 'vue'
import type { ApiClient } from '~/types'
import { STORE_READCACHE, idbGet, idbPut, idbEnforceCap } from '~/utils/idb'

// Upper bound on cached GET responses so the read-cache can't grow without
// limit on a device used for months. Oldest-first eviction, checked every few
// writes to keep the common path cheap.
const READCACHE_MAX = 600
let readCacheWrites = 0

const SKIP_REFRESH_FOR = new Set(['/auth/login', '/auth/refresh'])

interface ReadCacheRecord<T> { data: T, cachedAt: number, pinned?: boolean }

// Namespaced per user + active role so a role switch (which re-scopes what the
// backend returns) never serves another view's cached data.
function readCacheKey(url: string, opts: FetchOptions): string | null {
  if (!import.meta.client) return null
  const userId = useState<{ id?: number } | null>('auth_user').value?.id ?? 'anon'
  const role = useState<string | null>('auth_active_role').value ?? '-'
  const query = opts.query ? JSON.stringify(sortedEntries(opts.query as Record<string, unknown>)) : ''
  return `${userId}|${role}|${url}|${query}`
}

function sortedEntries(obj: Record<string, unknown>): [string, unknown][] {
  return Object.entries(obj).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b))
}

// Allowlist of writes that may be queued and replayed when offline. Deliberately
// narrow: only the idempotent batch attendance syncs, whose callers re-pull the
// day afterwards (served from the read-cache offline). Achievements are NOT here
// — their recite save chains several requests on the server-assigned id, which a
// blind queue can't satisfy; they stay online-required.
function writeOutboxKind(url: string, method: string): string | null {
  if (method === 'POST') {
    if (url === '/attendance/students/sync') return 'attendance-students-sync'
    if (url === '/attendance/teachers/sync') return 'attendance-teachers-sync'
    return null
  }
  // Deleting a recitation is idempotent enough to replay (a re-delete 404s,
  // which the flush treats as success), so it's safe to queue offline.
  if (method === 'DELETE' && /^\/achievements\/\d+$/.test(url)) return 'achievement-delete'
  return null
}

async function readFromCache<T>(key: string): Promise<T | undefined> {
  try {
    const rec = await idbGet<ReadCacheRecord<T>>(STORE_READCACHE, key)
    return rec?.data
  } catch {
    return undefined
  }
}

function writeToCache<T>(key: string, data: T, pinned = false): void {
  // Fire-and-forget; a failed write just means no offline copy this time.
  void idbPut(STORE_READCACHE, { data, cachedAt: Date.now(), pinned } satisfies ReadCacheRecord<T>, key).catch(() => {})
  if (++readCacheWrites % 20 === 0) {
    void idbEnforceCap(STORE_READCACHE, READCACHE_MAX, 'cachedAt').catch(() => {})
  }
}

let client: ApiClient | null = null

export function useApi(): ApiClient {
  if (!client) client = createClient()
  return client
}

function createClient(): ApiClient {
  const config = useRuntimeConfig()
  const token = useAuthToken()
  const lastWarnings = ref<string[]>([])

  const network = $fetch.create({
    baseURL: config.public.apiBase as string,
    credentials: 'include',
    onRequest({ options }) {
      const headers = new Headers(options.headers)
      if (token.value) headers.set('Authorization', `Bearer ${token.value}`)
      // The backend negotiates the language of the emails it sends (verification,
      // password reset) from this header — read live so a locale switch applies
      // to the very next request, not just to clients created after it.
      const locale = currentLocale()
      if (locale) headers.set('Accept-Language', locale)
      options.headers = headers
    },
    onResponseError({ request, response }) {
      if (import.meta.client && response.status === 400) {
        console.error('[API 400]', request, response._data ?? response.statusText)
      }
    }
  })

  let refreshPromise: Promise<boolean> | null = null

  async function attemptRefresh(): Promise<boolean> {
    if (refreshPromise) return refreshPromise
    refreshPromise = (async () => {
      try {
        const data = await api<{ accessToken: string }>('/auth/refresh', { method: 'POST' })
        if (!data?.accessToken) return false
        token.value = data.accessToken
        return true
      } catch {
        return false
      } finally {
        queueMicrotask(() => {
          refreshPromise = null
        })
      }
    })()
    return refreshPromise
  }

  // Identical GETs in flight at once (page mount + a burst of reactive watchers
  // firing in the same tick) share a single round-trip instead of racing. Keyed
  // by the same cache key that scopes the read-cache, so it's already per user+role.
  const inFlightGets = new Map<string, Promise<unknown>>()

  async function api<T = unknown>(url: string, opts: FetchOptions = {}): Promise<T> {
    const method = ((opts.method as string) || 'GET').toUpperCase()
    // `pin` (set by warm()) keeps the cached copy out of the eviction cap. Read
    // then strip it so it never reaches the network layer.
    const pin = (opts as { pin?: boolean }).pin === true
    if (pin) delete (opts as { pin?: boolean }).pin
    const cacheKey = method === 'GET' ? readCacheKey(url, opts) : null
    const outboxKind = writeOutboxKind(url, method)

    // Offline write to an allowlisted endpoint → queue it and return optimistically.
    // The caller re-pulls afterwards, which the read-cache serves from disk.
    if (outboxKind && import.meta.client && !navigator.onLine) {
      await useOfflineOutbox().enqueue({ kind: outboxKind, url, method, body: opts.body, label: url })
      return undefined as T
    }

    // Offline GET → serve straight from IndexedDB instead of a doomed network
    // round-trip. Only fall through to the network when there's no cached copy
    // (so a never-cached request still surfaces its real offline error).
    if (cacheKey && import.meta.client && !navigator.onLine) {
      const cached = await readFromCache<T>(cacheKey)
      if (cached !== undefined) return cached
    }

    // Dedup concurrent identical GETs by sharing the in-flight promise. Skipped
    // when the caller passes its own signal: it wants independent cancellation,
    // and one caller aborting a shared promise would break the others.
    if (cacheKey && !opts.signal) {
      const existing = inFlightGets.get(cacheKey)
      if (existing) return existing as Promise<T>
      const pending = execute<T>(url, opts, cacheKey, pin, outboxKind)
      inFlightGets.set(cacheKey, pending)
      try {
        return await pending
      } finally {
        inFlightGets.delete(cacheKey)
      }
    }

    return execute<T>(url, opts, cacheKey, pin, outboxKind)
  }

  async function execute<T>(
    url: string,
    opts: FetchOptions,
    cacheKey: string | null,
    pin: boolean,
    outboxKind: string | null
  ): Promise<T> {
    const method = ((opts.method as string) || 'GET').toUpperCase()
    try {
      const data = unwrap<T>(await network<unknown>(url, opts as Parameters<typeof network>[1]), lastWarnings)
      if (cacheKey) writeToCache(cacheKey, data, pin)
      return data
    } catch (e: unknown) {
      // A superseded/cancelled request must not resolve to stale cache or be
      // queued to the outbox — propagate the abort so the caller can drop it.
      if ((opts.signal as AbortSignal | undefined)?.aborted || isAbortError(e)) throw e

      const status = (e as { response?: { status?: number }, status?: number } | null)?.response?.status
        ?? (e as { status?: number } | null)?.status

      // Network failure (no HTTP status): fall back to a cached read, or queue a
      // queueable write, before treating it as a hard error.
      if (status == null) {
        if (cacheKey) {
          const cached = await readFromCache<T>(cacheKey)
          if (cached !== undefined) return cached
        }
        if (outboxKind && import.meta.client) {
          await useOfflineOutbox().enqueue({ kind: outboxKind, url, method, body: opts.body, label: url })
          return undefined as T
        }
      }

      if (status !== 401 || SKIP_REFRESH_FOR.has(url)) throw e

      const ok = await attemptRefresh()
      if (!ok) {
        const hadToken = !!token.value
        token.value = null
        if (import.meta.client) {
          if (hadToken) {
            const { t } = useI18n()
            useToast().add({
              title: t('auth.sessionExpired'),
              color: 'warning'
            })
          }
          navigateTo('/auth/login')
        }
        throw e
      }
      const retried = unwrap<T>(await network<unknown>(url, opts as Parameters<typeof network>[1]), lastWarnings)
      if (cacheKey) writeToCache(cacheKey, retried, pin)
      return retried
    }
  }

  // Prefetch helper: fetch through the normal path but pin the cached copy so
  // the eviction cap can't drop deliberately-offlined data.
  async function warm<T = unknown>(url: string, opts: FetchOptions = {}): Promise<T> {
    return api<T>(url, { ...opts, pin: true } as FetchOptions)
  }

  return Object.assign(api, { lastWarnings, refresh: attemptRefresh, warm }) as ApiClient
}

/**
 * `useApi()` may be called outside a component setup, so reach for the locale
 * through the Nuxt app rather than `useI18n()`.
 */
function currentLocale(): string | null {
  const i18n = useNuxtApp().$i18n as { locale?: Ref<string> } | undefined
  return i18n?.locale?.value ?? null
}

function unwrap<T>(raw: unknown, lastWarnings: Ref<string[]>): T {
  if (raw && typeof raw === 'object'
    && 'code' in (raw as Record<string, unknown>)
    && 'data' in (raw as Record<string, unknown>)) {
    const env = raw as { data: T, warnings?: string[] }
    lastWarnings.value = Array.isArray(env.warnings) ? env.warnings : []
    return env.data
  }
  lastWarnings.value = []
  return raw as T
}
