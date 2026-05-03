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
      if (response.status === 401 && import.meta.client) {
        token.value = null
        navigateTo('/auth/login')
      }
      // Log 400 errors for debugging
      if (response.status === 400 && import.meta.client) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error('🚨 API 400 Bad Request Error')
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error('URL:', request)
        console.error('Status:', response.status)
        console.error('Message:', response._data?.message || response.statusText)
        console.error('Error Details:', JSON.stringify(response._data, null, 2))
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      }
    }
  })

  // Mock-first wrapper: routes registered in app/mocks/handlers.ts win;
  // anything else falls through to the real $fetch above.
  return async <T = unknown>(url: string, opts: any = {}): Promise<T> => {
    const result = await tryMock(url, opts)
    if (result.matched) return result.data as T
    return real<T>(url, opts)
  }
}
