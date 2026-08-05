<script setup lang="ts">
import * as z from 'zod'
import { useOnline } from '@vueuse/core'
import type { FormSubmitEvent } from '@nuxt/ui'
import { LazyCommonConfirmDialog } from '#components'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { SURAH_NAMES, TRACK_TYPES } from '~/data/constants'
import { isValidVerseRange, totalVersesInRange, formatVerseRange } from '~/utils/quran'
import { verseToGlobal } from '~/utils/quran-structure'
import { computePercentageScore, type ScoreCounts } from '~/utils/score'
import { TRACK_BADGE_COLOR, type AchievementTrack } from '~/utils/achievement'
import { defaultSessionRange, planDirectionOf } from '~/utils/plan'
import type { AchievementTestPosition, ApiWeeklyPlanItem, CreateAchievementDto, RecitationMethod } from '~/types'

const emit = defineEmits<{ saved: [] }>()

const { t, locale } = useI18n()
const toast = useToast()
const apiError = useApiError()
const overlay = useOverlay()
const online = useOnline()
const { selectedHalaqaId } = useGlobalHalaqa()
const {
  students, editing, duplicateFrom, prefillStudentId, prefillPlanItem, selectedDate, currentEvaluationSettings,
  isSaving, addAchievement, updateAchievement, approveAchievement, loadEvaluationSettings
} = useAchievements()
// Warm the QUL word-id / juz / hizb lookup used to synthesize errors[] on submit.
useQuranWords()

type TrackKey = 'Hifz' | 'Near' | 'Far'

const isEdit = computed(() => editing.value != null)
// Launched from the planner's cell dialog: the lesson is already chosen there, so
// we hide the "الجلسة (من خطة اليوم)" picker and show the track + range as editable
// inputs pre-filled from that session (the teacher can still tweak them).
const fromPlanner = computed(() => prefillPlanItem.value != null)

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
  harakat_errors_count: 0,
  teacher_notes: ''
})

// ── Tested positions (مواضع) ────────────────────────────────────────────────
// The mushaf flow lets the teacher tap out the passages a student was tested on;
// this is the same idea for the quick form — each موضع is a sub-range of the
// lesson carrying its own error counts. `full` keeps the single counters block.
interface PositionRow {
  id: string
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
  mistakes_count: number
  warnings_count: number
  harakat_errors_count: number
}

const recitationMethod = ref<RecitationMethod>('full')
const positions = ref<PositionRow[]>([])
let positionSeq = 0

// New memorization is always recited in full — same rule the mushaf enforces.
const canTest = computed(() => state.track_type !== 'Hifz')
watch(() => state.track_type, (track) => {
  if (track === 'Hifz') recitationMethod.value = 'full'
})

function newPositionRow(counts?: Partial<ScoreCounts>): PositionRow {
  return {
    id: `pos-${++positionSeq}`,
    // Seed with the lesson range so a fresh موضع is valid before it's narrowed.
    start_surah: state.start_surah,
    start_verse: state.start_verse,
    end_surah: state.end_surah,
    end_verse: state.end_verse,
    mistakes_count: counts?.mistakes_count ?? 0,
    warnings_count: counts?.warnings_count ?? 0,
    harakat_errors_count: counts?.harakat_errors_count ?? 0
  }
}

function addPosition() {
  positions.value = [...positions.value, newPositionRow()]
}
function removePosition(id: string) {
  positions.value = positions.value.filter(p => p.id !== id)
}

// A موضع has to sit inside the achievement's own range — the API rejects
// anything outside it ("Each test position must fall within the achievement
// verse range"), so catch it here instead of on submit.
function positionWithinLesson(p: PositionRow): boolean {
  const lo = verseToGlobal(state.start_surah, state.start_verse)
  const hi = verseToGlobal(state.end_surah, state.end_verse)
  return verseToGlobal(p.start_surah, p.start_verse) >= lo
    && verseToGlobal(p.end_surah, p.end_verse) <= hi
}

const isTest = computed(() => recitationMethod.value === 'test')

// When true, the track + range are entered by hand; otherwise they come from a
// picked plan item. selectedPlanItemId tracks which plan lesson is chosen.
const selectedPlanItemId = ref<number | null>(null)
const manualRange = ref(false)

