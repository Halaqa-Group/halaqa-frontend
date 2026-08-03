<script setup lang="ts">
// Quick-access offline hub: a top-bar icon that opens a slide-over with the
// offline downloads (full Mushaf + the selected halaqa's students/plans) and the
// storage footprint. Keeps these controls one tap away instead of buried in
// Profile.
const { t } = useI18n()
const open = ref(false)
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
</template>
