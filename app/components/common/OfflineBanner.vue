<script setup lang="ts">
// Slim, full-width strip shown at the top of the content area while offline, so
// every page explains why data may be missing or stale without per-page work.
import { useOnline } from '@vueuse/core'

const online = useOnline()
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200"
    enter-from-class="-translate-y-full opacity-0"
    leave-active-class="transition-all duration-200"
    leave-to-class="-translate-y-full opacity-0"
  >
    <div
      v-if="!online"
      class="flex items-center justify-center gap-2 bg-warning/10 text-warning px-4 py-1.5 text-sm border-b border-warning/20"
    >
      <UIcon name="i-lucide-wifi-off" class="size-4 shrink-0" />
      <span>{{ $t('pwa.offlineReadOnly') }}</span>
    </div>
  </Transition>
</template>