// A lesson handed in from the planner's cell dialog. It's injected into the
// picker and kept selected even when its weekday differs from the record date
// (the day-filtered plan list wouldn't otherwise include it). prefilledStudentId
// scopes it to the student it was chosen for, so switching student drops it.
type PickerItem = Pick<ApiWeeklyPlanItem, 'id' | 'track_type' | 'start_surah' | 'start_verse' | 'end_surah' | 'end_verse'>
const prefilledItem = ref<PickerItem | null>(null)
const prefilledStudentId = ref<number | null>(null)

// Which end of the mushaf an un-picked range starts from: the student's own
// `memorization_direction` (`descending` → An-Nas), not a fixed Al-Fatihah.
const studentDirection = computed(() =>
  planDirectionOf(students.value.find(s => s.id === state.student_id)?.memorizationDirection)
)
function applyDefaultRange() {
  Object.assign(state, defaultSessionRange(studentDirection.value))
}

// Restore the tested positions of an existing record. Duplicating keeps the
// passages but drops their counts — same rule the top-level counters follow.
function hydratePositions() {
  const src = editing.value ?? duplicateFrom.value
  const keepCounts = editing.value != null
  if (src?.recitation_method === 'test' && src.recitation_positions?.length) {
    recitationMethod.value = 'test'
    positions.value = src.recitation_positions.map(p => ({
      id: `pos-${++positionSeq}`,
      start_surah: p.start_surah,
      start_verse: p.start_verse,
      end_surah: p.end_surah,
      end_verse: p.end_verse,
      mistakes_count: keepCounts ? (p.mistakes_count ?? 0) : 0,
      warnings_count: keepCounts ? (p.warnings_count ?? 0) : 0,
      harakat_errors_count: keepCounts ? (p.harakat_errors_count ?? 0) : 0
    }))
  } else {
    recitationMethod.value = 'full'
    positions.value = []
  }
}

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
    state.harakat_errors_count = editing.value ? (src.harakat_errors_count ?? 0) : 0
    state.teacher_notes = editing.value ? (src.teacher_notes ?? '') : ''
    if (duplicateFrom.value) state.date = selectedDate.value
  } else {
    // A fresh record may be launched from the planner's session-details dialog
    // with the student and lesson already chosen; otherwise fall back to an
    // empty picker.
    const pref = prefillPlanItem.value
    state.student_id = prefillStudentId.value ?? undefined
    state.date = selectedDate.value
    if (pref) {
      // Show the clicked session's track and range as editable inputs, pre-filled,
      // so the teacher can see and tweak them (incl. end_verse) before saving.
      state.track_type = pref.track_type
      state.start_surah = pref.start_surah
      state.start_verse = pref.start_verse
      state.end_surah = pref.end_surah
      state.end_verse = pref.end_verse
      manualRange.value = true
      // Keep the lesson selected in the picker. When it sits on another weekday
      // it's injected into pickerItems (today's plan list wouldn't list it).
      if (pref.id != null) {
        selectedPlanItemId.value = pref.id
        prefilledItem.value = { id: pref.id, track_type: pref.track_type, start_surah: pref.start_surah, start_verse: pref.start_verse, end_surah: pref.end_surah, end_verse: pref.end_verse }
        prefilledStudentId.value = state.student_id ?? null
      } else {
        prefilledItem.value = null
      }
    } else {
      prefilledItem.value = null
      state.track_type = 'Hifz'
      applyDefaultRange()
    }
    state.mistakes_count = 0
    state.warnings_count = 0
    state.harakat_errors_count = 0
    state.teacher_notes = ''
  }
  hydratePositions()
}
watch([editing, duplicateFrom], hydrate, { immediate: true })

// ── The selected student's plan for the chosen day ────────────────────────────
// So the teacher picks the planned lesson instead of re-typing the range.
const { items: planItems, loading: planLoading } = useTodayPlanItems(
  () => state.student_id ?? null,
  () => selectedHalaqaId.value ?? null,
  () => state.date
)

function pickPlanItem(it: PickerItem) {
  // Load the lesson's track + range into the editable inputs so the teacher can
  // see and adjust them before saving (rather than a read-only summary).
  state.track_type = it.track_type
  state.start_surah = it.start_surah
  state.start_verse = it.start_verse
  state.end_surah = it.end_surah
  state.end_verse = it.end_verse
  selectedPlanItemId.value = it.id
  manualRange.value = true
}

// The plan list is filtered to the record date's weekday, so a lesson handed in
// from the planner (which may sit on another weekday) is merged in while it's the
// active selection — keeping it visible and selected in the picker.
const pickerItems = computed<PickerItem[]>(() => {
  const items = planItems.value
  const pref = prefilledItem.value
  if (pref && selectedPlanItemId.value === pref.id && !items.some(i => i.id === pref.id)) {
    return [pref, ...items]
  }
  return items
})

