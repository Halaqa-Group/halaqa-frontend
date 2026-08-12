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
//  • a timestamp in sessionStorage — suppress a re-prompt that arrives right
//    after an update was applied (that is the loop), while still prompting for
//    genuinely later deploys.
//
// This used to be a boolean "already applied this session" flag, which suppressed
// EVERY later update too. A standalone PWA keeps one session alive for days or
// weeks, so a user who accepted one update stopped being offered any after it —
// stranded on old code until they cleared site data. Hence the time window.
const UPDATE_APPLIED_AT_KEY = 'pwa:update-applied-at'
const LOOP_GUARD_MS = 10 * 60 * 1000
let updateToastShown = false

function updateJustApplied(): boolean {
  try {
    const at = Number(sessionStorage.getItem(UPDATE_APPLIED_AT_KEY) ?? 0)
    return at > 0 && Date.now() - at < LOOP_GUARD_MS
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
    if (!needs || updateToastShown || updateJustApplied()) return
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
            // Stamp BEFORE reloading so the re-mounted prompt won't re-fire if the
            // SW still (wrongly) reports an update after the reload.
            try {
              sessionStorage.setItem(UPDATE_APPLIED_AT_KEY, String(Date.now()))
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
