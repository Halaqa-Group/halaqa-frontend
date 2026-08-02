<script setup lang="ts">
// Persistent offline chip + transient toasts on connectivity transitions.
// The pending-count badge is a button that opens the full unsynced-items log.
import { useOnline } from '@vueuse/core'

const { t } = useI18n()
const toast = useToast()
const online = useOnline()
const { pendingCount: outboxPending, failed, flushedAt } = useOfflineOutbox()
const { draftCount, flushedAt: draftsFlushedAt, failedCount: draftFails } = useAchievementDrafts()

const pendingCount = computed(() => outboxPending.value + draftCount.value)
const totalBadgeCount = computed(() => pendingCount.value + failed.value.length)
const panelOpen = ref(false)

watch(online, (isOnline, was) => {
  if (was === undefined || isOnline === was) return
  // No toast when going offline — the persistent offline badge already covers it.
  if (!isOnline) return
  toast.add({
    description: t('pwa.online'),
    icon: 'i-lucide-wifi',
    color: 'success'
  })
})

// Toast the outcome of a flush (the plugin triggers it; the UI lives here where
// a setup context is available).
watch(flushedAt, () => {
  if (failed.value.length) {
    toast.add({ description: t('pwa.syncFailed'), icon: 'i-lucide-alert-triangle', color: 'error' })
  } else if (outboxPending.value === 0) {
    toast.add({ description: t('pwa.syncSuccess'), icon: 'i-lucide-check', color: 'success' })
  }
})

watch(draftsFlushedAt, () => {
  toast.add({
    description: draftFails.value > 0 ? t('pwa.syncFailed') : t('pwa.syncSuccess'),
    icon: draftFails.value > 0 ? 'i-lucide-alert-triangle' : 'i-lucide-check',
    color: draftFails.value > 0 ? 'error' : 'success'
  })
})
</script>

<template>
  <div class="flex items-center gap-2">
    <UButton
      v-if="totalBadgeCount > 0"
      :color="failed.length ? 'error' : 'warning'"
      variant="soft"
      size="sm"
      :icon="failed.length ? 'i-lucide-alert-triangle' : 'i-lucide-refresh-cw'"
      @click="panelOpen = true"
    >
      {{ $t('pwa.pendingChanges', { count: pendingCount || failed.length }) }}
    </UButton>
    <UBadge
      v-if="!online"
      color="neutral"
      variant="soft"
      size="sm"
      icon="i-lucide-wifi-off"
    >
      {{ $t('pwa.offline') }}
    </UBadge>

    <CommonOfflineSyncPanel v-model:open="panelOpen" />
  </div>
</template>
