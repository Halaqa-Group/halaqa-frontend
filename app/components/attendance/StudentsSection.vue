<script setup lang="ts">
defineProps<{
  canMark: boolean
  hasHalaqa: boolean
  hasRows: boolean
}>()

defineEmits<{
  'mark-all': []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex justify-end">
      <UButton
        v-if="canMark && hasHalaqa && hasRows"
        icon="i-lucide-check-check"
        color="primary"
        variant="soft"
        class="shrink-0"
        @click="$emit('mark-all')"
      >
        {{ t('pages.attendance.markAllPresent') }}
      </UButton>
    </div>

    <div
      v-if="!hasHalaqa"
      class="flex flex-col items-center gap-3 py-12 rounded-xl border border-default bg-default"
    >
      <UIcon name="i-lucide-layers" class="w-10 h-10 text-muted" />
      <p class="text-sm text-muted">
        {{ t('common.selectHalaqaPrompt') }}
      </p>
    </div>

    <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <AttendanceFilterBar />
      </template>
      <AttendanceResults />
    </UCard>
  </div>
</template>
