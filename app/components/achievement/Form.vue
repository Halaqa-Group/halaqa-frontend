<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { SURAH_NAMES, TRACK_TYPES } from '~/data/constants'
import { isValidVerseRange, totalVersesInRange, VERSE_COUNTS } from '~/utils/quran'
import { computePercentageScore } from '~/utils/score'
import type { CreateAchievementDto } from '~/types'

const emit = defineEmits<{ saved: [] }>()

const { t, locale } = useI18n()
const toast = useToast()
const { selectedHalaqaId } = useGlobalHalaqa()
const {
  students, editing, duplicateFrom, selectedDate, currentEvaluationSettings,
  isSaving, addAchievement, updateAchievement, loadEvaluationSettings
} = useAchievements()

type TrackKey = 'Hifz' | 'Near' | 'Far'

const isEdit = computed(() => editing.value != null)

const state = reactive<{
  student_id: number | undefined
  date: string
  track_type: TrackKey
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
  mistakes_count: number
  warnings_count: number
  tajweed_errors_count: number
  teacher_notes: string
}>({
  student_id: undefined,
  date: selectedDate.value,
  track_type: 'Hifz',
  start_surah: 1,
  start_verse: 1,
  end_surah: 1,
  end_verse: 7,
  mistakes_count: 0,
  warnings_count: 0,
  tajweed_errors_count: 0,
  teacher_notes: ''
})

function hydrate() {
  const src = editing.value ?? duplicateFrom.value
  if (src) {
    state.student_id = src.student_id
    state.date = src.date
    state.track_type = src.track_type
    state.start_surah = src.start_surah
    state.start_verse = src.start_verse
    state.end_surah = src.end_surah
    state.end_verse = src.end_verse
    state.mistakes_count = editing.value ? (src.mistakes_count ?? 0) : 0
    state.warnings_count = editing.value ? (src.warnings_count ?? 0) : 0
    state.tajweed_errors_count = editing.value ? (src.tajweed_errors_count ?? 0) : 0
    state.teacher_notes = editing.value ? (src.teacher_notes ?? '') : ''
    if (duplicateFrom.value) state.date = selectedDate.value
  } else {
    state.student_id = undefined
    state.date = selectedDate.value
    state.track_type = 'Hifz'
    state.start_surah = 1
    state.start_verse = 1
    state.end_surah = 1
    state.end_verse = 7
    state.mistakes_count = 0
    state.warnings_count = 0
    state.tajweed_errors_count = 0
    state.teacher_notes = ''
  }
}
watch([editing, duplicateFrom], hydrate, { immediate: true })

const studentItems = computed(() => students.value.map(s => ({ label: s.name, value: s.id })))
const trackItems = computed(() => TRACK_TYPES.map(tk => ({ label: t(`pages.achievements.tracks.${tk.value}`), value: tk.value })))
const surahItems = computed(() => Object.entries(SURAH_NAMES).map(([num, name]) => ({ value: Number(num), label: name })))

const maxStartVerse = computed(() => VERSE_COUNTS[state.start_surah] || 1)
const maxEndVerse = computed(() => VERSE_COUNTS[state.end_surah] || 1)

const rangeValid = computed(() =>
  isValidVerseRange(state.start_surah, state.start_verse, state.end_surah, state.end_verse)
)
const rangeSummary = computed(() => {
  if (!rangeValid.value.valid) return null
  const total = totalVersesInRange(state.start_surah, state.start_verse, state.end_surah, state.end_verse)
  return total > 0 ? t('pages.achievements.versesCount', { count: total }) : null
})

const scorePreview = computed(() => computePercentageScore(
  {
    mistakes_count: state.mistakes_count,
    warnings_count: state.warnings_count,
    tajweed_errors_count: state.tajweed_errors_count
  },
  currentEvaluationSettings.value
))
const scoreColor = computed(() =>
  scorePreview.value >= 90 ? 'text-success' : scorePreview.value >= 75 ? 'text-warning' : 'text-error'
)

const studentNameWhenEditing = computed(() =>
  students.value.find(s => s.id === state.student_id)?.name ?? `#${state.student_id}`
)

const calendarOpen = ref(false)
const calendarValue = computed(() => {
  const [y, m, d] = state.date.split('-').map(Number)
  return new CalendarDate(y!, m!, d!)
})
const maxCalendarValue = today(getLocalTimeZone())
const formattedDate = computed(() => {
  const [y, m, d] = state.date.split('-').map(Number)
  if (!y || !m || !d) return state.date
  try {
    return new Date(y, m - 1, d).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : locale.value, {
      day: 'numeric', month: 'long', year: 'numeric'
    })
  } catch {
    return state.date
  }
})
function onCalendarPick(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('year' in value)) return
  const v = value as { year: number, month: number, day: number }
  state.date = `${v.year}-${String(v.month).padStart(2, '0')}-${String(v.day).padStart(2, '0')}`
  calendarOpen.value = false
}

