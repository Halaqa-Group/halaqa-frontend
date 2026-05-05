<script setup lang="ts">
import { SURAHS, SURAH_NAMES } from '~/data/constants'
import { VERSE_COUNTS, totalVersesInRange } from '~/utils/quran'
import type { LessonItem, LessonCategory } from '~/types'

const props = defineProps<{
  dayId: string
  category: LessonCategory
  lesson: LessonItem | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { setLesson } = useSchedule()
const { t } = useI18n()

const SURAH_NUMBER_MAP: Record<string, number> = Object.fromEntries(
  Object.entries(SURAH_NAMES).map(([num, name]) => [name, Number(num)])
)
const surahItems = SURAHS.map(s => ({ label: s, value: s }))

const surah = ref<string>('النبأ')
const fromAyah = ref<number>(1)
const toAyah = ref<number>(5)

function reset() {
  if (props.lesson) {
    surah.value = props.lesson.startSurah || 'النبأ'
    fromAyah.value = props.lesson.startAyah || 1
    toAyah.value = props.lesson.endAyah || fromAyah.value
  } else {
    surah.value = 'النبأ'
    fromAyah.value = 1
    toAyah.value = 5
  }
}
reset()

watch(() => props.lesson?.id, reset)

const surahMaxAyah = computed(() => {
  const num = SURAH_NUMBER_MAP[surah.value]
  return num ? VERSE_COUNTS[num] ?? 1 : 1
})

watch(surah, () => {
  const max = surahMaxAyah.value
  if (fromAyah.value > max) fromAyah.value = max
  if (toAyah.value > max) toAyah.value = max
})

const error = computed(() => {
  if (toAyah.value < fromAyah.value) return t('pages.planner.cell.errorOrder')
  return null
})

const ayahCount = computed(() => {
  const num = SURAH_NUMBER_MAP[surah.value] ?? 1
  return totalVersesInRange(num, fromAyah.value, num, toAyah.value)
})

const previewText = computed(() =>
  t('pages.planner.cell.previewWithCount', {
    surah: surah.value,
    from: fromAyah.value,
    to: toAyah.value,
    count: ayahCount.value
  })
)

function confirm() {
  if (error.value) return
  setLesson(
    props.dayId,
    props.category,
    props.lesson?.id ?? null,
    surah.value,
    fromAyah.value,
    toAyah.value
  )
  emit('close')
}

function cancel() {
  emit('close')
}
</script>

<template>
  <div class="p-4 flex flex-col gap-3 w-[320px]">
    <h4 class="text-sm font-bold text-on-surface">
      {{ lesson ? $t('pages.planner.cell.popoverTitle') : $t('pages.planner.cell.popoverTitleNew') }}
    </h4>

    <div class="flex flex-col gap-1">
      <label class="text-xs font-semibold text-on-surface-variant">
        {{ $t('pages.planner.cell.surahLabel') }}
      </label>
      <USelect
        v-model="surah"
        :items="surahItems"
        class="w-full"
        :ui="{
          base: 'w-full rounded-xl px-3 py-2 text-sm bg-surface-container-low text-on-surface'
        }"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold text-on-surface-variant">
          {{ $t('pages.planner.cell.fromAyahLabel') }}
        </label>
        <UInput
          v-model.number="fromAyah"
          type="number"
          :min="1"
          :max="surahMaxAyah"
          class="w-full"
          :ui="{
            base: 'w-full rounded-xl px-3 py-2 text-sm bg-surface-container-low text-on-surface text-center'
          }"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold text-on-surface-variant">
          {{ $t('pages.planner.cell.toAyahLabel') }}
        </label>
        <UInput
          v-model.number="toAyah"
          type="number"
          :min="1"
          :max="surahMaxAyah"
          class="w-full"
          :ui="{
            base: 'w-full rounded-xl px-3 py-2 text-sm bg-surface-container-low text-on-surface text-center'
          }"
        />
      </div>
    </div>

    <div
      class="rounded-xl px-3 py-2 text-sm"
      :class="error
        ? 'bg-status-conflict-bg text-status-conflict'
        : 'bg-primary-container text-primary'"
    >
      <template v-if="error">{{ error }}</template>
      <template v-else>{{ previewText }}</template>
    </div>

    <div class="flex items-center gap-2 mt-1">
      <UButton
        variant="ghost"
        color="neutral"
        class="flex-1 rounded-xl"
        @click="cancel"
      >
        {{ $t('pages.planner.cell.cancel') }}
      </UButton>
      <UButton
        color="primary"
        class="flex-1 rounded-xl font-bold"
        :disabled="!!error"
        @click="confirm"
      >
        {{ $t('pages.planner.cell.confirm') }}
      </UButton>
    </div>
  </div>
</template>
