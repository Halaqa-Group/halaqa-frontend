function readTokenFromCookie(): string | null {
  if (!import.meta.client) return null
  const match = document.cookie.match(/(?:^|;\s*)auth_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function useApi() {
  const config = useRuntimeConfig()

  return $fetch.create({
    baseURL: config.public.apiBase as string,
    onRequest({ options }) {
      const token = readTokenFromCookie()
      if (token) {
        const headers = (options.headers ||= {}) as Record<string, string>
        headers['Authorization'] = `Bearer ${token}`
      }
    },
    onResponseError({ response }) {
      if (response.status === 401 && import.meta.client) {
        useCookie('auth_token').value = null
        navigateTo('/login')
      }
    }
  })
}