// Drop a stale selection when the plan list changes (student/date switch), but
// keep the planner-handed lesson even though it isn't in the day's plan list.
watch(planItems, (items) => {
  if (
    selectedPlanItemId.value != null
    && selectedPlanItemId.value !== prefilledItem.value?.id
    && !items.some(i => i.id === selectedPlanItemId.value)
  ) {
    selectedPlanItemId.value = null
  }
})

// The planner-handed lesson belongs to one student; switching student drops it.
watch(() => state.student_id, (sid) => {
  if (prefilledItem.value && sid !== prefilledStudentId.value) {
    prefilledItem.value = null
    if (selectedPlanItemId.value != null && !planItems.value.some(i => i.id === selectedPlanItemId.value)) {
      selectedPlanItemId.value = null
    }
  }
  // No lesson chosen yet, so the range is still a default — re-seed it from the
  // new student's direction rather than leaving the previous student's end of the
  // mushaf in place.
  if (!isEdit.value && !fromPlanner.value && !manualRange.value && selectedPlanItemId.value == null) {
    applyDefaultRange()
  }
})

// Show the manual track + range inputs when there's no plan, or the teacher
// explicitly opted into manual entry. When editing, the lesson/range is fixed —
// it's shown read-only and can't be changed (only counts/notes are editable).
// Editable track + range inputs: shown for manual entry, when there's no plan, or
// when launched from the planner (picker hidden, but the range stays editable).
const showManual = computed(() => !isEdit.value && (fromPlanner.value || manualRange.value || pickerItems.value.length === 0))
function planItemRange(it: PickerItem) {
  return formatVerseRange(it.start_surah, it.start_verse, it.end_surah, it.end_verse, SURAH_NAMES)
}

const studentItems = computed(() => students.value.map(s => ({ label: s.name, value: s.id })))
const trackItems = computed(() => TRACK_TYPES.map(tk => ({ label: t(`pages.achievements.tracks.${tk.value}`), value: tk.value })))

const rangeValid = computed(() =>
  isValidVerseRange(state.start_surah, state.start_verse, state.end_surah, state.end_verse)
)
const rangeSummary = computed(() => {
  if (!rangeValid.value.valid) return null
  const total = totalVersesInRange(state.start_surah, state.start_verse, state.end_surah, state.end_verse)
  return total > 0 ? t('pages.achievements.versesCount', { count: total }) : null
})

// How much of the mushaf the lesson range covers, in pages — the same measure the
// score divides by. Fractional (half a page is 0.5), so show one decimal unless
// it lands on a whole page.
const rangePagesSummary = computed(() => {
  if (!rangeValid.value.valid) return null
  const pages = pageCoverage(state)
  if (!(pages > 0)) return null
  const rounded = Math.round(pages * 10) / 10
  return t('pages.achievements.pagesCount', {
    count: Number.isInteger(rounded) ? rounded : rounded.toFixed(1)
  })
})

// Weights are per mushaf page, so the pages actually recited scale the deduction:
// the lesson range for `full`, the sum of the مواضع (fractional) for `test`.
const rangePages = computed(() =>
  pagesRecited(state, isTest.value ? positions.value : null)
)

// `test` scores off the sum of every موضع; `full` off the single counters block.
const effectiveCounts = computed<ScoreCounts>(() => {
  if (!isTest.value) {
    return {
      mistakes_count: state.mistakes_count,
      warnings_count: state.warnings_count,
      harakat_errors_count: state.harakat_errors_count
    }
  }
  return positions.value.reduce<ScoreCounts>((acc, p) => ({
    mistakes_count: acc.mistakes_count + p.mistakes_count,
    warnings_count: acc.warnings_count + p.warnings_count,
    harakat_errors_count: acc.harakat_errors_count + p.harakat_errors_count
  }), { mistakes_count: 0, warnings_count: 0, harakat_errors_count: 0 })
})

const scorePreview = computed(() => computePercentageScore(
  effectiveCounts.value,
  currentEvaluationSettings.value,
  rangePages.value
))
const scoreColor = computed(() =>
  scorePreview.value >= 90 ? 'text-success' : scorePreview.value >= 75 ? 'text-warning' : 'text-error'
)
const scoreBarColor = computed(() =>
  scorePreview.value >= 90 ? 'bg-success' : scorePreview.value >= 75 ? 'bg-warning' : 'bg-error'
)

