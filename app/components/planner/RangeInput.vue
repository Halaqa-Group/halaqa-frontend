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
  <div
    class="relative flex items-center gap-3 px-3 py-1 rounded-xl group/row transition-all"
    :class="isEditMode ? 'hover:bg-muted/50 cursor-grab active:cursor-grabbing' : ''"
    :draggable="isEditMode"
    @dragstart="isEditMode ? onDragStart($event) : undefined"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Delete button -->
    <Transition name="fade">
      <button
        v-if="isEditMode && isHovered"
        class="absolute -top-2 -end-2 z-10 w-5 h-5 rounded-full flex items-center justify-center bg-error text-white"
        @click.stop="removeLesson(dayId, category, item.id)"
      >
        <UIcon name="i-lucide-x" class="w-3 h-3" />
      </button>
    </Transition>

    <!-- Start: surah + ayah -->
    <div class="flex-1 min-w-0 flex items-center gap-2">
      <div class="flex-[2.5] min-w-0">
        <select
          :value="item.startSurah"
          :disabled="!isEditMode"
          class="w-full font-arabic font-bold outline-none appearance-none text-center text-sm transition-all h-7 rounded-full bg-transparent px-1"
          :class="isEditMode ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default'"
          @change="update('startSurah', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="s in SURAHS" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="w-12 shrink-0">
        <input
          :value="item.startAyah"
          type="number"
          :disabled="!isEditMode"
          class="transition-all outline-none text-center font-arabic font-bold text-sm h-7 w-full rounded-full bg-transparent"
          :class="isEditMode ? 'cursor-text hover:bg-muted/50' : 'cursor-default'"
          @change="update('startAyah', +($event.target as HTMLInputElement).value || 1)"
        />
      </div>
    </div>

    <!-- Divider -->
    <div class="text-on-surface-variant/20 font-bold px-1 transition-colors group-hover/row:text-primary/30">|</div>

    <!-- End: surah + ayah -->
    <div class="flex-1 min-w-0 flex items-center gap-2">
      <div class="flex-[2.5] min-w-0">
        <select
          :value="item.endSurah"
          :disabled="!isEditMode"
          class="w-full font-arabic font-bold outline-none appearance-none text-center text-sm transition-all h-7 rounded-full bg-transparent px-1"
          :class="isEditMode ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default'"
          @change="update('endSurah', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="s in SURAHS" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="w-12 shrink-0">
        <input
          :value="item.endAyah"
          type="number"
          :disabled="!isEditMode"
          class="transition-all outline-none text-center font-arabic font-bold text-sm h-7 w-full rounded-full bg-transparent"
          :class="isEditMode ? 'cursor-text hover:bg-muted/50' : 'cursor-default'"
          @change="update('endAyah', +($event.target as HTMLInputElement).value || 1)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
}
</style>
