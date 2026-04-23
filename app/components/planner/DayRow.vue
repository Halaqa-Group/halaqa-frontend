<script setup lang="ts">
import type { DayData } from '~/types'

const props = defineProps<{ data: DayData }>()

const { selectedRowIds, isEditMode, toggleSelectRow } = useSchedule()

const isSelected = computed(() => selectedRowIds.value.has(props.data.id))
</script>

<template>
  <div
    class="flex items-stretch gap-3 rounded-2xl transition-all"
    :class="isSelected ? 'ring-2 ring-primary' : ''"
  >
    <!-- Day info -->
    <div class="w-28 shrink-0 px-2 py-3 flex flex-col justify-center">
      <p class="text-base font-bold text-highlighted font-arabic leading-tight">{{ data.day }}</p>
      <p class="text-xs text-muted font-arabic mt-0.5">{{ data.date }}</p>
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

    <!-- Row checkbox (trailing in RTL) -->
    <div class="w-20 shrink-0 flex items-center justify-center">
      <UCheckbox
        v-if="isEditMode"
        :model-value="isSelected"
        @update:model-value="toggleSelectRow(data.id)"
      />
    </div>
  </div>
</template>