const hasErrorCounts = computed(() => {
  const c = effectiveCounts.value
  return c.mistakes_count + c.warnings_count + c.harakat_errors_count > 0
})

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
  harakat_errors_count: z.number().min(0),
  teacher_notes: z.string().optional()
}).superRefine((val, ctx) => {
  if (val.student_id == null) {
    ctx.addIssue({ code: 'custom', path: ['student_id'], message: t('pages.achievements.validation.student') })
  }
  // A plan exists but the teacher hasn't picked a lesson and isn't in manual mode.
  // Skip when the lesson came from the planner (it's fixed, the picker is hidden).
  if (planItems.value.length > 0 && !manualRange.value && !fromPlanner.value && selectedPlanItemId.value == null) {
    ctx.addIssue({ code: 'custom', path: ['lesson'], message: t('pages.achievements.validation.pickLesson') })
    return
  }
  const r = rangeValid.value
  if (!r.valid) {
    ctx.addIssue({ code: 'custom', path: ['end_verse'], message: r.error || t('pages.achievements.validation.range') })
    return
  }
  if (!isTest.value) return
  if (positions.value.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['positions'], message: t('pages.achievements.validation.needPosition') })
    return
  }
  for (const p of positions.value) {
    const pr = isValidVerseRange(p.start_surah, p.start_verse, p.end_surah, p.end_verse)
    if (!pr.valid) {
      ctx.addIssue({ code: 'custom', path: ['positions'], message: pr.error || t('pages.achievements.validation.range') })
      return
    }
    if (!positionWithinLesson(p)) {
      ctx.addIssue({ code: 'custom', path: ['positions'], message: t('pages.achievements.validation.positionOutOfRange') })
      return
    }
  }
}))
type Schema = z.output<typeof schema.value>

// The form drives three distinct actions, chosen by the footer button that
// submitted it:
//   • Update      — editing an existing record (isEdit)
//   • Save & recite — hand off to the mushaf to mark the recitation (continueToRecite)
//   • Approve     — record straight from the form and sign it off
// Each is its own helper below; onSubmit only routes between them.

// Zero every error count (top-level and per موضع). Used before handing off to
// the mushaf, where word-level marking becomes the source of truth.
function resetErrorCounts() {
  state.mistakes_count = 0
  state.warnings_count = 0
  state.harakat_errors_count = 0
  positions.value = positions.value.map(p => ({
    ...p, mistakes_count: 0, warnings_count: 0, harakat_errors_count: 0
  }))
}

// Build the create/update DTO from the form. The quick form captures error
// counts, not per-word locations, so synthesize itemized errors at the start
// word of whichever range owns them — the lesson range for `full`, each موضع's
// own range for `test`. `toRecite` stamps the source: the recitation button
// hands off to the mushaf, so its record is a mushaf one (source = Quran);
// every other path keeps the form as the source (source = Form).
async function buildAchievementDto(studentId: number, halaqaId: number, toRecite: boolean): Promise<CreateAchievementDto> {
  const dto: CreateAchievementDto = {
    student_id: studentId,
    halaqa_id: halaqaId,
    date: state.date,
    track_type: state.track_type,
    completion_method: toRecite ? 'mushaf' : 'quick',
    recitation_method: isTest.value ? 'test' : 'full',
    start_surah: state.start_surah,
    start_verse: state.start_verse,
    end_surah: state.end_surah,
    end_verse: state.end_verse,
    percentage_score: scorePreview.value,
    teacher_notes: state.teacher_notes || undefined
  }

  if (isTest.value) {
    const built: AchievementTestPosition[] = []
    for (const p of positions.value) {
      built.push({
        start_surah: p.start_surah,
        start_verse: p.start_verse,
        end_surah: p.end_surah,
        end_verse: p.end_verse,
        errors: await buildErrorsFromCounts({
          mistakes_count: p.mistakes_count,
          warnings_count: p.warnings_count,
          harakat_errors_count: p.harakat_errors_count
        }, p)
      })
    }
    dto.test_positions = built
  } else {
    dto.errors = await buildErrorsFromCounts({
      mistakes_count: state.mistakes_count,
      warnings_count: state.warnings_count,
      harakat_errors_count: state.harakat_errors_count
    }, state)
  }
  return dto
}

