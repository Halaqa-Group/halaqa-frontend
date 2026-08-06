<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { isValidVerseRange, totalVersesInRange } from '~/utils/quran'
import type { CreatePlanItemDto } from '~/composables/useWeeklyPlan'
import { defaultSessionRange } from '~/utils/plan'

const emit = defineEmits<{ saved: [] }>()

const { t, locale } = useI18n()
const toast = useToast()
const apiError = useApiError()
const { editing, isSaving, dateOfDay, selectedStudentDirection, addItem, updateItem } = useWeeklyPlan()

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
  ...defaultSessionRange(selectedStudentDirection.value)
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
    // A fresh item opens where the student's memorization direction points — the
    // last surah going backwards, the first one going forwards.
    state.day_of_week = 0
    state.track_type = 'Hifz'
    Object.assign(state, defaultSessionRange(selectedStudentDirection.value))
  }
}
watch(editing, hydrate, { immediate: true })

const dayItems = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = dateOfDay(i)
    let label = String(i)
    try {
      label = d.toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : locale.value, { weekday: 'long', numberingSystem: 'latn' })
    } catch { /* fall back to the numeric day label */ }
    return { label, value: i }
  })
)
const trackItems = computed(() => (['Hifz', 'Near', 'Far'] as TrackKey[]).map(v => ({ label: t(`pages.achievements.tracks.${v}`), value: v })))

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
    toast.add({ title: apiError.format(e, t('pages.planner.saveErrorTitle')), color: 'error' })
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
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="space-y-1">
          <span class="text-xs font-medium text-muted">{{ t('pages.planner.cell.startLabel') }}</span>
          <PlannerAyahSelect v-model:surah="state.start_surah" v-model:verse="state.start_verse" />
        </div>
        <div class="space-y-1">
          <span class="text-xs font-medium text-muted">{{ t('pages.planner.cell.endLabel') }}</span>
          <PlannerAyahSelect
            v-model:surah="state.end_surah"
            v-model:verse="state.end_verse"
            :snap-to="selectedStudentDirection === 'desc' ? 'last' : 'first'"
          />
        </div>
      </div>
      <p v-if="rangeSummary" class="mt-1.5 text-xs text-muted">
        {{ rangeSummary }}
      </p>
    </UFormField>
  </UForm>
</template>
