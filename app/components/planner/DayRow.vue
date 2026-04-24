<script setup lang="ts">
import type { DayData } from '~/types'

const props = defineProps<{ data: DayData }>()

const { selectedRowIds, isEditMode, toggleSelectRow } = useSchedule()

const isSelected = computed(() => selectedRowIds.value.has(props.data.id))
</script>

<template>
  <div
    class="rounded-[24px] px-4 py-3 flex items-start gap-4 border border-dotted transition-all group relative bg-transparent"
    :class="isSelected ? 'border-primary/40' : 'border-outline-variant/50'"
  >
    <!-- Select checkbox -->
    <div v-if="isEditMode" class="w-8 shrink-0 flex justify-center pt-3">
      <UCheckbox
        :model-value="isSelected"
        @update:model-value="toggleSelectRow(data.id)"
      />
    </div>

    <!-- Day info -->
    <div class="w-[110px] shrink-0 flex flex-col items-start pe-4 pt-2 self-start border-e border-dotted border-outline-variant/50 ps-1">
      <h3 class="font-arabic font-bold text-on-surface text-lg leading-tight">{{ data.day }}</h3>
      <p class="text-xs font-arabic mt-1" style="color: var(--color-on-surface-variant); opacity: 0.5;">{{ data.date }}</p>
    </div>

    <!-- Three lesson columns -->
    <div class="flex-1 flex gap-6">
      <PlannerDayColumn
        :items="data.lessons.mem"
        :status-color="data.statusColors.mem"
        :day-id="data.id"
        category="mem"
        :is-edit-mode="isEditMode"
      />
      <PlannerDayColumn
        :items="data.lessons.near"
        :status-color="data.statusColors.near"
        :day-id="data.id"
        category="near"
        :is-edit-mode="isEditMode"
      />
      <PlannerDayColumn
        :items="data.lessons.far"
        :status-color="data.statusColors.far"
        :day-id="data.id"
        category="far"
        :is-edit-mode="isEditMode"
      />
    </div>
  </div>
</template>
