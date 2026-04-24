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
    onResponseError({ response }) {
      if (response.status === 401 && import.meta.client) {
        token.value = null
        navigateTo('/login')
      }
    }
  })
}
