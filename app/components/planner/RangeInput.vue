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

const surahItems = SURAHS.map(s => ({ label: s, value: s }))

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
      <UButton
        v-if="isEditMode && isHovered"
        color="error"
        variant="solid"
        icon="i-lucide-x"
        size="xs"
        class="absolute -top-2 -end-2 z-10 w-5 h-5 rounded-full justify-center p-0"
        :ui="{ leadingIcon: 'w-3 h-3' }"
        @click.stop="removeLesson(dayId, category, item.id)"
      />
    </Transition>

    <!-- Start: surah + ayah -->
    <div class="flex-1 min-w-0 flex items-center gap-2">
      <USelect
        :model-value="item.startSurah"
        :items="surahItems"
        :disabled="!isEditMode"
        variant="none"
        class="flex-[2.5] min-w-0"
        :ui="{
          base: `w-full font-bold appearance-none text-center text-sm h-7 rounded-full bg-transparent px-1 ${isEditMode ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default'}`,
          trailing: 'hidden'
        }"
        @update:model-value="update('startSurah', $event)"
      />
      <UInput
        :model-value="item.startAyah"
        type="number"
        :disabled="!isEditMode"
        variant="none"
        class="w-12 shrink-0"
        :ui="{
          base: `text-center font-bold text-sm h-7 w-full rounded-full bg-transparent ${isEditMode ? 'cursor-text hover:bg-muted/50' : 'cursor-default'}`
        }"
        @change="update('startAyah', +($event.target as HTMLInputElement).value || 1)"
      />
    </div>

    <!-- Divider -->
    <div class="text-on-surface-variant/20 font-bold px-1 transition-colors group-hover/row:text-primary/30">|</div>

    <!-- End: surah + ayah -->
    <div class="flex-1 min-w-0 flex items-center gap-2">
      <USelect
        :model-value="item.endSurah"
        :items="surahItems"
        :disabled="!isEditMode"
        variant="none"
        class="flex-[2.5] min-w-0"
        :ui="{
          base: `w-full font-bold appearance-none text-center text-sm h-7 rounded-full bg-transparent px-1 ${isEditMode ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default'}`,
          trailing: 'hidden'
        }"
        @update:model-value="update('endSurah', $event)"
      />
      <UInput
        :model-value="item.endAyah"
        type="number"
        :disabled="!isEditMode"
        variant="none"
        class="w-12 shrink-0"
        :ui="{
          base: `text-center font-bold text-sm h-7 w-full rounded-full bg-transparent ${isEditMode ? 'cursor-text hover:bg-muted/50' : 'cursor-default'}`
        }"
        @change="update('endAyah', +($event.target as HTMLInputElement).value || 1)"
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

input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
}
</style>
