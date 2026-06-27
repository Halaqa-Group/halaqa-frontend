<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { SURAH_NAMES } from '~/data/constants'
import { isValidVerseRange, totalVersesInRange, VERSE_COUNTS } from '~/utils/quran'
import type { CreatePlanItemDto } from '~/composables/useWeeklyPlan'

const emit = defineEmits<{ saved: [] }>()

const { t, locale } = useI18n()
const toast = useToast()
const { editing, isSaving, dateOfDay, addItem, updateItem } = useWeeklyPlan()

type TrackKey = 'Hifz' | 'Near' | 'Far'

const isEdit = computed(() => editing.value != null)

const state = reactive<{
  day_of_week: number
  track_type: TrackKey
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
}>({
  day_of_week: 0,
  track_type: 'Hifz',
  start_surah: 1,
  start_verse: 1,
  end_surah: 1,
  end_verse: 7
})

function hydrate() {
  const src = editing.value
  if (src) {
    state.day_of_week = src.day_of_week
    state.track_type = src.track_type
    state.start_surah = src.start_surah
    state.start_verse = src.start_verse
    state.end_surah = src.end_surah
    state.end_verse = src.end_verse
  } else {
    state.day_of_week = 0
    state.track_type = 'Hifz'
    state.start_surah = 1
    state.start_verse = 1
    state.end_surah = 1
    state.end_verse = 7
  }
}
watch(editing, hydrate, { immediate: true })

const dayItems = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = dateOfDay(i)
    let label = String(i)
    try {
      label = d.toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : locale.value, { weekday: 'long' })
    } catch { /* keep numeric */ }
    return { label, value: i }
  })
)
const trackItems = computed(() => (['Hifz', 'Near', 'Far'] as TrackKey[]).map(v => ({ label: t(`pages.achievements.tracks.${v}`), value: v })))
const surahItems = computed(() => Object.entries(SURAH_NAMES).map(([num, name]) => ({ value: Number(num), label: name })))

const maxStartVerse = computed(() => VERSE_COUNTS[state.start_surah] || 1)
const maxEndVerse = computed(() => VERSE_COUNTS[state.end_surah] || 1)

const rangeValid = computed(() => isValidVerseRange(state.start_surah, state.start_verse, state.end_surah, state.end_verse))
const rangeSummary = computed(() => {
  if (!rangeValid.value.valid) return null
  const total = totalVersesInRange(state.start_surah, state.start_verse, state.end_surah, state.end_verse)
  return total > 0 ? t('pages.achievements.versesCount', { count: total }) : null
})

const schema = computed(() => z.object({
  day_of_week: z.number().min(0).max(6),
  track_type: z.enum(['Hifz', 'Near', 'Far'])
}).superRefine((_v, ctx) => {
  const r = rangeValid.value
  if (!r.valid) ctx.addIssue({ code: 'custom', path: ['end_verse'], message: r.error || t('pages.achievements.validation.range') })
}))
type Schema = z.output<typeof schema.value>

async function onSubmit(_e: FormSubmitEvent<Schema>) {
  const dto: CreatePlanItemDto = {
    day_of_week: state.day_of_week,
    track_type: state.track_type,
    start_surah: state.start_surah,
    start_verse: state.start_verse,
    end_surah: state.end_surah,
    end_verse: state.end_verse
  }
  try {
    if (isEdit.value && editing.value) {
      await updateItem(editing.value.id, dto)
      toast.add({ title: t('pages.planner.itemUpdatedToast'), color: 'success' })
    } else {
      await addItem(dto)
      toast.add({ title: t('pages.planner.itemAddedToast'), color: 'success' })
    }
    emit('saved')
  } catch (e: any) {
    toast.add({ title: t('pages.planner.saveErrorTitle'), description: e.data?.message || e.message, color: 'error' })
  }
}

defineExpose({ saving: isSaving })
</script>

<template>
  <UForm id="planner-item-form" :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField :label="t('pages.planner.form.day')" name="day_of_week">
        <USelect v-model="state.day_of_week" :items="dayItems" value-key="value" class="w-full" />
      </UFormField>
      <UFormField :label="t('pages.planner.table.track')" name="track_type">
        <USelect v-model="state.track_type" :items="trackItems" value-key="value" class="w-full" />
      </UFormField>
    </div>

    <UFormField :label="t('pages.planner.table.range')" name="end_verse">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <USelectMenu v-model="state.start_surah" :items="surahItems" value-key="value" searchable class="w-full" />
        <UInput v-model.number="state.start_verse" type="number" :min="1" :max="maxStartVerse" class="w-full" />
        <USelectMenu v-model="state.end_surah" :items="surahItems" value-key="value" searchable class="w-full" />
        <UInput v-model.number="state.end_verse" type="number" :min="1" :max="maxEndVerse" class="w-full" />
      </div>
      <p v-if="rangeSummary" class="mt-1.5 text-xs text-muted">
        {{ rangeSummary }}
      </p>
    </UFormField>
  </UForm>
</template>
