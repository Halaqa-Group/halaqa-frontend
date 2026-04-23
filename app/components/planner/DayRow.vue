<script setup lang="ts">
import type { DayData } from '~/types'

const props = defineProps<{
  data: DayData
}>()

const { selectedRowIds, isEditMode, toggleSelectRow } = useSchedule()

const isSelected = computed(() => selectedRowIds.value.has(props.data.id))
</script>

<template>
  <div
    class="flex items-stretch gap-3 rounded-2xl transition-all"
    :class="isSelected ? 'ring-2 ring-[--color-primary]' : ''"
  >
    <!-- Day info (rightmost in RTL = leading) -->
    <div
      class="w-28 shrink-0 flex flex-col justify-center rounded-2xl px-3 py-4"
      style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);"
    >
      <p class="text-sm font-bold font-arabic leading-tight" style="color: var(--color-on-surface);">{{ data.day }}</p>
      <p class="text-xs font-arabic mt-0.5" style="color: var(--color-on-surface-variant);">{{ data.date }}</p>
    </div>

    <!-- Three lesson columns -->
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

    <!-- Checkbox (leftmost in RTL = trailing) -->
    <div class="w-20 shrink-0 flex items-center justify-center">
      <UCheckbox
        v-if="isEditMode"
        :model-value="isSelected"
        @update:model-value="toggleSelectRow(data.id)"
      />
    </div>
  </div>
</template>
