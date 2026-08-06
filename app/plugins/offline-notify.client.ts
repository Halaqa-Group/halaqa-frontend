import { STORE_META, idbPut } from '~/utils/idb'

// Persists the localized reconnect-notification text to IndexedDB so the service
// worker can show it while the app is closed — the SW has no i18n access, so it
// reads this record instead (app/service-worker/outbox-sync.ts). Re-written
// whenever the user switches locale.
//
// This only stores the copy; it never requests notification permission. That is
// an explicit opt-in from the sync panel (CommonOfflineSyncPanel), so we don't
// prompt users who never asked for it.
export default defineNuxtPlugin((nuxtApp) => {
  const i18n = nuxtApp.$i18n as {
    t: (key: string) => string
    locale: { value: string }
  }

  const persist = () => {
    const locale = i18n.locale.value
    void idbPut(STORE_META, {
      key: 'reconnect-notif',
      title: i18n.t('pwa.notifyReconnectTitle'),
      body: i18n.t('pwa.notifyReconnectBody'),
      lang: locale,
      dir: locale === 'ar' ? 'rtl' : 'ltr'
    })
  }

  persist()
  watch(() => i18n.locale.value, persist)
})
