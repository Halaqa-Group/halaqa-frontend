<script setup lang="ts">
// Quick-access offline hub: a top-bar icon that opens the offline downloads
// (full Mushaf + the selected halaqa's students/plans) and the storage
// footprint. Keeps these controls one tap away instead of buried in Profile.
// On mobile it opens as a bottom drawer (swipe-to-dismiss, native sheet feel);
// on desktop it keeps the side slide-over.
import { useMediaQuery } from '@vueuse/core'

const { t } = useI18n()
const open = ref(false)
const isDesktop = useMediaQuery('(min-width: 1024px)')
</script>

<template>
  <UButton
    icon="i-lucide-cloud-download"
    color="neutral"
    variant="ghost"
    size="sm"
    :aria-label="t('pwa.offlineManager')"
    @click="open = true"
  />

  <USlideover
    v-if="isDesktop"
    v-model:open="open"
    :title="t('pwa.offlineManager')"
    :description="t('pwa.offlineManagerDesc')"
    :ui="{ content: 'pt-[env(safe-area-inset-top)]', close: 'top-[calc(env(safe-area-inset-top)+1rem)]' }"
  >
    <template #body>
      <div class="space-y-4">
        <CommonMushafDownloadCard />
        <CommonOfflineHalaqaCard />
      </div>
    </template>
  </USlideover>

  <UDrawer
    v-else
    v-model:open="open"
    :title="t('pwa.offlineManager')"
    :description="t('pwa.offlineManagerDesc')"
    :ui="{ content: 'rounded-t-3xl overflow-hidden' }"
  >
    <template #body>
      <div class="space-y-4 pb-[env(safe-area-inset-bottom)]">
        <CommonMushafDownloadCard />
        <CommonOfflineHalaqaCard />
      </div>
    </template>
  </UDrawer>
</template>
