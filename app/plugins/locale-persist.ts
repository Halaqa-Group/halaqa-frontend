import type { Composer } from 'vue-i18n'

export default defineNuxtPlugin(async (nuxtApp) => {
  const i18n = nuxtApp.$i18n as Composer

  const localeCookie = useCookie<'ar' | 'en' | undefined>('i18n_locale', {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    default: () => undefined
  })

  const stored = localeCookie.value
  if (stored && stored !== i18n.locale.value && (stored === 'ar' || stored === 'en')) {
    await i18n.setLocale(stored)
  }

  if (import.meta.client) {
    watch(i18n.locale, (newLocale) => {
      if (newLocale === 'ar' || newLocale === 'en') {
        localeCookie.value = newLocale
      }
    })
  }
})
