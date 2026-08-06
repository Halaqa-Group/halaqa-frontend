<script setup lang="ts">
// A clear, at-a-glance summary of how much space the app's offline data takes:
// a prominent size, a used/quota bar, and the one control that frees it. The
// Mushaf + halaqa cards used to each carry a tiny storage footnote; this pulls
// that into one obvious place.
const { usageLabel, quotaLabel, percent, usageBytes, supported, refresh, clearOfflineCaches } = useOfflineStorage()

const clearing = ref(false)

onMounted(refresh)

async function onClear() {
  clearing.value = true
  try {
    await clearOfflineCaches()
  } finally {
    clearing.value = false
  }
}

// Keep the bar honest even before a quota estimate arrives.
const barColor = computed(() => {
  if (percent.value >= 90) return 'bg-error'
  if (percent.value >= 70) return 'bg-warning'
  return 'bg-primary'
})
</script>

<template>
  <div v-if="supported" class="p-4 rounded-2xl bg-elevated space-y-3">
    <div class="flex items-center gap-3">
      <div class="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <UIcon name="i-lucide-hard-drive" class="size-5 text-primary" />
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="text-base font-bold text-highlighted leading-tight">
          {{ $t('pwa.storageTitle') }}
        </h3>
        <p class="text-xs text-on-surface-variant mt-0.5">
          {{ $t('pwa.storageOf', { used: usageLabel, total: quotaLabel }) }}
        </p>
      </div>
      <span class="text-xl font-bold text-highlighted tabular-nums shrink-0">
        {{ usageLabel }}
      </span>
    </div>

    <div class="h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
      <div
        class="h-full rounded-full transition-[width] duration-500"
        :class="barColor"
        :style="{ width: `${Math.max(percent, usageBytes > 0 ? 2 : 0)}%` }"
      />
    </div>

    <div class="flex items-center justify-between gap-2">
      <span class="text-xs text-on-surface-variant">
        {{ $t('pwa.storagePercentUsed', { percent }) }}
      </span>
      <UButton
        icon="i-lucide-trash-2"
        size="xs"
        color="neutral"
        variant="ghost"
        :loading="clearing"
        :disabled="usageBytes === 0"
        :label="$t('pwa.clearData')"
        @click="onClear"
      />
    </div>
  </div>
</template>
