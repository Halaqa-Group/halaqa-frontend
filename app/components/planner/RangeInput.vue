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
  <!-- VIEW MODE -->
  <div v-if="!isEditMode" class="flex items-center justify-center gap-2">
    <span class="text-sm font-bold text-highlighted font-arabic">{{ item.startSurah }}</span>
    <span class="text-sm font-semibold text-highlighted">{{ item.startAyah }}</span>
    <span class="text-xs text-muted leading-none">|</span>
    <span class="text-sm font-semibold text-highlighted">{{ item.endAyah }}</span>
    <span class="text-sm font-bold text-highlighted font-arabic">{{ item.endSurah }}</span>
  </div>

  <!-- EDIT MODE -->
  <div
    v-else
    class="relative rounded-xl p-2 transition-all cursor-grab active:cursor-grabbing bg-muted border border-default"
    :draggable="true"
    @dragstart="onDragStart"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Delete button -->
    <Transition name="fade">
      <button
        v-if="isHovered"
        class="absolute -top-2 -end-2 z-10 w-5 h-5 rounded-full flex items-center justify-center bg-error text-white"
        @click.stop="removeLesson(dayId, category, item.id)"
      >
        <UIcon name="i-lucide-x" class="w-3 h-3" />
      </button>
    </Transition>

    <!-- Drag handle -->
    <div class="flex justify-center mb-1.5">
      <UIcon name="i-lucide-grip-horizontal" class="w-4 h-4 text-muted" />
    </div>

    <!-- Start row -->
    <div class="flex items-center gap-1 mb-1">
      <USelect
        :model-value="item.startSurah"
        :items="SURAHS"
        size="xs"
        class="flex-1 font-arabic"
        @update:model-value="update('startSurah', $event as string)"
      />
      <UInputNumber
        :model-value="item.startAyah"
        size="xs"
        class="w-14"
        :min="1"
        :controls="false"
        @update:model-value="update('startAyah', $event ?? 1)"
      />
    </div>

    <USeparator class="my-1" />

    <!-- End row -->
    <div class="flex items-center gap-1">
      <USelect
        :model-value="item.endSurah"
        :items="SURAHS"
        size="xs"
        class="flex-1 font-arabic"
        @update:model-value="update('endSurah', $event as string)"
      />
      <UInputNumber
        :model-value="item.endAyah"
        size="xs"
        class="w-14"
        :min="1"
        :controls="false"
        @update:model-value="update('endAyah', $event ?? 1)"
      />
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
</style>
