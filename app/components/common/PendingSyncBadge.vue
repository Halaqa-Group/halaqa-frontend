<script setup lang="ts">
// Contextual "N pending sync" badge for a list page. `attendance` counts queued
// attendance syncs in the outbox; `achievements` counts offline recitation drafts.
const props = defineProps<{ kind: 'attendance' | 'achievements' }>()
const { t } = useI18n()
const { entries } = useOfflineOutbox()
const { draftCount } = useAchievementDrafts()

const count = computed(() =>
  props.kind === 'achievements'
    ? draftCount.value
    : entries.value.filter(e => e.kind.startsWith('attendance')).length
)
</script>

<template>
  <UBadge
    v-if="count > 0"
    color="warning"
    variant="soft"
    size="sm"
    icon="i-lucide-refresh-cw"
  >
    {{ t('pwa.draftsPending', { count }) }}
  </UBadge>
</template>
