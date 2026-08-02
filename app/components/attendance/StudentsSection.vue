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
    <AttendanceFilterBar
      :can-mark="canMark"
      :has-halaqa="hasHalaqa"
      :has-rows="hasRows"
      @mark-all="$emit('mark-all')"
    />

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
      <AttendanceResults />
    </UCard>
  </div>
</template>
