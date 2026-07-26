import type { FetchOptions } from 'ofetch'
import type { Ref } from 'vue'
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

  async function api<T = unknown>(url: string, opts: FetchOptions = {}): Promise<T> {
    try {
      return unwrap<T>(await network<unknown>(url, opts as Parameters<typeof network>[1]), lastWarnings)
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number }, status?: number } | null)?.response?.status
        ?? (e as { status?: number } | null)?.status
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
      return unwrap<T>(await network<unknown>(url, opts as Parameters<typeof network>[1]), lastWarnings)
    }
  }

  return Object.assign(api, { lastWarnings }) as ApiClient
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
