<script setup lang="ts">
import { SURAHS } from '~/data/constants'
import type { LessonItem, LessonCategory } from '~/types'

const props = defineProps<{
  item: LessonItem
  dayId: string
  category: LessonCategory
  isEditMode: boolean
}>()

const { updateLesson, removeLesson } = useSchedule()
const isHovered = ref(false)

function onDragStart(e: DragEvent) {
  e.dataTransfer?.setData('application/json', JSON.stringify({
    sourceDayId: props.dayId,
    sourceCategory: props.category,
    lessonId: props.item.id
  }))
}

function update(field: keyof LessonItem, value: string | number) {
  updateLesson(props.dayId, props.category, props.item.id, { [field]: value })
}
</script>

<template>
  <!-- VIEW MODE: inline compact range display -->
  <div
    v-if="!isEditMode"
    class="flex items-center gap-1.5"
  >
    <!-- RTL flex: first child = rightmost. Order: startSurah | startAyah | ← | endAyah | endSurah -->
    <span class="text-sm font-bold font-arabic" style="color: var(--color-on-surface);">{{ item.startSurah }}</span>
    <span class="text-xs font-arabic px-1.5 py-0.5 rounded-full" style="color: var(--color-on-surface-variant); background-color: var(--color-surface-container-low);">{{ item.startAyah }}</span>
    <span class="text-xs" style="color: var(--color-outline);">|</span>
    <span class="text-xs font-arabic px-1.5 py-0.5 rounded-full" style="color: var(--color-on-surface-variant); background-color: var(--color-surface-container-low);">{{ item.endAyah }}</span>
    <span class="text-sm font-bold font-arabic" style="color: var(--color-on-surface);">{{ item.endSurah }}</span>
  </div>

  <!-- EDIT MODE: full input card with drag support -->
  <div
    v-else
    class="relative rounded-xl p-2 transition-all cursor-grab active:cursor-grabbing"
    style="background-color: var(--color-surface-container-low); box-shadow: var(--shadow-card);"
    :draggable="true"
    @dragstart="onDragStart"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Delete button -->
    <Transition name="fade">
      <button
        v-if="isHovered"
        class="absolute -top-2 -left-2 z-10 w-5 h-5 rounded-full flex items-center justify-center"
        style="background-color: var(--color-error); color: white;"
        @click.stop="removeLesson(dayId, category, item.id)"
      >
        <UIcon name="i-lucide-x" class="w-3 h-3" />
      </button>
    </Transition>

    <!-- Drag handle -->
    <div class="flex justify-center mb-1.5">
      <UIcon name="i-lucide-grip-horizontal" class="w-4 h-4" style="color: var(--color-outline);" />
    </div>

    <!-- Start row -->
    <div class="flex items-center gap-1 mb-1">
      <select
        :value="item.startSurah"
        class="flex-1 text-xs font-arabic font-bold text-center rounded-lg px-1 py-1 outline-none bg-black/5 hover:bg-black/8"
        style="color: var(--color-on-surface);"
        @change="update('startSurah', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="s in SURAHS" :key="s" :value="s">{{ s }}</option>
      </select>
      <input
        type="number"
        :value="item.startAyah"
        class="w-10 text-xs text-center rounded-lg px-1 py-1 outline-none bg-black/5 hover:bg-black/8"
        style="color: var(--color-on-surface);"
        min="1"
        @input="update('startAyah', Number(($event.target as HTMLInputElement).value))"
      >
    </div>

    <div class="border-t my-1" style="border-color: var(--color-outline-variant);" />

    <!-- End row -->
    <div class="flex items-center gap-1">
      <select
        :value="item.endSurah"
        class="flex-1 text-xs font-arabic font-bold text-center rounded-lg px-1 py-1 outline-none bg-black/5 hover:bg-black/8"
        style="color: var(--color-on-surface);"
        @change="update('endSurah', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="s in SURAHS" :key="s" :value="s">{{ s }}</option>
      </select>
      <input
        type="number"
        :value="item.endAyah"
        class="w-10 text-xs text-center rounded-lg px-1 py-1 outline-none bg-black/5 hover:bg-black/8"
        style="color: var(--color-on-surface);"
        min="1"
        @input="update('endAyah', Number(($event.target as HTMLInputElement).value))"
      >
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
