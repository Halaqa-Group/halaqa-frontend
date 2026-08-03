<script setup lang="ts">
// Surfaces the two PWA lifecycle events from @vite-pwa/nuxt ($pwa) as toasts:
//   • offlineReady — first install finished; the app now works offline
//   • needRefresh  — a new build is waiting; offer a reload (registerType:'prompt')
// Renders nothing itself.
const { $pwa } = useNuxtApp()
const { t } = useI18n()
const toast = useToast()

// Loop breaker. A misconfigured deployment (e.g. main served from more than one
// build behind a CDN / multiple instances) makes every `sw.js` fetch look "new",
// so the update prompt reappears immediately after each reload — an infinite
// loop, especially on iOS. Guard it two ways:
//  • updateToastShown — never stack more than one prompt per page load
//  • sessionStorage flag — once the user applies an update this session, don't
//    re-prompt (survives the reload; cleared when the app is fully reopened)
const UPDATE_APPLIED_KEY = 'pwa:update-applied'
let updateToastShown = false

function updateAlreadyApplied(): boolean {
  try {
    return sessionStorage.getItem(UPDATE_APPLIED_KEY) === '1'
  } catch {
    return false
  }
}

watch(
  () => $pwa?.offlineReady,
  (ready) => {
    if (!ready) return
    toast.add({
      title: t('pwa.offlineReady'),
      icon: 'i-lucide-wifi-off',
      color: 'success'
    })
    $pwa?.cancelPrompt()
  }
)

watch(
  () => $pwa?.needRefresh,
  (needs) => {
    if (!needs || updateToastShown || updateAlreadyApplied()) return
    updateToastShown = true
    toast.add({
      title: t('pwa.updateAvailable'),
      icon: 'i-lucide-refresh-cw',
      color: 'primary',
      duration: 0,
      // Place the reload button beside the title, not under it.
      orientation: 'horizontal',
      actions: [
        {
          label: t('pwa.reload'),
          onClick: () => {
            // Mark BEFORE reloading so the re-mounted prompt won't re-fire if the
            // SW still (wrongly) reports an update after the reload.
            try {
              sessionStorage.setItem(UPDATE_APPLIED_KEY, '1')
            } catch {
              // sessionStorage unavailable — the toast guard still limits stacking.
            }
            $pwa?.updateServiceWorker(true)
          }
        }
      ]
    })
  }
)
</script>

<template>
  <span class="hidden" aria-hidden="true" />
</template>