const schema = computed(() => z.object({
  student_id: z.number().optional(),
  date: z.string().min(1),
  track_type: z.enum(['Hifz', 'Near', 'Far']),
  mistakes_count: z.number().min(0),
  warnings_count: z.number().min(0),
  tajweed_errors_count: z.number().min(0),
  teacher_notes: z.string().optional()
}).superRefine((val, ctx) => {
  if (val.student_id == null) {
    ctx.addIssue({ code: 'custom', path: ['student_id'], message: t('pages.achievements.validation.student') })
  }
  const r = rangeValid.value
  if (!r.valid) {
    ctx.addIssue({ code: 'custom', path: ['end_verse'], message: r.error || t('pages.achievements.validation.range') })
  }
}))
type Schema = z.output<typeof schema.value>

async function onSubmit(_event: FormSubmitEvent<Schema>) {
  const halaqaId = selectedHalaqaId.value
  const studentId = state.student_id
  if (!halaqaId || studentId == null) return
  await loadEvaluationSettings(halaqaId)

  const dto: CreateAchievementDto = {
    student_id: studentId,
    halaqa_id: halaqaId,
    date: state.date,
    track_type: state.track_type,
    start_surah: state.start_surah,
    start_verse: state.start_verse,
    end_surah: state.end_surah,
    end_verse: state.end_verse,
    mistakes_count: state.mistakes_count,
    warnings_count: state.warnings_count,
    tajweed_errors_count: state.tajweed_errors_count,
    percentage_score: scorePreview.value,
    teacher_notes: state.teacher_notes || undefined
  }

  try {
    if (isEdit.value && editing.value) {
      await updateAchievement(editing.value.id, dto)
      toast.add({ title: t('pages.achievements.updatedToast'), color: 'success' })
    } else {
      await addAchievement(dto)
      toast.add({ title: t('pages.achievements.savedToast'), color: 'success' })
    }
    emit('saved')
  } catch (e: any) {
    toast.add({
      title: isEdit.value ? t('pages.achievements.updateErrorTitle') : t('pages.achievements.saveErrorTitle'),
      description: e.data?.message || e.message,
      color: 'error'
    })
  }
}

defineExpose({ saving: isSaving })
</script>

<template>
  <UForm
    id="achievement-form"
    :schema="schema"
    :state="state"
    class="space-y-5"
    @submit="onSubmit"
  >
    <UFormField :label="t('pages.achievements.table.student')" name="student_id" required>
      <div v-if="isEdit" class="flex items-center h-9 px-3 rounded-md border border-default bg-elevated text-sm text-muted">
        {{ studentNameWhenEditing }}
      </div>
      <USelectMenu
        v-else
        v-model="state.student_id"
        :items="studentItems"
        value-key="value"
        :placeholder="t('pages.achievements.selectStudent')"
        searchable
        class="w-full"
      />
    </UFormField>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField :label="t('pages.achievements.table.date')" name="date">
        <UPopover v-model:open="calendarOpen">
          <UButton
            variant="outline"
            color="neutral"
            icon="i-lucide-calendar-days"
            trailing-icon="i-lucide-chevron-down"
            class="w-full justify-between"
          >
            {{ formattedDate }}
          </UButton>
          <template #content>
            <UCalendar
              :model-value="calendarValue"
              :max-value="maxCalendarValue"
              color="primary"
              class="p-2"
              @update:model-value="onCalendarPick"
            />
          </template>
        </UPopover>
      </UFormField>

      <UFormField :label="t('pages.achievements.table.track')" name="track_type">
        <USelect v-model="state.track_type" :items="trackItems" value-key="value" class="w-full" />
      </UFormField>
    </div>

    <UFormField :label="t('pages.achievements.table.range')" name="end_verse">
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

    <div class="grid grid-cols-3 gap-3">
      <UFormField :label="t('pages.achievements.mistakes')" name="mistakes_count">
        <UInput v-model.number="state.mistakes_count" type="number" :min="0" class="w-full" />
      </UFormField>
      <UFormField :label="t('pages.achievements.warnings')" name="warnings_count">
        <UInput v-model.number="state.warnings_count" type="number" :min="0" class="w-full" />
      </UFormField>
      <UFormField :label="t('pages.achievements.tajweedErrors')" name="tajweed_errors_count">
        <UInput v-model.number="state.tajweed_errors_count" type="number" :min="0" class="w-full" />
      </UFormField>
    </div>

    <div class="flex items-center justify-between rounded-lg border border-default bg-elevated px-4 py-2.5">
      <span class="text-sm font-medium text-muted">{{ t('pages.achievements.computedScore') }}</span>
      <span class="text-xl font-bold tabular-nums" :class="scoreColor">{{ scorePreview }}%</span>
    </div>

    <UFormField :label="t('pages.achievements.notes')" name="teacher_notes">
      <UTextarea v-model="state.teacher_notes" :rows="3" :placeholder="t('pages.achievements.notesPlaceholder')" class="w-full" />
    </UFormField>
  </UForm>
</template>