// "Save & recite": persist the record (as a mushaf recitation) and continue into
// the mushaf so the teacher can mark it. The reader owns the session — and
// offline drafting — so we don't create here when offline (that would
// double-draft the session).
async function saveAndRecite(dto: CreateAchievementDto, studentId: number, halaqaId: number) {
  if (online.value) await addAchievement(dto)
  // Carry the chosen session so the mushaf opens on that exact lesson (the recite
  // page hides its session switcher and relies on this). The track + range are
  // passed explicitly, not just item_id: the session may sit on a different
  // week/weekday than the record date (a future-dated planned lesson recorded
  // today), so the recite page can't look it up in that day's plan.
  const query: Record<string, string | number> = {
    student_id: studentId,
    halaqa_id: halaqaId,
    date: state.date,
    track: state.track_type,
    start_surah: state.start_surah,
    start_verse: state.start_verse,
    end_surah: state.end_surah,
    end_verse: state.end_verse
  }
  if (selectedPlanItemId.value != null) query.item_id = selectedPlanItemId.value
  await navigateTo({ path: '/recite', query })
}

// "Approve achievement": record straight from the form and sign it off. Online
// it approves on the spot; offline it's saved as a draft (approve intent carried
// on the draft, applied on sync).
async function recordAndApprove(dto: CreateAchievementDto) {
  const created = await addAchievement(dto, true)
  if (created) {
    // Recording and approving are the same halaqa-scope check, so if the create
    // succeeded this cannot 403.
    await approveAchievement(created.id)
    toast.add({ title: t('pages.achievements.approvedToast'), color: 'success' })
  } else {
    toast.add({ title: t('pages.achievements.savedOfflineToast'), color: 'success', icon: 'i-lucide-cloud-off' })
  }
}

