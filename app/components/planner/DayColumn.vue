<script setup lang="ts">
import type { LessonItem, LessonCategory } from '~/types'

const props = defineProps<{
  items: LessonItem[]
  dayId: string
  category: LessonCategory
  isEditMode: boolean
  isRestDay: boolean
}>()

const { moveLesson, clearLesson } = useSchedule()
const { t } = useI18n()

const isDragOver = ref(false)
const popoverOpen = ref(false)
// Edit target: undefined = closed; null = adding new; LessonItem = editing
const editTarget = ref<LessonItem | null>(null)

const tintClasses = computed(() => {
  switch (props.category) {
    case 'mem': return 'bg-track-hifz-bg/40 hover:bg-track-hifz-bg/70 border-track-hifz/15'
    case 'near': return 'bg-track-near-bg/40 hover:bg-track-near-bg/70 border-track-near/15'
    case 'far': return 'bg-track-far-bg/40 hover:bg-track-far-bg/70 border-track-far/15'
  }
  return ''
})

const trackTextClass = computed(() => {
  switch (props.category) {
    case 'mem': return 'text-track-hifz'
    case 'near': return 'text-track-near'
    case 'far': return 'text-track-far'
  }
  return ''
})

function openForAdd() {
  if (!props.isEditMode || props.isRestDay) return
  editTarget.value = null
  popoverOpen.value = true
}

function openForEdit(lesson: LessonItem) {
  if (!props.isEditMode || props.isRestDay) return
  editTarget.value = lesson
  popoverOpen.value = true
}

function clearItem(lessonId: string) {
  clearLesson(props.dayId, props.category, lessonId)
}

function rangeText(item: LessonItem) {
  return t('pages.planner.cell.rangeShort', { from: item.startAyah, to: item.endAyah })
}

function onDragOver(e: DragEvent) {
  if (!props.isEditMode || props.isRestDay) return
  e.preventDefault()
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(e: DragEvent) {
  if (!props.isEditMode || props.isRestDay) return
  e.preventDefault()
  isDragOver.value = false
  try {
    const data = JSON.parse(e.dataTransfer?.getData('application/json') || '{}')
    if (data.sourceDayId && data.sourceCategory && data.lessonId) {
      moveLesson(data.sourceDayId, data.sourceCategory, data.lessonId, props.dayId, props.category)
    }
  } catch {}
}
</script>

<template>
  <div class="flex-[4] relative">
    <UPopover
      v-model:open="popoverOpen"
      :ui="{ content: 'rounded-2xl' }"
    >
      <!-- Trigger: filled card OR empty + button -->
      <div
        v-if="items.length > 0"
        class="w-full rounded-xl border transition-all flex flex-col"
        :class="[tintClasses, isDragOver ? 'ring-2 ring-primary/30 shadow-md' : '', isRestDay ? 'opacity-50' : '']"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <button
          v-for="(item, idx) in items"
          :key="item.id"
          type="button"
          class="w-full text-start group/cell relative px-3 py-2.5 transition-colors hover:bg-white/40 first:rounded-t-xl last:rounded-b-xl disabled:cursor-default disabled:hover:bg-transparent"
          :class="idx > 0 ? 'border-t border-white/40' : ''"
          :disabled="!isEditMode || isRestDay"
          @click="openForEdit(item)"
        >
          <div class="flex items-baseline justify-between gap-2">
            <span class="font-bold text-sm" :class="trackTextClass">{{ item.startSurah }}</span>
            <span
              v-if="isEditMode && !isRestDay"
              class="flex items-center gap-1 opacity-0 group-hover/cell:opacity-100 transition-opacity"
            >
              <UIcon name="i-lucide-pencil" class="w-3.5 h-3.5" :class="trackTextClass" />
              <span
                role="button"
                :aria-label="$t('pages.planner.cell.clear')"
                class="w-5 h-5 rounded-full bg-on-surface/10 hover:bg-status-conflict hover:text-white text-on-surface-variant flex items-center justify-center"
                @click.stop="clearItem(item.id)"
              >
                <UIcon name="i-lucide-x" class="w-3 h-3" />
              </span>
            </span>
          </div>
          <div class="text-xs text-on-surface-variant mt-0.5">
            {{ rangeText(item) }}
          </div>
        </button>
      </div>

      <button
        v-else
        type="button"
        class="w-full h-[60px] rounded-xl border border-dashed transition-all flex items-center justify-center gap-1.5 group/empty"
        :class="[
          tintClasses,
          isDragOver ? 'ring-2 ring-primary/30 shadow-md' : '',
          isRestDay ? 'opacity-50 cursor-not-allowed' : (isEditMode ? 'hover:border-solid hover:shadow-sm cursor-pointer' : 'cursor-default')
        ]"
        :disabled="!isEditMode || isRestDay"
        @click="openForAdd"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <UIcon
          name="i-lucide-plus"
          class="w-4 h-4 group-hover/empty:scale-110 transition-transform"
          :class="isEditMode ? trackTextClass : 'text-on-surface-variant'"
        />
        <span
          v-if="isEditMode && !isRestDay"
          class="text-xs font-medium opacity-0 group-hover/empty:opacity-100 transition-opacity"
          :class="trackTextClass"
        >
          {{ $t('pages.planner.cell.addLabel') }}
        </span>
      </button>

      <template #content>
        <PlannerCellPopover
          :day-id="dayId"
          :category="category"
          :lesson="editTarget"
          @close="popoverOpen = false"
        />
      </template>
    </UPopover>
  </div>
</template>
