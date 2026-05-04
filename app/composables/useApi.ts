import type { FetchOptions } from 'ofetch'
import { tryMock } from '~/mocks'
import type { ApiClient } from '~/types'

const SKIP_REFRESH_FOR = new Set(['/auth/login', '/auth/refresh'])

let client: ApiClient | null = null

export function useApi(): ApiClient {
  if (!client) client = createClient()
  return client
}

function createClient(): ApiClient {
  const config = useRuntimeConfig()
  const token = useCookie<string | null>('auth_token')

  // The single network terminus. Lives in this closure only — no other
  // module can reach it, so there is exactly one path to issue a request:
  // the `api` function returned at the bottom.
  const network = $fetch.create({
    baseURL: config.public.apiBase as string,
    credentials: 'include',
    onRequest({ options }) {
      if (token.value) {
        const headers = new Headers(options.headers)
        headers.set('Authorization', `Bearer ${token.value}`)
        options.headers = headers
      }
    },
    onResponseError({ request, response }) {
      if (import.meta.client && response.status === 400) {
        console.error('[API 400]', request, response._data ?? response.statusText)
      }
    }
  })

  // Single-flight: every concurrent 401 awaits the same refresh promise so we
  // never burn the rotating refresh token on parallel requests.
  let refreshPromise: Promise<boolean> | null = null

  async function attemptRefresh(): Promise<boolean> {
    if (refreshPromise) return refreshPromise
    refreshPromise = (async () => {
      try {
        // Recurse through the public callable so refresh gets the same
        // mock fallback, envelope unwrap, and logging as everything else.
        // SKIP_REFRESH_FOR prevents an infinite loop if /auth/refresh itself 401s.
        const data = await api<{ accessToken: string }>('/auth/refresh', { method: 'POST' })
        if (!data?.accessToken) return false
        token.value = data.accessToken
        return true
      } catch {
        return false
      } finally {
        queueMicrotask(() => { refreshPromise = null })
      }
    })()
    return refreshPromise
  }

  async function api<T = unknown>(url: string, opts: FetchOptions = {}): Promise<T> {
    const mocked = await tryMock(url, opts)
    if (mocked.matched) return unwrap<T>(mocked.data)

    try {
      return unwrap<T>(await network<unknown>(url, opts as Parameters<typeof network>[1]))
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number }, status?: number } | null)?.response?.status
        ?? (e as { status?: number } | null)?.status
      if (status !== 401 || SKIP_REFRESH_FOR.has(url)) throw e

      const ok = await attemptRefresh()
      if (!ok) {
        token.value = null
        if (import.meta.client) navigateTo('/auth/login')
        throw e
      }
      // onRequest reads token reactively, so the retry sends the new access token.
      return unwrap<T>(await network<unknown>(url, opts as Parameters<typeof network>[1]))
    }
  }

  return api
}

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === 'object'
    && 'code' in (raw as Record<string, unknown>)
    && 'data' in (raw as Record<string, unknown>)) {
    return (raw as { data: T }).data
  }
  return raw as T
}
