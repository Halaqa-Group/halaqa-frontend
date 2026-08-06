<script setup lang="ts">
// Deliberately caches the currently-selected halaqa's students + plans (+ the
// lessons' Mushaf pages) for offline recording. Mirrors MushafDownloadCard.
import { useOnline } from '@vueuse/core'

const { t } = useI18n()
const online = useOnline()
const { selectedHalaqaId, selectedHalaqaName } = useGlobalHalaqa()
const { state, done, total, progress, isCaching, cachingHalaqaId, makeAvailableOffline, lastCachedAt } = useHalaqaOfflineCache()

const cachedAt = computed(() => (selectedHalaqaId.value != null ? lastCachedAt(selectedHalaqaId.value) : null))
const cachedAtLabel = computed(() => {
  if (!cachedAt.value) return null
  return new Date(cachedAt.value).toLocaleString(undefined, { numberingSystem: 'latn' })
})

// Only reflect progress for the halaqa this card is about.
const showProgress = computed(() => isCaching.value && cachingHalaqaId.value === selectedHalaqaId.value)

const statusText = computed(() => {
  if (showProgress.value) return t('pwa.offlineHalaqaCaching', { done: done.value, total: total.value })
  if (state.value === 'error' && !online.value) return t('pwa.offlineHalaqaNeedsConnection')
  if (cachedAtLabel.value) return t('pwa.offlineHalaqaUpdated', { time: cachedAtLabel.value })
  return t('pwa.offlineHalaqaDescription')
})

async function onCache() {
  if (selectedHalaqaId.value == null) return
  await makeAvailableOffline(selectedHalaqaId.value)
}
</script>

<template>
  <div class="p-4 rounded-2xl bg-elevated space-y-3">
    <div class="flex items-start gap-3">
      <UIcon name="i-lucide-users" class="size-6 text-primary shrink-0 mt-0.5" />
      <div class="min-w-0 flex-1">
        <h3 class="text-base font-bold text-highlighted">
          {{ $t('pwa.offlineHalaqaTitle') }}
        </h3>
        <p class="text-sm text-on-surface-variant mt-0.5">
          {{ statusText }}
        </p>
      </div>
      <UBadge
        v-if="cachedAt && !showProgress"
        color="success"
        variant="soft"
        size="sm"
        icon="i-lucide-check"
      >
        {{ $t('pwa.offlineHalaqaAvailable') }}
      </UBadge>
    </div>

    <UProgress v-if="showProgress" :model-value="progress" size="sm" />

    <div class="flex flex-wrap items-center gap-2">
      <UButton
        icon="i-lucide-cloud-download"
        size="sm"
        :label="cachedAt ? $t('pwa.offlineHalaqaUpdate') : $t('pwa.offlineHalaqaCache')"
        :loading="showProgress"
        :disabled="selectedHalaqaId == null || !online || isCaching"
        @click="onCache"
      />
      <span v-if="selectedHalaqaId != null" class="text-xs text-on-surface-variant">
        {{ selectedHalaqaName }}
      </span>
      <span v-else class="text-xs text-warning">
        {{ $t('pwa.offlineHalaqaSelectFirst') }}
      </span>
    </div>
  </div>
</template>