async function onSubmit(_event: FormSubmitEvent<Schema>) {
  const halaqaId = selectedHalaqaId.value
  const studentId = state.student_id
  if (!halaqaId || studentId == null) return

  // `continueToRecite` is a one-shot flag set by the footer button before submit;
  // consume it up front so every path below reads a stable intent.
  const toRecite = continueToRecite.value
  continueToRecite.value = false

  // Heading into the mushaf with counts already entered? Confirm the reset before
  // discarding them.
  if (toRecite && hasErrorCounts.value) {
    const ok = await confirmReciteReset()
    if (!ok) return
    resetErrorCounts()
  }

  await loadEvaluationSettings(halaqaId)
  const dto = await buildAchievementDto(studentId, halaqaId, toRecite)

  try {
    if (isEdit.value && editing.value) {
      await updateAchievement(editing.value.id, dto)
      toast.add({ title: t('pages.achievements.updatedToast'), color: 'success' })
    } else if (toRecite) {
      await saveAndRecite(dto, studentId, halaqaId)
      return
    } else {
      await recordAndApprove(dto)
    }
    emit('saved')
  } catch (e: any) {
    toast.add({
      title: apiError.format(e, isEdit.value ? t('pages.achievements.updateErrorTitle') : t('pages.achievements.saveErrorTitle')),
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
        <CommonWheelSelect
          v-else
          v-model="state.student_id"
          :items="studentItems"
          :placeholder="t('pages.achievements.selectStudent')"
          :aria-label="t('pages.achievements.selectStudent')"
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

    <!-- Pick the planned lesson so the range isn't re-typed. Hidden on edit (lesson
         fixed, read-only below) and when launched from the planner (the session's
         track + range show as editable inputs below instead). -->
    <UFormField v-if="!isEdit && !fromPlanner" :label="t('pages.achievements.lessonFromPlan')" name="lesson">
      <div v-if="planLoading" class="flex items-center gap-2 text-xs text-muted">
        <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
        {{ t('common.loading') }}
      </div>
      <template v-else>
        <div v-if="pickerItems.length" class="grid grid-cols-3 gap-1.5">
          <button
            v-for="it in pickerItems"
            :key="it.id"
            type="button"
            class="flex flex-col gap-1 rounded-lg border p-2 text-start transition"
            :class="selectedPlanItemId === it.id
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-default hover:border-primary/60 hover:bg-elevated'"
            @click="pickPlanItem(it)"
          >
            <div class="flex items-center justify-between gap-1">
              <UBadge size="sm" variant="subtle" :color="TRACK_BADGE_COLOR[it.track_type as AchievementTrack]" class="min-w-0 truncate">
                {{ t(`pages.achievements.tracks.${it.track_type}`) }}
              </UBadge>
              <UIcon
                :name="selectedPlanItemId === it.id ? 'i-lucide-circle-check-big' : 'i-lucide-circle'"
                class="w-4 h-4 shrink-0"
                :class="selectedPlanItemId === it.id ? 'text-primary' : 'text-muted'"
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
          v-if="pickerItems.length"
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
            <PlannerAyahSelect v-model:surah="state.start_surah" v-model:verse="state.start_verse" />
          </div>
          <div class="space-y-1">
            <span class="text-xs font-medium text-muted">{{ t('pages.achievements.toLabel') }}</span>
            <PlannerAyahSelect
              v-model:surah="state.end_surah"
              v-model:verse="state.end_verse"
              :snap-to="studentDirection === 'desc' ? 'last' : 'first'"
            />
          </div>
        </div>
        <p v-if="rangeSummary" class="mt-1.5 text-xs text-muted">
          {{ rangeSummary }}
          <span v-if="rangePagesSummary"> · {{ rangePagesSummary }}</span>
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
        <span class="inline-flex items-center gap-2 shrink-0">
          <span v-if="rangeSummary" class="text-xs text-muted">
            {{ rangeSummary }}<template v-if="rangePagesSummary"> · {{ rangePagesSummary }}</template>
          </span>
          <UIcon v-if="isEdit" name="i-lucide-lock" class="w-4 h-4 text-muted" />
        </span>
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
      <!-- Recitation method: full, or tested at chosen مواضع (mirrors the mushaf). -->
      <div v-if="canTest" class="grid grid-cols-2 gap-1.5 p-2.5 pb-0">
        <button
          v-for="m in (['full', 'test'] as const)"
          :key="m"
          type="button"
          class="rounded-lg border px-3 py-2 text-sm font-medium transition"
          :class="recitationMethod === m
            ? 'border-primary bg-primary/5 ring-1 ring-primary text-primary'
            : 'border-default hover:border-primary/60 hover:bg-elevated'"
          @click="recitationMethod = m"
        >
          {{ t(`pages.achievements.recitationMethods.${m}`) }}
        </button>
      </div>
      <p v-else class="px-3 pt-2.5 text-xs text-muted">
        {{ t('pages.achievements.fullRequiredForHifz') }}
      </p>

      <!-- full: one set of counters for the whole lesson -->
      <div v-if="!isTest" class="grid grid-cols-3 gap-2 p-2.5">
        <AchievementCounterField v-model="state.mistakes_count" :label="t('pages.achievements.mistakes')" />
        <AchievementCounterField v-model="state.warnings_count" :label="t('pages.achievements.warnings')" />
        <AchievementCounterField v-model="state.harakat_errors_count" :label="t('pages.achievements.harakat')" />
      </div>

      <!-- test: one card per موضع, each with its own range and counters -->
      <UFormField v-else name="positions" class="block p-2.5">
        <div class="space-y-2">
          <div
            v-for="(p, i) in positions"
            :key="p.id"
            class="rounded-lg border border-default bg-default p-2.5 space-y-2"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold">
                {{ t('pages.achievements.positionN', { n: i + 1 }) }}
              </span>
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                square
                :aria-label="t('pages.achievements.removePosition')"
                @click="removePosition(p.id)"
              />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div class="space-y-1">
                <span class="text-[11px] font-medium text-muted">{{ t('pages.achievements.fromLabel') }}</span>
                <PlannerAyahSelect v-model:surah="p.start_surah" v-model:verse="p.start_verse" />
              </div>
              <div class="space-y-1">
                <span class="text-[11px] font-medium text-muted">{{ t('pages.achievements.toLabel') }}</span>
                <PlannerAyahSelect v-model:surah="p.end_surah" v-model:verse="p.end_verse" />
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <AchievementCounterField v-model="p.mistakes_count" :label="t('pages.achievements.mistakes')" />
              <AchievementCounterField v-model="p.warnings_count" :label="t('pages.achievements.warnings')" />
              <AchievementCounterField v-model="p.harakat_errors_count" :label="t('pages.achievements.harakat')" />
            </div>
          </div>

          <p v-if="!positions.length" class="text-xs text-muted">
            {{ t('pages.achievements.noPositionsYet') }}
          </p>

          <UButton icon="i-lucide-plus" variant="soft" size="sm" block @click="addPosition">
            {{ t('pages.achievements.addPosition') }}
          </UButton>
        </div>
      </UFormField>
    </div>

    <UFormField :label="t('pages.achievements.notes')" name="teacher_notes">
      <UTextarea v-model="state.teacher_notes" :rows="3" :placeholder="t('pages.achievements.notesPlaceholder')" class="w-full" />
    </UFormField>
  </UForm>
</template>
