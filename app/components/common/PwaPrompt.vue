<script setup lang="ts">
// Surfaces the two PWA lifecycle events from @vite-pwa/nuxt ($pwa) as toasts:
//   • offlineReady — first install finished; the app now works offline
//   • needRefresh  — a new build is waiting; offer a reload (registerType:'prompt')
// Renders nothing itself.
const { $pwa } = useNuxtApp()
const { t } = useI18n()
const toast = useToast()

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
    if (!needs) return
    toast.add({
      title: t('pwa.updateAvailable'),
      icon: 'i-lucide-refresh-cw',
      color: 'primary',
      duration: 0,
      actions: [
        {
          label: t('pwa.reload'),
          onClick: () => $pwa?.updateServiceWorker(true)
        }
      ]
    })
  }
)
</script>

<template>
  <span class="hidden" aria-hidden="true" />
</template>
