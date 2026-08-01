<script setup lang="ts">
// Friendly placeholder for a view that has no cached data to show while offline,
// used in place of a raw error/spinner. Pages pass overrides when useful.
defineProps<{ title?: string, description?: string }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-16 text-center">
    <div class="rounded-full bg-warning/10 p-3">
      <UIcon name="i-lucide-cloud-off" class="size-7 text-warning" />
    </div>
    <div class="space-y-1">
      <p class="font-medium text-highlighted">
        {{ title ?? $t('pwa.offline') }}
      </p>
      <p class="text-sm text-on-surface-variant max-w-xs">
        {{ description ?? $t('pwa.offlineNoData') }}
      </p>
    </div>
  </div>
</template>
