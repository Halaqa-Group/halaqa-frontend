<script setup lang="ts">
import type { LessonItem, LessonCategory } from '~/types'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v)
})

const { scheduleWithDates, isRestDay, selectedStudent } = useSchedule()
const { t } = useI18n()

const CATEGORIES: { key: LessonCategory, label: string, classes: string }[] = [
  { key: 'mem', label: 'tracks.hifzNew', classes: 'bg-track-hifz-bg text-track-hifz border-track-hifz/20' },
  { key: 'near', label: 'tracks.nearReview', classes: 'bg-track-near-bg text-track-near border-track-near/20' },
  { key: 'far', label: 'tracks.farReview', classes: 'bg-track-far-bg text-track-far border-track-far/20' }
]

function formatRange(item: LessonItem) {
  if (item.startSurah === item.endSurah) {
    return t('pages.planner.cell.rangeShort', { from: item.startAyah, to: item.endAyah })
  }
  return `${item.startSurah} ${item.startAyah} - ${item.endSurah} ${item.endAyah}`
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="$t('pages.planner.topActions.previewTitle')"
    :description="selectedStudent || ''"
    :ui="{
      content: 'sm:max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl',
      header: 'px-5 pt-5 pb-2',
      body: 'p-5 overflow-y-auto max-h-[70vh]'
    }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <div
          v-for="day in scheduleWithDates"
          :key="day.id"
          class="rounded-2xl border border-outline-variant px-4 py-3"
          :class="isRestDay(day.id) ? 'opacity-60 bg-surface-container-low' : 'bg-white'"
        >
          <div class="flex items-baseline justify-between mb-2">
            <h4 class="font-bold text-on-surface">{{ day.day }}</h4>
          </div>

          <div v-if="isRestDay(day.id)" class="text-sm font-semibold text-track-far">
            {{ $t('pages.planner.topActions.previewRestDay') }}
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div
              v-for="cat in CATEGORIES"
              :key="cat.key"
              class="rounded-xl border px-3 py-2"
              :class="cat.classes"
            >
              <div class="text-[11px] font-bold uppercase tracking-wide opacity-70 mb-1">
                {{ $t(cat.label) }}
              </div>
              <template v-if="day.lessons[cat.key].length">
                <div
                  v-for="item in day.lessons[cat.key]"
                  :key="item.id"
                  class="text-sm"
                >
                  <span class="font-bold">{{ item.startSurah }}</span>
                  <span class="opacity-70 ms-1">{{ formatRange(item) }}</span>
                </div>
              </template>
              <div v-else class="text-xs opacity-60">
                —
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
