export function useApi() {
  const config = useRuntimeConfig()
  // useCookie() is a reactive ref — it always holds the latest in-memory value
  // even on the same tick it was written, unlike document.cookie which may lag.
  const token = useCookie<string | null>('auth_token')

  return $fetch.create({
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
        navigateTo('/login')
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
}
