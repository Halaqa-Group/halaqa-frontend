<script setup lang="ts">
const { summary } = useStudentsView()
const { t } = useI18n()

const cards = computed(() => [
  { label: t('pages.students.stats.totalStudents'), value: summary.value.total, icon: 'i-lucide-users' },
  { label: t('pages.students.stats.activeStudents'), value: summary.value.active, icon: 'i-lucide-user-check' },
  { label: t('pages.students.stats.inactiveStudents'), value: summary.value.inactive, icon: 'i-lucide-user-minus' },
  { label: t('pages.students.stats.graduatedStudents'), value: summary.value.graduated, icon: 'i-lucide-graduation-cap' }
])
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <UCard
      v-for="card in cards"
      :key="card.label"
      :ui="{ body: 'p-4' }"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex flex-col gap-1 min-w-0">
          <span class="text-xs text-muted">{{ card.label }}</span>
          <span class="text-2xl font-semibold tabular-nums">{{ card.value }}</span>
        </div>
        <UIcon :name="card.icon" class="w-6 h-6 text-muted shrink-0" />
      </div>
    </UCard>
  </div>
</template>
