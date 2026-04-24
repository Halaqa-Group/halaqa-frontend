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
  <div class="flex-[4] relative group/column">
    <!-- Status indicator -->
    <button
      class="absolute -start-2.5 -top-2.5 w-7 h-7 rounded-full flex items-center justify-center z-20 shadow-lg border-2 border-white transition-all duration-300 hover:scale-110 active:scale-95 group/status"
      :style="`background-color: ${status.bgHex};`"
      @click="cycleStatus(dayId, category)"
    >
      <UIcon :name="status.icon" class="w-3.5 h-3.5 group-hover/status:scale-110" :style="`color: ${status.iconHex};`" />
    </button>

    <!-- Cell -->
    <div
      class="w-full bg-white border rounded-[22px] shadow-sm relative overflow-hidden flex flex-col justify-center min-h-[60px] transition-all group/cell border-b-2 border-outline-variant/10 py-1.5"
      :class="isDragOver ? 'ring-2 ring-primary/30 shadow-md' : ''"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <div v-if="items.length > 0" class="flex flex-col">
        <PlannerRangeInput
          v-for="item in items"
          :key="item.id"
          :item="item"
          :day-id="dayId"
          :category="category"
          :is-edit-mode="isEditMode"
        />
      </div>

      <button
        v-else-if="isEditMode"
        class="w-full flex items-center justify-center gap-1.5 text-xs font-arabic transition-colors hover:bg-muted text-muted py-5"
        @click="addLesson(dayId, category)"
      >
        <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" />
        إضافة درس
      </button>

      <div v-else class="py-5" />
    </div>
  </div>
</template>
