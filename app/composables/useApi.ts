import { tryMock } from '~/mocks'

export function useApi() {
  const config = useRuntimeConfig()
  // useCookie() is a reactive ref — it always holds the latest in-memory value
  // even on the same tick it was written, unlike document.cookie which may lag.
  const token = useCookie<string | null>('auth_token')

  const real = $fetch.create({
    baseURL: config.public.apiBase as string,
    onRequest({ options }) {
      if (token.value) {
        const headers = new Headers(options.headers)
        headers.set('Authorization', `Bearer ${token.value}`)
        options.headers = headers
      }
    },
    onResponseError({ request, response }) {
      if (!import.meta.client) return
      if (response.status === 401) {
        token.value = null
        navigateTo('/auth/login')
        return
      }
      if (response.status === 400) {
        console.error('[API 400]', request, response._data ?? response.statusText)
      }
    }
  })

  // Mock-first wrapper: routes registered in app/mocks/handlers.ts win;
  // anything else falls through to the real $fetch above. Both branches
  // produce the same { code, data } envelope, which we unwrap here so
  // composables consume the inner shape directly.
  return async <T = unknown>(url: string, opts: any = {}): Promise<T> => {
    const result = await tryMock(url, opts)
    const raw = result.matched ? result.data : await real<unknown>(url, opts)
    return unwrap<T>(raw)
  }
}

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'code' in (raw as Record<string, unknown>) && 'data' in (raw as Record<string, unknown>)) {
    return (raw as { data: T }).data
  }
  return raw as T
}
