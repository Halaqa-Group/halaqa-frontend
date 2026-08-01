<script setup lang="ts">
// Offers a deliberate, one-tap download of the whole Mushaf (≈46MB) for offline
// reading. Pages are otherwise cached only as they're visited.
const { t } = useI18n()
const {
  state, done, total, progress, isDownloading, supported, start, cancel
} = useMushafDownload()
const { usageLabel, percent, supported: storageSupported, refresh, clearOfflineCaches } = useOfflineStorage()

const clearing = ref(false)

onMounted(refresh)
watch(state, (s) => {
  // Refresh the footprint once a download settles.
  if (s === 'complete' || s === 'partial' || s === 'cancelled') void refresh()
})

async function onClear() {
  clearing.value = true
  try {
    await clearOfflineCaches()
  } finally {
    clearing.value = false
  }
}

const statusText = computed(() => {
  switch (state.value) {
    case 'downloading': return t('pwa.mushafDownloading', { done: done.value, total: total.value })
    case 'complete': return t('pwa.mushafDownloaded')
    case 'partial': return t('pwa.mushafPartial', { count: total.value - done.value })
    case 'cancelled': return t('pwa.mushafCancelled')
    default: return t('pwa.mushafDownloadDescription')
  }
})

const statusColor = computed(() => {
  if (state.value === 'complete') return 'success'
  if (state.value === 'partial') return 'warning'
  return 'neutral'
})
</script>

<template>
  <div v-if="supported" class="p-4 rounded-2xl bg-elevated space-y-3">
    <div class="flex items-start gap-3">
      <UIcon name="i-lucide-book-down" class="size-6 text-primary shrink-0 mt-0.5" />
      <div class="min-w-0 flex-1">
        <h3 class="text-base font-bold text-highlighted">
          {{ $t('pwa.mushafDownloadTitle') }}
        </h3>
        <p class="text-sm text-on-surface-variant mt-0.5">
          {{ statusText }}
        </p>
      </div>
      <UBadge
        v-if="state === 'complete' || state === 'partial'"
        :color="statusColor"
        variant="soft"
        size="sm"
      >
        {{ state === 'complete' ? $t('pwa.mushafAvailableOffline') : `${done}/${total}` }}
      </UBadge>
    </div>

    <UProgress v-if="isDownloading" :model-value="progress" size="sm" />

    <div class="flex flex-wrap items-center gap-2">
      <UButton
        v-if="!isDownloading"
        icon="i-lucide-download"
        size="sm"
        :label="$t('pwa.mushafDownload')"
        @click="start"
      />
      <UButton
        v-else
        icon="i-lucide-x"
        size="sm"
        color="neutral"
        variant="soft"
        :label="$t('pwa.mushafCancel')"
        @click="cancel"
      />
      <UButton
        icon="i-lucide-trash-2"
        size="sm"
        color="neutral"
        variant="ghost"
        :loading="clearing"
        :disabled="isDownloading"
        :label="$t('pwa.clearData')"
        @click="onClear"
      />
    </div>

    <p v-if="storageSupported" class="text-xs text-on-surface-variant flex items-center gap-1.5">
      <UIcon name="i-lucide-hard-drive" class="size-3.5" />
      {{ $t('pwa.storageUsed', { size: usageLabel, percent }) }}
    </p>
  </div>
</template>
