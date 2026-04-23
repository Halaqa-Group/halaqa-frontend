<script setup lang="ts">
import { STATUS_MAP } from '~/data/constants'
import type { LessonItem, LessonCategory } from '~/types'

const props = defineProps<{
  items: LessonItem[]
  statusColor: string
  dayId: string
  category: LessonCategory
  isEditMode: boolean
}>()

const { addLesson, moveLesson, cycleStatus } = useSchedule()
const isDragOver = ref(false)

const status = computed(() => STATUS_MAP[props.statusColor] || STATUS_MAP['bg-[#86A3B8]'])

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  try {
    const data = JSON.parse(e.dataTransfer?.getData('application/json') || '{}')
    if (data.sourceDayId && data.sourceCategory && data.lessonId) {
      moveLesson(data.sourceDayId, data.sourceCategory, data.lessonId, props.dayId, props.category)
    }
  }
  catch {}
}
</script>

<template>
  <div
    class="flex-1 relative rounded-2xl px-4 py-3 flex flex-col justify-center items-center min-h-[76px] transition-all bg-white dark:bg-elevated shadow-sm"
    :class="isDragOver ? 'ring-2 ring-primary/30 shadow-md' : ''"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- Status indicator (top-start corner = top-right in RTL) -->
    <button
      class="absolute top-2.5 start-2.5 w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110"
      :style="`background-color: ${status.bgHex};`"
      @click="cycleStatus(dayId, category)"
    >
      <UIcon :name="status.icon" class="w-3 h-3" :style="`color: ${status.iconHex};`" />
    </button>

    <!-- Lesson items -->
    <div v-if="items.length > 0" class="flex flex-col gap-2 pt-1">
      <PlannerRangeInput
        v-for="item in items"
        :key="item.id"
        :item="item"
        :day-id="dayId"
        :category="category"
        :is-edit-mode="isEditMode"
      />
    </div>

    <!-- Edit mode empty: add lesson -->
    <button
      v-else-if="isEditMode"
      class="w-full flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-xs font-arabic transition-colors hover:bg-muted py-3"
      :class="['border-default', 'text-muted']"
      @click="addLesson(dayId, category)"
    >
      <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" />
      إضافة درس
    </button>

    <div v-else class="flex-1" />
  </div>
</template>
