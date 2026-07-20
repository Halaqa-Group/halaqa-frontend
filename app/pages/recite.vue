<script setup lang="ts">
import { LazyCommonConfirmDialog } from '#components'
import { SURAH_NAMES, TRACK_TYPES } from '~/data/constants'
import { computePercentageScore } from '~/utils/score'
import { makeRangePredicate } from '~/utils/mushaf'
import { TRACK_BADGE_COLOR, type AchievementTrack } from '~/utils/achievement'
import type { AchievementTestPosition, ApiAchievement, ApiStudent, ApiWeeklyPlanItem, CreateAchievementDto, PositionError, RecitationMethod } from '~/types'
import type { MarkCounts, Severity } from '~/types/recitation'
import { toScoreCounts } from '~/types/recitation'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const apiError = useApiError()
const api = useApi()
const overlay = useOverlay()
const { activeRole } = useAuth()
const { loadEvaluationSettings } = useAchievements()
// Warm the QUL word-id / juz / hizb lookup so building errors[] on submit is instant.
useQuranWords()

const isParentReadOnly = computed(() => activeRole.value === 'parent')

const halaqaId = computed(() => {
  const v = Number(route.query.halaqa_id)
  return Number.isFinite(v) && v > 0 ? v : null
})
const studentId = computed(() => {
  const v = Number(route.query.student_id)
  return Number.isFinite(v) && v > 0 ? v : null
})
const dateStr = computed(() => {
  const q = route.query.date
  const v = Array.isArray(q) ? q[0] : q
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const student = ref<ApiStudent | null>(null)
const studentLoading = ref(false)

async function loadStudent() {
  if (!studentId.value || !halaqaId.value) {
    student.value = null
    return
  }
  studentLoading.value = true
  try {
    student.value = await api<ApiStudent>(`/students/${studentId.value}`)
  } catch {
    student.value = null
  } finally {
    studentLoading.value = false
  }
}
watch([studentId, halaqaId], loadStudent, { immediate: true })

const { items: todayItems, plan, loading: planLoading, error: planError }
  = useTodayPlanItems(studentId, halaqaId, dateStr)

// The session is chosen upstream (on the achievement) and carried in as item_id;
// there's no in-page switcher, so honour it and fall back to the first lesson.
const preferredItemId = computed(() => {
  const v = Number(route.query.item_id)
  return Number.isFinite(v) && v > 0 ? v : null
})

function queryInt(key: string): number | null {
  const q = route.query[key]
  const v = Number(Array.isArray(q) ? q[0] : q)
  return Number.isFinite(v) && v > 0 ? v : null
}

// When opened from the achievement form ("Save & recite"), the exact session —
// its track and verse range — is carried in the query. That session can live on
// any week/weekday (e.g. a future-dated planned lesson recorded today), so it may
// not appear in `todayItems`; honour it directly rather than looking it up in the
// record date's plan (which would otherwise fall back to today's first lesson).
const querySession = computed<ApiWeeklyPlanItem | null>(() => {
  const rawTrack = route.query.track
  const track = Array.isArray(rawTrack) ? rawTrack[0] : rawTrack
  if (track !== 'Hifz' && track !== 'Near' && track !== 'Far') return null
  const ss = queryInt('start_surah')
  const sv = queryInt('start_verse')
  const es = queryInt('end_surah')
  const ev = queryInt('end_verse')
  if (ss == null || sv == null || es == null || ev == null) return null
  return {
    id: preferredItemId.value ?? 0,
    day_of_week: 0,
    track_type: track,
    start_surah: ss,
    start_verse: sv,
    end_surah: es,
    end_verse: ev,
    total_verses: 0,
    achieved_verses: 0,
    status: 'due',
    is_manual_override: false
  }
})

const selectedItemId = ref<number | null>(null)
watch(todayItems, (items) => {
  if (!items.length) {
    selectedItemId.value = null
    return
  }
  if (!selectedItemId.value || !items.some(i => i.id === selectedItemId.value)) {
    selectedItemId.value = preferredItemId.value != null && items.some(i => i.id === preferredItemId.value)
      ? preferredItemId.value
      : items[0]!.id
  }
}, { immediate: true })

const selectedItem = computed<ApiWeeklyPlanItem | null>(() =>
  querySession.value ?? todayItems.value.find(i => i.id === selectedItemId.value) ?? null
)

// ── Recitation method (step 1) ──────────────────────────────────────────────
// Hifz (new memorization) is always a full recitation — no choice. Near/Far may
// be tested at chosen positions; that capture UI lands later, so `test` is
// disabled for now. The last method used on a testable track is remembered.
const currentTrack = computed(() => selectedItem.value?.track_type ?? null)
const lastTestableMethod = useLocalStorage<RecitationMethod>('recite:method', 'full')
const recitationMethod = ref<RecitationMethod>('full')
// In `test`, taps either define a spot's boundaries or mark errors inside it.
const captureMode = ref<'spot' | 'mark'>('spot')
watch(currentTrack, (track) => {
  recitationMethod.value = track === 'Hifz' ? 'full' : lastTestableMethod.value
  captureMode.value = 'spot'
}, { immediate: true })

function selectMethod(method: RecitationMethod) {
  recitationMethod.value = method
  if (method === 'test') captureMode.value = 'spot'
  // Hifz is locked; only remember the choice for testable tracks.
  if (currentTrack.value !== 'Hifz') lastTestableMethod.value = method
}

const showMethodSelector = computed(() =>
  !isParentReadOnly.value && !!selectedItem.value && currentTrack.value !== 'Hifz'
)
const isTest = computed(() => recitationMethod.value === 'test')

const PRELOAD_LIMIT = 3
const { pageFor } = useVerseToPage()

const pageRange = computed<number[]>(() => {
  const item = selectedItem.value
  if (!item) return []
  const start = pageFor(`${item.start_surah}:${item.start_verse}`)
  const end = pageFor(`${item.end_surah}:${item.end_verse}`)
  if (!start || !end || end < start) return []
  const out: number[] = []
  for (let p = start; p <= end; p++) out.push(p)
  return out
})

useHead(() => {
  const pages = pageRange.value
  if (!pages.length) return {}
  const preload = pages.slice(0, PRELOAD_LIMIT)
  const prefetch = pages.slice(PRELOAD_LIMIT)
  return {
    link: [
      ...preload.flatMap(p => [
        { rel: 'preload', as: 'fetch', href: `/quran/pages/${p}.json`, crossorigin: 'anonymous' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: `/quran/fonts/v1/p${p}.woff2`, crossorigin: 'anonymous' }
      ]),
      ...prefetch.flatMap(p => [
        { rel: 'prefetch', as: 'fetch', href: `/quran/pages/${p}.json`, crossorigin: 'anonymous' },
        { rel: 'prefetch', as: 'font', type: 'font/woff2', href: `/quran/fonts/v1/p${p}.woff2`, crossorigin: 'anonymous' }
      ])
    ]
  }
})

const priorAchievements = ref<ApiAchievement[]>([])
const priorLoading = ref(false)

async function loadPrior() {
  if (!studentId.value || !halaqaId.value) {
    priorAchievements.value = []
    return
  }
  priorLoading.value = true
  try {
    const raw = await api<ApiAchievement[] | { items: ApiAchievement[] }>(
      `/achievements?student_id=${studentId.value}&halaqa_id=${halaqaId.value}&date=${dateStr.value}`
    )
    priorAchievements.value = Array.isArray(raw) ? raw : (raw.items ?? [])
  } catch {
    priorAchievements.value = []
  } finally {
    priorLoading.value = false
  }
}
watch([studentId, halaqaId, dateStr], loadPrior, { immediate: true })

const sessionId = computed(() =>
  selectedItem.value && studentId.value
    ? `${studentId.value}:${dateStr.value}:${selectedItem.value.id}`
    : ''
)
const { marks, groups, counts, tap, setMarks, clearAll } = useRecitationSession(sessionId)

// ── Test-spot capture ───────────────────────────────────────────────────────
const lessonRange = computed(() =>
  selectedItem.value
    ? {
        startSurah: selectedItem.value.start_surah,
        startVerse: selectedItem.value.start_verse,
        endSurah: selectedItem.value.end_surah,
        endVerse: selectedItem.value.end_verse
      }
    : null
)
const { spots, pendingStart, pickBoundary, removeSpot, setSpots, clearSpots }
  = useTestSpots(sessionId, lessonRange)

const pendingVerseKey = computed(() =>
  pendingStart.value ? `${pendingStart.value.surah}:${pendingStart.value.verse}` : null
)

// True when a verse ("surah:ayah") falls inside any defined test-spot.
function inAnySpot(verseKey: string): boolean {
  return spots.value.some(s =>
    makeRangePredicate(s.startSurah, s.startVerse, s.endSurah, s.endVerse)(verseKey)
  )
}
// A word key is "surah:ayah:position"; its verse is the first two segments.
function wordInAnySpot(wordKey: string): boolean {
  const [s, a] = wordKey.split(':')
  return inAnySpot(`${s}:${a}`)
}

// In test mark-mode, only the tested spots stay lit; the rest of the lesson dims.
const spotHighlight = computed<((verseKey: string) => boolean) | undefined>(() =>
  isTest.value && captureMode.value === 'mark' ? inAnySpot : undefined
)

// Route a word tap: define a spot boundary (spot-mode), or mark an error — but in
// test mode only inside a defined spot (taps on dimmed, out-of-spot words are inert,
// so what's marked always matches what gets submitted).
function onWordTap(wordKey: string, verseKey: string) {
  if (isTest.value && captureMode.value === 'spot') {
    pickBoundary(verseKey)
    return
  }
  if (isTest.value && !wordInAnySpot(wordKey)) return
  tap(wordKey)
}
// Drag-select marking: in test mode keep only the in-spot words, so nothing marked
// outside a tested passage is silently dropped at submit.
function onWordsMark(keys: string[], severity: Severity | null) {
  const applied = isTest.value ? keys.filter(wordInAnySpot) : keys
  if (!applied.length) return
  setMarks(applied, severity)
}
// Drag-select marking is only meaningful when actually marking errors.
const canDragMark = computed(() => !isTest.value || captureMode.value === 'mark')

function spotLabel(s: { startSurah: number, startVerse: number, endSurah: number, endVerse: number }): string {
  return rangeLabel({
    start_surah: s.startSurah, start_verse: s.startVerse,
    end_surah: s.endSurah, end_verse: s.endVerse
  })
}

const canSubmit = computed(() =>
  !!selectedItem.value && (!isTest.value || spots.value.length > 0)
)

const captureHint = computed(() => {
  if (captureMode.value !== 'spot') return 'علّم الكلمات الخاطئة داخل المواضع'
  return pendingStart.value ? 'اضغط آخر كلمة في الموضع' : 'اضغط أول كلمة في الموضع'
})

// One-line breakdown of the four severity levels, reused in the confirm dialog
// and the success toasts.
function countsSummary(c: MarkCounts): string {
  return `${c.severe} جسيم، ${c.medium} متوسط، ${c.light} خفيف، ${c.minor} تنبيه`
}

// Confirm/success summary: tested-spot count for `test`, severity breakdown for `full`.
function submitSummary(): string {
  if (isTest.value) {
    const n = spots.value.length
    return `${n} ${n === 1 ? 'موضع مُختبَر' : 'مواضع مُختبَرة'}`
  }
  return counts.value.total === 0 ? 'تلاوة تامة بدون أخطاء ✓' : countsSummary(counts.value)
}

const submitting = ref(false)

// An achievement already recorded today for this exact session (same track +
// range). Re-submitting updates it instead of creating a duplicate.
function findExistingAchievement(item: ApiWeeklyPlanItem): ApiAchievement | null {
  return priorAchievements.value.find(a =>
    a.track_type === item.track_type
    && a.start_surah === item.start_surah && a.start_verse === item.start_verse
    && a.end_surah === item.end_surah && a.end_verse === item.end_verse
  ) ?? null
}

// The achievement backing the current session, and whether it's approved — the
// primary toolbar action turns into "unapprove" once it is.
const existingAchievement = computed(() =>
  selectedItem.value ? findExistingAchievement(selectedItem.value) : null
)
const isApproved = computed(() => existingAchievement.value?.status === 'approved')

// Marking is locked when there's nothing to edit: parents are always read-only,
// and an approved achievement is view-only until it's unapproved (the marks stay
// highlighted for review, but words can't be tapped/dragged and nothing cleared).
const markingLocked = computed(() => isParentReadOnly.value || isApproved.value)

// Reopening an existing recitation from the achievements list: the achievement id
// is carried in the query, so fetch its full detail (GET /achievements/{id}) and
// seed the mushaf with the errors it was recorded with — the teacher sees exactly
// what was marked. Local marks are wiped on submit, so a fresh visit would
// otherwise start blank. Only mushaf recitations carry real word positions
// (quick-entry errors are synthetic, all stacked at the range's start word). Seeds
// once, and never over marks the teacher has already started this visit.
const achievementId = computed(() => {
  const v = Number(route.query.achievement_id)
  return Number.isFinite(v) && v > 0 ? v : null
})
const hydratedFor = ref<number | null>(null)
async function hydrateFromAchievement(id: number) {
  if (isParentReadOnly.value || hydratedFor.value === id) return
  hydratedFor.value = id
  if (Object.keys(marks.value).length > 0) return

  let detail: ApiAchievement
  try {
    detail = await api<ApiAchievement>(`/achievements/${id}`)
  } catch {
    hydratedFor.value = null
    return
  }
  if (detail.completion_method !== 'mushaf') return

  const positions = detail.recitation_positions ?? []
  const runs = await buildMarkRunsFromErrors(positions.flatMap(p => p.errors ?? []))
  // Restore a partial test's tested spots + method so the view matches how it was
  // taken (marks outside a spot would otherwise be dimmed and look dropped).
  if (detail.recitation_method === 'test' && positions.length) {
    recitationMethod.value = 'test'
    captureMode.value = 'mark'
    setSpots(positions.map((p, i) => ({
      id: `restored-${id}-${i}`,
      startSurah: p.start_surah,
      startVerse: p.start_verse,
      endSurah: p.end_surah,
      endVerse: p.end_verse
    })))
  }
  for (const run of runs) setMarks(run.keys, run.severity)
}
watch([achievementId, selectedItem], () => {
  const id = achievementId.value
  if (id != null && selectedItem.value) void hydrateFromAchievement(id)
}, { immediate: true })

function onSubmitRequest() {
  const item = selectedItem.value
  if (!item || !studentId.value || !halaqaId.value) return

  const existing = findExistingAchievement(item)
  const verb = existing ? 'تحديث' : 'حفظ'
  const kind = isTest.value ? 'اختبار' : 'إنجاز'
  const modal = overlay.create(LazyCommonConfirmDialog, {
    destroyOnClose: true,
    props: {
      'open': true,
      'title': existing ? 'تأكيد تحديث الجلسة' : 'تأكيد حفظ الإنجاز',
      'message':
        `هل تريد ${verb} ${kind} ${trackLabel(item.track_type)} لـ${rangeLabel(item)}؟`
        + `\n${submitSummary()}.`,
      'confirmLabel': verb,
      'cancelLabel': 'إلغاء',
      'loading': false,
      'onUpdate:open': (v: boolean) => { if (!v) modal.close() },
      async onConfirm() {
        try {
          modal.patch({ loading: true })
          await postAchievement(item, studentId.value!, halaqaId.value!)
        } catch (e) {
          modal.patch({ loading: false })
          const err = e as { data?: { message?: string }, message?: string }
          toast.add({
            title: 'خطأ في حفظ الإنجاز',
            description: apiError.format(err, err.message || 'حدث خطأ غير معروف'),
            color: 'error',
            icon: 'i-lucide-alert-circle'
          })
          return
        }
        // Saved + approved. Closing and redirecting live OUTSIDE the try above so a
        // double-close (the dialog also self-closes on confirm) can't throw into the
        // catch and swallow the redirect. Use the setup-captured router, not
        // navigateTo — the Nuxt instance context is lost after the awaits.
        try { modal.close() } catch { /* dialog already closed */ }
        await router.push('/achievements')
      }
    }
  })
  modal.open()
}

// Toolbar primary action: approve a fresh/pending recitation, or unapprove one
// that's already approved.
function onToolbarSubmit() {
  if (isApproved.value) onUnapproveRequest()
  else onSubmitRequest()
}

function onUnapproveRequest() {
  const existing = existingAchievement.value
  if (!existing) return
  const modal = overlay.create(LazyCommonConfirmDialog, {
    destroyOnClose: true,
    props: {
      'open': true,
      'title': 'تأكيد إلغاء الاعتماد',
      'message': `هل تريد إلغاء اعتماد ${trackLabel(existing.track_type)} لـ${rangeLabel(existing)}؟`,
      'confirmLabel': 'إلغاء الاعتماد',
      'cancelLabel': 'إلغاء',
      'loading': false,
      'onUpdate:open': (v: boolean) => { if (!v) modal.close() },
      async onConfirm() {
        try {
          modal.patch({ loading: true })
          await unapproveExisting(existing.id)
        } catch (e) {
          modal.patch({ loading: false })
          const err = e as { data?: { message?: string }, message?: string }
          toast.add({
            title: 'خطأ في إلغاء الاعتماد',
            description: apiError.format(err, err.message || 'حدث خطأ غير معروف'),
            color: 'error',
            icon: 'i-lucide-alert-circle'
          })
          return
        }
        // Unapproved — stay on the page (marks unlock for editing). Guard the close
        // since the dialog also self-closes on confirm.
        try { modal.close() } catch { /* dialog already closed */ }
      }
    }
  })
  modal.open()
}

// Unapprove in place and reflect the new status locally, so the toolbar flips
// back to "approve" and the teacher can adjust the marks before re-approving.
async function unapproveExisting(id: number) {
  submitting.value = true
  try {
    const updated = await api<ApiAchievement>(`/achievements/${id}/unapprove`, { method: 'POST' })
    priorAchievements.value = priorAchievements.value.map(a => a.id === id ? { ...a, ...updated } : a)
    toast.add({
      title: 'تم إلغاء الاعتماد ✓',
      color: 'success',
      icon: 'i-lucide-undo-2'
    })
  } finally {
    submitting.value = false
  }
}

async function postAchievement(item: ApiWeeklyPlanItem, sid: number, hid: number) {
  submitting.value = true
  try {
    const settings = await loadEvaluationSettings(hid)

    // Build the recitation payload + score for the chosen method. `test` sends
    // one position per tested spot (each with its own errors); `full` sends the
    // whole-range errors. Score is derived from the errors that actually count.
    let payload: { errors?: PositionError[], test_positions?: AchievementTestPosition[] }
    let score: number
    if (isTest.value) {
      const positions = await buildTestPositions(spots.value, marks.value, groups.value)
      const allErrors = positions.flatMap(p => p.errors ?? [])
      score = computePercentageScore(tallyErrors(allErrors), settings)
      payload = { test_positions: positions }
    } else {
      // Standalone words become one error each; a drag-selected block becomes one.
      const errors = await buildErrorsFromMarks(marks.value, groups.value)
      score = computePercentageScore(toScoreCounts(counts.value), settings)
      payload = { errors }
    }

    const existing = findExistingAchievement(item)

    let saved: ApiAchievement
    if (existing) {
      if (existing.status === 'approved') {
        throw new Error('هذا الإنجاز معتمد ولا يمكن تعديله. ألغِ الاعتماد أولاً.')
      }
      // Update the same session instead of creating a duplicate.
      saved = await api<ApiAchievement>(`/achievements/${existing.id}`, {
        method: 'PATCH',
        body: {
          track_type: item.track_type,
          completion_method: 'mushaf',
          recitation_method: recitationMethod.value,
          start_surah: item.start_surah,
          start_verse: item.start_verse,
          end_surah: item.end_surah,
          end_verse: item.end_verse,
          ...payload,
          percentage_score: score
        }
      })
      priorAchievements.value = priorAchievements.value.map(a => a.id === existing.id ? saved : a)
    } else {
      const dto: CreateAchievementDto = {
        student_id: sid,
        halaqa_id: hid,
        date: dateStr.value,
        track_type: item.track_type,
        completion_method: 'mushaf',
        recitation_method: recitationMethod.value,
        start_surah: item.start_surah,
        start_verse: item.start_verse,
        end_surah: item.end_surah,
        end_verse: item.end_verse,
        ...payload,
        percentage_score: score
      }
      saved = await api<ApiAchievement>('/achievements', { method: 'POST', body: dto })
      priorAchievements.value = [saved, ...priorAchievements.value]
    }

    clearAll()
    if (isTest.value) clearSpots()

    // The recitation is done — the errors were just marked word-by-word on the
    // mushaf — so approve the achievement on the spot rather than leaving it
    // pending. The caller then returns to the achievements list.
    await api(`/achievements/${saved.id}/approve`, { method: 'POST' })
    toast.add({
      title: 'تم اعتماد الإنجاز ✓',
      description: submitSummary(),
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  } finally {
    submitting.value = false
  }
}

function rangeLabel(item: Pick<ApiWeeklyPlanItem, 'start_surah' | 'start_verse' | 'end_surah' | 'end_verse'>): string {
  const ss = SURAH_NAMES[item.start_surah] ?? `${item.start_surah}`
  if (item.start_surah === item.end_surah) {
    return `${ss} ${item.start_verse}–${item.end_verse}`
  }
  const es = SURAH_NAMES[item.end_surah] ?? `${item.end_surah}`
  return `${ss} ${item.start_verse} ← ${es} ${item.end_verse}`
}

function trackLabel(track: ApiWeeklyPlanItem['track_type']): string {
  return TRACK_TYPES.find(t => t.value === track)?.label ?? track
}

const missingArgs = computed(() => !halaqaId.value || !studentId.value)

// The mark toolbar shows as a sticky bottom bar while a lesson is selected.
const showToolbar = computed(() => !isParentReadOnly.value && !!selectedItem.value)
</script>

<template>
  <div class="flex flex-col gap-3 w-full max-w-[640px] lg:max-w-5xl mx-auto pb-6">
    <div
      v-if="missingArgs"
      class="mx-auto my-8 max-w-sm w-full flex flex-col items-center gap-3 text-center px-6 py-10 rounded-2xl border border-default bg-default"
    >
      <UIcon name="i-lucide-book-open-text" class="w-12 h-12 text-primary opacity-70" />
      <h2 class="text-lg font-bold">
        اختر طالبًا للبدء
      </h2>
      <p class="text-sm text-muted">
        افتح صفحة الإنجازات، اختر الطالب، ثم اضغط زر «تلاوة في المصحف» للوصول إلى هذه الصفحة.
      </p>
      <UButton to="/achievements" icon="i-lucide-arrow-left" size="lg" color="primary">
        اذهب إلى صفحة الإنجازات
      </UButton>
    </div>

    <template v-else>
      <div class="flex items-center gap-3 rounded-xl border border-default bg-default px-3 py-2.5">
        <UButton
          icon="i-lucide-arrow-right"
          variant="ghost"
          color="neutral"
          square
          :aria-label="'رجوع'"
          @click="router.push('/achievements')"
        />
        <div class="flex-1 min-w-0">
          <p class="text-[11px] font-bold uppercase tracking-wide text-primary">
            {{ isParentReadOnly ? 'تلاوة اليوم — للعرض فقط' : (isApproved ? 'تلاوة في المصحف — معتمد (للعرض)' : 'تلاوة في المصحف') }}
          </p>
          <p class="text-base font-bold truncate">
            {{ studentLoading ? '…' : (student?.name ?? `طالب #${studentId}`) }}
          </p>
        </div>
        <UBadge color="neutral" variant="subtle" size="sm" class="shrink-0 tabular-nums hidden sm:inline-flex">
          {{ dateStr }}
        </UBadge>

        <!-- "Recorded today" collapsed into a chip + popover to save vertical space -->
        <UPopover v-if="priorAchievements.length">
          <UButton size="sm" variant="soft" color="primary" icon="i-lucide-check-square" class="shrink-0 tabular-nums">
            {{ priorAchievements.length }}
          </UButton>
          <template #content>
            <div class="p-3 w-64 max-h-72 overflow-auto" dir="rtl">
              <p class="text-xs font-semibold text-muted mb-2">
                تم تسجيله اليوم ({{ priorAchievements.length }})
              </p>
              <ul class="flex flex-col items-start gap-1.5">
                <li v-for="a in priorAchievements" :key="a.id">
                  <UBadge :color="TRACK_BADGE_COLOR[a.track_type as AchievementTrack]" variant="subtle" class="gap-1.5">
                    <span class="font-bold">{{ trackLabel(a.track_type) }}</span>
                    <span class="opacity-80">{{ rangeLabel(a) }}</span>
                    <span v-if="!isParentReadOnly" class="tabular-nums opacity-70">
                      · {{ a.mistakes_count }}خ {{ a.warnings_count }}ت {{ a.tajweed_errors_count }}ج {{ a.harakat_errors_count ?? 0 }}ح
                    </span>
                  </UBadge>
                </li>
              </ul>
            </div>
          </template>
        </UPopover>
      </div>

      <!-- A session carried in via the query resolves synchronously, so skip the
           plan-loading / empty states below and render the mushaf directly. -->
      <div v-if="!selectedItem && planLoading" class="flex items-center justify-center gap-2 py-6 text-sm text-muted">
        <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
        جارٍ تحميل خطة اليوم…
      </div>

      <div v-else-if="!selectedItem && planError" class="flex items-center justify-center gap-2 py-6 text-sm text-error" dir="ltr">
        <UIcon name="i-lucide-alert-triangle" class="w-4 h-4" />
        Couldn't load this week's plan — {{ planError.message }}
      </div>

      <div
        v-else-if="!selectedItem && !plan"
        class="mx-auto max-w-sm w-full flex flex-col items-center gap-2 text-center px-6 py-8 rounded-2xl border border-default bg-default"
      >
        <UIcon name="i-lucide-calendar-off" class="w-8 h-8 text-muted opacity-70" />
        <p class="text-sm font-medium">
          لا توجد خطة أسبوعية معتمدة لهذا الطالب.
        </p>
        <p v-if="!isParentReadOnly" class="text-xs text-muted">
          يجب إنشاء الخطة من صفحة المخطط أولاً.
        </p>
        <UButton v-if="!isParentReadOnly" to="/planner" variant="soft" color="primary" size="sm">
          فتح المخطط
        </UButton>
      </div>

      <div
        v-else-if="!selectedItem && !todayItems.length"
        class="mx-auto max-w-sm w-full flex flex-col items-center gap-2 text-center px-6 py-8 rounded-2xl border border-default bg-default"
      >
        <UIcon name="i-lucide-coffee" class="w-8 h-8 text-muted opacity-70" />
        <p class="text-sm font-medium">
          لا يوجد مقرر مخطط لهذا اليوم.
        </p>
      </div>

      <template v-else>
        <!-- The session is fixed by the achievement the teacher came from — no
             in-page switcher. Just the centered reading column. -->
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-5">
          <!-- Reading column: mushaf + marking bar, centered and readable. -->
          <div class="min-w-0 flex-1">
            <div class="mx-auto flex w-full max-w-[640px] flex-col gap-3">
              <!-- Recitation method: full recitation vs. partial test. Hidden while
                   locked (approved view) — the method can't be changed. -->
              <div
                v-if="showMethodSelector && !markingLocked"
                dir="rtl"
                class="flex items-center gap-2"
              >
                <span class="inline-flex items-center gap-1 text-xs font-medium text-muted shrink-0">
                  <UIcon name="i-lucide-list-checks" class="w-3.5 h-3.5" />
                  نوع التسميع
                </span>
                <div class="inline-flex rounded-lg border border-default bg-default p-0.5">
                  <button
                    type="button"
                    class="rounded-md px-3 py-1.5 text-sm font-medium transition"
                    :class="recitationMethod === 'full'
                      ? 'bg-primary text-inverted'
                      : 'text-muted hover:text-default'"
                    @click="selectMethod('full')"
                  >
                    تسميع كامل
                  </button>
                  <button
                    type="button"
                    class="rounded-md px-3 py-1.5 text-sm font-medium transition"
                    :class="recitationMethod === 'test'
                      ? 'bg-primary text-inverted'
                      : 'text-muted hover:text-default'"
                    @click="selectMethod('test')"
                  >
                    اختبار
                  </button>
                </div>
              </div>
              <div
                v-else-if="!isParentReadOnly && selectedItem && currentTrack === 'Hifz'"
                dir="rtl"
                class="inline-flex items-center gap-1.5 text-xs text-muted"
              >
                <UIcon name="i-lucide-lock" class="w-3.5 h-3.5" />
                تسميع كامل — إلزامي للحفظ الجديد
              </div>

              <!-- Test capture: pick spots on the mushaf, then mark errors inside them. -->
              <div
                v-if="isTest && !isParentReadOnly && selectedItem"
                dir="rtl"
                class="flex flex-col gap-2 rounded-xl border border-default bg-elevated/40 p-2.5"
              >
                <div v-if="!markingLocked" class="flex items-center gap-2">
                  <div class="inline-flex shrink-0 rounded-lg border border-default bg-default p-0.5">
                    <button
                      type="button"
                      class="rounded-md px-3 py-1.5 text-xs font-medium transition"
                      :class="captureMode === 'spot' ? 'bg-primary text-inverted' : 'text-muted hover:text-default'"
                      @click="captureMode = 'spot'"
                    >
                      تحديد موضع
                    </button>
                    <button
                      type="button"
                      class="rounded-md px-3 py-1.5 text-xs font-medium transition"
                      :class="captureMode === 'mark' ? 'bg-primary text-inverted' : 'text-muted hover:text-default'"
                      @click="captureMode = 'mark'"
                    >
                      تعليم أخطاء
                    </button>
                  </div>
                  <p class="min-w-0 flex-1 text-xs text-muted">
                    {{ captureHint }}
                  </p>
                </div>

                <div v-if="spots.length" class="flex flex-wrap gap-1.5">
                  <span
                    v-for="(s, i) in spots"
                    :key="s.id"
                    class="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-2 py-1 text-xs"
                  >
                    <span class="font-bold text-primary">{{ i + 1 }}</span>
                    <span>{{ spotLabel(s) }}</span>
                    <button
                      v-if="!markingLocked"
                      type="button"
                      class="text-muted hover:text-error"
                      :aria-label="'حذف الموضع'"
                      @click="removeSpot(s.id)"
                    >
                      <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
                <p v-else-if="!markingLocked" class="text-xs text-muted">
                  لا مواضع بعد — حدّد موضعًا واحدًا على الأقل للاختبار.
                </p>
              </div>

              <MushafRangeViewer
                v-if="selectedItem"
                :start-surah="selectedItem.start_surah"
                :start-verse="selectedItem.start_verse"
                :end-surah="selectedItem.end_surah"
                :end-verse="selectedItem.end_verse"
                :marks="isParentReadOnly ? undefined : marks"
                :groups="isParentReadOnly ? undefined : groups"
                :highlight-override="spotHighlight"
                :pending-verse="isTest && captureMode === 'spot' ? pendingVerseKey : null"
                :on-word-tap="markingLocked ? undefined : onWordTap"
                :on-words-mark="(markingLocked || !canDragMark) ? undefined : onWordsMark"
              />

              <!-- Marking controls pinned to the bottom, aligned with the mushaf. -->
              <div v-if="showToolbar" class="sticky bottom-3 z-30">
                <MushafMarkToolbar
                  :counts="counts"
                  :can-submit="canSubmit"
                  :submitting="submitting"
                  :approved="isApproved"
                  @clear="clearAll"
                  @submit="onToolbarSubmit"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
