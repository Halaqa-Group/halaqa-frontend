<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { LazyCommonConfirmDialog } from '#components'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { SURAH_NAMES, TRACK_TYPES } from '~/data/constants'
import { isValidVerseRange, totalVersesInRange, formatVerseRange, VERSE_COUNTS } from '~/utils/quran'
import { computePercentageScore } from '~/utils/score'
import { TRACK_BADGE_COLOR, type AchievementTrack } from '~/utils/achievement'
import type { ApiWeeklyPlanItem, CreateAchievementDto } from '~/types'

const emit = defineEmits<{ saved: [] }>()

const { t, locale } = useI18n()
const toast = useToast()
const overlay = useOverlay()
const { selectedHalaqaId } = useGlobalHalaqa()
const {
  students, editing, duplicateFrom, prefillStudentId, selectedDate, currentEvaluationSettings,
  isSaving, addAchievement, updateAchievement, loadEvaluationSettings
} = useAchievements()
// Warm the QUL word-id / juz / hizb lookup used to synthesize errors[] on submit.
useQuranWords()

type TrackKey = 'Hifz' | 'Near' | 'Far'

const isEdit = computed(() => editing.value != null)

// Set by the "Save & recite" footer button before it submits the form.
const continueToRecite = ref(false)

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
  harakat_errors_count: number
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
  harakat_errors_count: 0,
  teacher_notes: ''
})

// When true, the track + range are entered by hand; otherwise they come from a
// picked plan item. selectedPlanItemId tracks which plan lesson is chosen.
const selectedPlanItemId = ref<number | null>(null)
const manualRange = ref(false)

function hydrate() {
  const src = editing.value ?? duplicateFrom.value
  selectedPlanItemId.value = null
  // Editing/duplicating starts in manual mode so the existing range shows;
  // a fresh record prefers picking from the plan.
  manualRange.value = !!src
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
    state.harakat_errors_count = editing.value ? (src.harakat_errors_count ?? 0) : 0
    state.teacher_notes = editing.value ? (src.teacher_notes ?? '') : ''
    if (duplicateFrom.value) state.date = selectedDate.value
  } else {
    // A fresh record may be launched with a student already chosen (e.g. from
    // the planner's session-details dialog); fall back to an empty picker.
    state.student_id = prefillStudentId.value ?? undefined
    state.date = selectedDate.value
    state.track_type = 'Hifz'
    state.start_surah = 1
    state.start_verse = 1
    state.end_surah = 1
    state.end_verse = 7
    state.mistakes_count = 0
    state.warnings_count = 0
    state.tajweed_errors_count = 0
    state.harakat_errors_count = 0
    state.teacher_notes = ''
  }
}
watch([editing, duplicateFrom], hydrate, { immediate: true })

// ── The selected student's plan for the chosen day ────────────────────────────
// So the teacher picks the planned lesson instead of re-typing the range.
const { items: planItems, loading: planLoading } = useTodayPlanItems(
  () => state.student_id ?? null,
  () => selectedHalaqaId.value ?? null,
  () => state.date
)

function pickPlanItem(it: ApiWeeklyPlanItem) {
  state.track_type = it.track_type
  state.start_surah = it.start_surah
  state.start_verse = it.start_verse
  state.end_surah = it.end_surah
  state.end_verse = it.end_verse
  selectedPlanItemId.value = it.id
  manualRange.value = false
}

// Drop a stale selection when the plan list changes (student/date switch).
watch(planItems, (items) => {
  if (selectedPlanItemId.value != null && !items.some(i => i.id === selectedPlanItemId.value)) {
    selectedPlanItemId.value = null
  }
})

// Show the manual track + range inputs when there's no plan, or the teacher
// explicitly opted into manual entry. When editing, the lesson/range is fixed —
// it's shown read-only and can't be changed (only counts/notes are editable).
const showManual = computed(() => !isEdit.value && (manualRange.value || planItems.value.length === 0))
function planItemRange(it: ApiWeeklyPlanItem) {
  return formatVerseRange(it.start_surah, it.start_verse, it.end_surah, it.end_verse, SURAH_NAMES)
}

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
    tajweed_errors_count: state.tajweed_errors_count,
    harakat_errors_count: state.harakat_errors_count
  },
  currentEvaluationSettings.value
))
const scoreColor = computed(() =>
  scorePreview.value >= 90 ? 'text-success' : scorePreview.value >= 75 ? 'text-warning' : 'text-error'
)
const scoreBarColor = computed(() =>
  scorePreview.value >= 90 ? 'bg-success' : scorePreview.value >= 75 ? 'bg-warning' : 'bg-error'
)

const hasErrorCounts = computed(() =>
  state.mistakes_count + state.warnings_count + state.tajweed_errors_count + state.harakat_errors_count > 0
)

// "Save & recite" re-counts errors word-by-word on the mushaf, so any counts typed
// into the quick form would be discarded. Warn first and only proceed (zeroing the
// counts) if the teacher confirms.
function confirmReciteReset(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (v: boolean) => {
      if (!settled) {
        settled = true
        resolve(v)
      }
    }
    const modal = overlay.create(LazyCommonConfirmDialog, {
      destroyOnClose: true,
      props: {
        'open': true,
        'title': t('pages.achievements.reciteResetConfirm.title'),
        'message': t('pages.achievements.reciteResetConfirm.message'),
        'confirmLabel': t('pages.achievements.reciteResetConfirm.confirm'),
        'cancelLabel': t('common.cancel'),
        'icon': 'i-lucide-triangle-alert',
        'onUpdate:open': (v: boolean) => {
          if (!v) {
            modal.close()
            finish(false)
          }
        },
        'onConfirm': () => {
          modal.close()
          finish(true)
        }
      }
    })
    modal.open()
  })
}

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
  harakat_errors_count: z.number().min(0),
  teacher_notes: z.string().optional()
}).superRefine((val, ctx) => {
  if (val.student_id == null) {
    ctx.addIssue({ code: 'custom', path: ['student_id'], message: t('pages.achievements.validation.student') })
  }
  // A plan exists but the teacher hasn't picked a lesson and isn't in manual mode.
  if (planItems.value.length > 0 && !manualRange.value && selectedPlanItemId.value == null) {
    ctx.addIssue({ code: 'custom', path: ['lesson'], message: t('pages.achievements.validation.pickLesson') })
    return
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

  // Heading into the mushaf with counts already entered? Confirm the reset, then
  // zero them so the mushaf's word-level marking becomes the source of truth.
  if (continueToRecite.value && hasErrorCounts.value) {
    const ok = await confirmReciteReset()
    if (!ok) {
      continueToRecite.value = false
      return
    }
    state.mistakes_count = 0
    state.warnings_count = 0
    state.tajweed_errors_count = 0
    state.harakat_errors_count = 0
  }

  await loadEvaluationSettings(halaqaId)

  // The quick form captures error counts, not per-word locations; synthesize
  // itemized errors at the range's start word so the backend accepts them.
  const errors = await buildErrorsFromCounts(
    {
      mistakes_count: state.mistakes_count,
      warnings_count: state.warnings_count,
      tajweed_errors_count: state.tajweed_errors_count,
      harakat_errors_count: state.harakat_errors_count
    },
    state
  )

  const dto: CreateAchievementDto = {
    student_id: studentId,
    halaqa_id: halaqaId,
    date: state.date,
    track_type: state.track_type,
    completion_method: 'quick',
    recitation_method: 'full',
    start_surah: state.start_surah,
    start_verse: state.start_verse,
    end_surah: state.end_surah,
    end_verse: state.end_verse,
    errors,
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
    // "Save & recite": after a successful save, continue into the mushaf for
    // this student/date so the teacher can mark the recitation.
    if (continueToRecite.value) {
      continueToRecite.value = false
      await navigateTo({ path: '/recite', query: { student_id: studentId, halaqa_id: halaqaId, date: state.date } })
      return
    }
    emit('saved')
  } catch (e: any) {
    continueToRecite.value = false
    toast.add({
      title: isEdit.value ? t('pages.achievements.updateErrorTitle') : t('pages.achievements.saveErrorTitle'),
      description: e.data?.message || e.message,
      color: 'error'
    })
  }
}

// Exposed as a method (not the raw ref): a ref accessed through a template ref
// is unwrapped, so the parent can't assign `.value` to it.
function setContinueToRecite(value: boolean) {
  continueToRecite.value = value
}
defineExpose({ saving: isSaving, setContinueToRecite })
</script>

<template>
  <UForm
    id="achievement-form"
    :schema="schema"
    :state="state"
    class="space-y-5"
    @submit="onSubmit"
  >
    <!-- Who & when -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    </div>

    <!-- Pick the planned lesson so the range isn't re-typed. On edit the lesson
         is fixed and shown read-only below instead. -->
    <UFormField v-if="!isEdit" :label="t('pages.achievements.lessonFromPlan')" name="lesson">
      <div v-if="planLoading" class="flex items-center gap-2 text-xs text-muted">
        <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
        {{ t('common.loading') }}
      </div>
      <template v-else>
        <div v-if="planItems.length" class="grid grid-cols-3 gap-1.5">
          <button
            v-for="it in planItems"
            :key="it.id"
            type="button"
            class="flex flex-col gap-1 rounded-lg border p-2 text-start transition"
            :class="!manualRange && selectedPlanItemId === it.id
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-default hover:border-primary/60 hover:bg-elevated'"
            @click="pickPlanItem(it)"
          >
            <div class="flex items-center justify-between gap-1">
              <UBadge size="sm" variant="subtle" :color="TRACK_BADGE_COLOR[it.track_type as AchievementTrack]" class="min-w-0 truncate">
                {{ t(`pages.achievements.tracks.${it.track_type}`) }}
              </UBadge>
              <UIcon
                :name="!manualRange && selectedPlanItemId === it.id ? 'i-lucide-circle-check-big' : 'i-lucide-circle'"
                class="w-4 h-4 shrink-0"
                :class="!manualRange && selectedPlanItemId === it.id ? 'text-primary' : 'text-muted'"
              />
            </div>
            <p class="text-xs leading-tight">
              {{ planItemRange(it) }}
            </p>
          </button>
        </div>
        <p v-else class="text-xs text-muted">
          {{ t('pages.achievements.noPlanForDay') }}
        </p>

        <button
          v-if="planItems.length"
          type="button"
          class="mt-2 text-xs text-primary hover:underline"
          @click="manualRange = !manualRange"
        >
          {{ manualRange ? t('pages.achievements.usePlan') : t('pages.achievements.enterManually') }}
        </button>
      </template>
    </UFormField>

    <!-- Manual track + range (no plan, or the teacher opted in) -->
    <template v-if="showManual">
      <UFormField :label="t('pages.achievements.table.track')" name="track_type">
        <USelect v-model="state.track_type" :items="trackItems" value-key="value" class="w-full" />
      </UFormField>

      <UFormField :label="t('pages.achievements.table.range')" name="end_verse">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="space-y-1">
            <span class="text-xs font-medium text-muted">{{ t('pages.achievements.fromLabel') }}</span>
            <div class="grid grid-cols-2 gap-2">
              <USelectMenu v-model="state.start_surah" :items="surahItems" value-key="value" searchable class="w-full" />
              <UInput v-model.number="state.start_verse" type="number" :min="1" :max="maxStartVerse" class="w-full" />
            </div>
          </div>
          <div class="space-y-1">
            <span class="text-xs font-medium text-muted">{{ t('pages.achievements.toLabel') }}</span>
            <div class="grid grid-cols-2 gap-2">
              <USelectMenu v-model="state.end_surah" :items="surahItems" value-key="value" searchable class="w-full" />
              <UInput v-model.number="state.end_verse" type="number" :min="1" :max="maxEndVerse" class="w-full" />
            </div>
          </div>
        </div>
        <p v-if="rangeSummary" class="mt-1.5 text-xs text-muted">
          {{ rangeSummary }}
        </p>
      </UFormField>
    </template>

    <!-- Chosen lesson summary (read-only) — the fixed lesson when editing, or the
         picked plan item. Not editable. -->
    <UFormField v-else-if="isEdit || selectedPlanItemId != null" :label="t('pages.achievements.lessonFromPlan')" name="lesson">
      <div class="flex items-center justify-between gap-2 rounded-lg border border-default bg-elevated px-3 py-2.5">
        <span class="inline-flex items-center gap-2 text-sm font-medium min-w-0">
          <UBadge variant="subtle" :color="TRACK_BADGE_COLOR[state.track_type as AchievementTrack]" class="shrink-0">
            {{ t(`pages.achievements.tracks.${state.track_type}`) }}
          </UBadge>
          <span class="truncate">{{ formatVerseRange(state.start_surah, state.start_verse, state.end_surah, state.end_verse, SURAH_NAMES) }}</span>
        </span>
        <UIcon v-if="isEdit" name="i-lucide-lock" class="w-4 h-4 text-muted shrink-0" />
        <span v-else-if="rangeSummary" class="text-xs text-muted shrink-0">{{ rangeSummary }}</span>
      </div>
    </UFormField>

    <div class="rounded-xl border border-default overflow-hidden">
      <!-- Live result headline, computed from the error counts below it -->
      <div class="px-4 py-3 bg-elevated space-y-1.5">
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-sm font-medium text-muted">{{ t('pages.achievements.computedScore') }}</span>
          <span class="text-3xl font-bold tabular-nums leading-none" :class="scoreColor">
            {{ scorePreview }}<span class="text-base font-semibold">%</span>
          </span>
        </div>
        <div class="h-1.5 rounded-full bg-default overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="scoreBarColor"
            :style="{ width: `${scorePreview}%` }"
          />
        </div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5">
        <AchievementCounterField v-model="state.mistakes_count" :label="t('pages.achievements.mistakes')" />
        <AchievementCounterField v-model="state.warnings_count" :label="t('pages.achievements.warnings')" />
        <AchievementCounterField v-model="state.tajweed_errors_count" :label="t('pages.achievements.tajweedErrors')" />
        <AchievementCounterField v-model="state.harakat_errors_count" :label="t('pages.achievements.harakat')" />
      </div>
    </div>

    <UFormField :label="t('pages.achievements.notes')" name="teacher_notes">
      <UTextarea v-model="state.teacher_notes" :rows="3" :placeholder="t('pages.achievements.notesPlaceholder')" class="w-full" />
    </UFormField>
  </UForm>
</template>
