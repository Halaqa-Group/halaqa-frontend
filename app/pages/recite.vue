<script setup lang="ts">
import { LazyCommonConfirmDialog } from '#components'
import { SURAH_NAMES, TRACK_TYPES } from '~/data/constants'
import { computePercentageScore } from '~/utils/score'
import { makeRangePredicate } from '~/utils/mushaf'
import { TRACK_BADGE_COLOR, type AchievementTrack } from '~/utils/achievement'
import type { AchievementTestPosition, ApiAchievement, ApiStudent, ApiWeeklyPlanItem, CreateAchievementDto, PositionError, RecitationMethod } from '~/types'
import type { MarkCounts, Severity, VerseEdge, VerseLock } from '~/types/recitation'
import { SEVERITY_LEVELS, toScoreCounts } from '~/types/recitation'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const apiError = useApiError()
const api = useApi()
const overlay = useOverlay()
const { isParent: isParentReadOnly } = usePermissions()
const { loadEvaluationSettings, currentEvaluationSettings } = useAchievements()
// Warm the QUL word-id / juz / hizb lookup so building errors[] on submit is instant.
useQuranWords()
// Marks and spots are no longer cached client-side; clear what older builds left
// behind so a stale session can't resurface.
onMounted(purgeLegacyRecitationCache)

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

// ── Reopening a recorded achievement ────────────────────────────────────────
// Arriving from the achievements list carries the achievement id. Its detail
// (GET /achievements/{id}) already holds the student name, the session's track +
// range, the approval status and the recorded errors — everything this page
// needs. So when it's present it is the ONLY request we make: the day's weekly
// plan, the day's achievement list and the student record are all redundant and
// stay unfetched (see `planStudentId`, `loadStudent`, `loadPrior`).
const achievementId = computed(() => {
  const v = Number(route.query.achievement_id)
  return Number.isFinite(v) && v > 0 ? v : null
})
const achievementDetail = ref<ApiAchievement | null>(null)
const detailLoading = ref(false)

const student = ref<ApiStudent | null>(null)
const studentLoading = ref(false)
// Name for the header: the achievement detail carries it (every role sees
// `student_name`), so the extra /students/{id} round-trip is only for the
// plan-driven entry points.
const studentName = computed(() =>
  student.value?.name ?? achievementDetail.value?.student_name ?? null
)
const studentPending = computed(() => studentLoading.value || detailLoading.value)

async function loadStudent() {
  if (achievementId.value != null) return
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
watch([studentId, halaqaId, achievementId], loadStudent, { immediate: true })

// Nulling the ids short-circuits the composable's fetch — the session comes from
// the achievement detail instead of the day's plan.
const planStudentId = computed(() => (achievementId.value != null ? null : studentId.value))
const planHalaqaId = computed(() => (achievementId.value != null ? null : halaqaId.value))
const { items: todayItems, plan, loading: planLoading, error: planError }
  = useTodayPlanItems(planStudentId, planHalaqaId, dateStr)

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
function makeSession(
  track: 'Hifz' | 'Near' | 'Far',
  ss: number, sv: number, es: number, ev: number
): ApiWeeklyPlanItem {
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
}

const querySession = computed<ApiWeeklyPlanItem | null>(() => {
  const rawTrack = route.query.track
  const track = Array.isArray(rawTrack) ? rawTrack[0] : rawTrack
  if (track !== 'Hifz' && track !== 'Near' && track !== 'Far') return null
  const ss = queryInt('start_surah')
  const sv = queryInt('start_verse')
  const es = queryInt('end_surah')
  const ev = queryInt('end_verse')
  if (ss == null || sv == null || es == null || ev == null) return null
  return makeSession(track, ss, sv, es, ev)
})

// The achievement itself defines the session it was recorded against, so a link
// carrying only achievement_id still resolves without touching the weekly plan.
const detailSession = computed<ApiWeeklyPlanItem | null>(() => {
  const d = achievementDetail.value
  if (!d) return null
  return makeSession(d.track_type, d.start_surah, d.start_verse, d.end_surah, d.end_verse)
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
  querySession.value
  ?? detailSession.value
  ?? todayItems.value.find(i => i.id === selectedItemId.value)
  ?? null
)

// ── Recitation method (step 1) ──────────────────────────────────────────────
// Hifz (new memorization) is always a full recitation — no choice. Near/Far may
// be tested at chosen positions; that capture UI lands later, so `test` is
// disabled for now. The last method used on a testable track is remembered.
const currentTrack = computed(() => selectedItem.value?.track_type ?? null)
// Declared here (not next to `hydrateFromAchievement`) because the immediate
// watcher below reads it during setup.
const hydratedFor = ref<string | null>(null)
const recitationMethod = ref<RecitationMethod>('full')
// In `test`, taps either define a spot's boundaries or mark errors inside it.
const captureMode = ref<'spot' | 'mark'>('spot')
watch(currentTrack, () => {
  // A restored recitation owns its method and mode — don't reset them out from
  // under `hydrateFromAchievement`. Otherwise start on a full recitation; the
  // last-used method is deliberately NOT remembered client-side.
  if (hydratedFor.value) return
  recitationMethod.value = 'full'
  captureMode.value = 'spot'
}, { immediate: true })

function selectMethod(method: RecitationMethod) {
  recitationMethod.value = method
  if (method === 'test') captureMode.value = 'spot'
}

const showMethodSelector = computed(() =>
  !isParentReadOnly.value && !!selectedItem.value && currentTrack.value !== 'Hifz'
)
const isTest = computed(() => recitationMethod.value === 'test')

// No preload/prefetch link tags for the lesson's pages: they duplicated the
// fetches `useMushafPage` already makes for the page on screen, and for a long
// revision range they queued every page in the lesson up front. The mushaf
// fetches the page it is showing, and that alone.

const priorAchievements = ref<ApiAchievement[]>([])
const priorLoading = ref(false)

async function loadPrior() {
  // Opened on a specific achievement: that one record is the only one this page
  // acts on (it's what re-submitting updates), and the detail already provided
  // it — so the day's list is never fetched.
  if (achievementId.value != null) return
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
watch([studentId, halaqaId, dateStr, achievementId], loadPrior, { immediate: true })

// The one request this entry point makes. Everything downstream — the header
// name, the session, update-vs-create, the approval lock and the recorded marks
// — is driven off it.
async function loadAchievementDetail(id: number) {
  detailLoading.value = true
  try {
    const detail = await api<ApiAchievement>(`/achievements/${id}`)
    achievementDetail.value = detail
    // Stand in for the day's list: `findExistingAchievement` matches on
    // track + range, so re-submitting updates this record instead of duplicating.
    priorAchievements.value = [detail]
  } catch {
    achievementDetail.value = null
    priorAchievements.value = []
  } finally {
    detailLoading.value = false
  }
}
watch(achievementId, (id) => {
  if (id != null) void loadAchievementDetail(id)
  else achievementDetail.value = null
}, { immediate: true })

const sessionId = computed(() =>
  selectedItem.value && studentId.value
    ? `${studentId.value}:${dateStr.value}:${selectedItem.value.id}`
    : ''
)
const { marks, groups, counts, tap, setMarks, clearAll } = useRecitationSession(sessionId)

// The halaqa's weights back the running mark in the toolbar, so fetch them as
// soon as the halaqa is known rather than waiting for submit.
watch(halaqaId, (hid) => {
  if (hid) void loadEvaluationSettings(hid)
}, { immediate: true })

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
const { spots, pendingStart, isSelecting, isVerseTaken, pickBoundary, cancelPending, removeSpot, setSpots, clearSpots }
  = useTestSpots(sessionId, lessonRange)

// While picking a new موضع, the verses already inside one are inert — a verse
// belongs to at most one passage. Only applies in spot mode: marking errors
// requires tapping words inside those very passages.
const lockedAt = computed<VerseLock | undefined>(() =>
  isTest.value && captureMode.value === 'spot' ? inAnySpot : undefined
)

// Delimit each موضع with the mushaf's own ayah ornaments: the one on its first
// verse and the one on its last. A single-verse موضع colours just the one.
const spotEdgeAt = computed<VerseEdge | undefined>(() => {
  if (!isTest.value) return undefined
  const list = spots.value
  if (!list.length) return undefined
  const keys = new Set<string>()
  for (const s of list) {
    keys.add(`${s.startSurah}:${s.startVerse}`)
    keys.add(`${s.endSurah}:${s.endVerse}`)
  }
  return (verseKey: string) => keys.has(verseKey)
})

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

// ── Live score ──────────────────────────────────────────────────────────────
// Weights are per mushaf page, so the pages actually recited divide every
// deduction: the lesson range for `full`, the summed (fractional) coverage of
// the tested spots for `test` — three spots of a page, half a page and a page
// divide by 2.5.
const spotRanges = computed(() => spots.value.map(s => ({
  start_surah: s.startSurah,
  start_verse: s.startVerse,
  end_surah: s.endSurah,
  end_verse: s.endVerse
})))

const lessonPages = computed(() => {
  const item = selectedItem.value
  if (!item) return 1
  return pagesRecited(item, isTest.value ? spotRanges.value : null)
})

// In test mode, taps outside a defined spot are inert (see `onWordTap`), so the
// marks on screen are exactly what gets submitted — one basis serves both methods.
const liveScore = computed(() => computePercentageScore(
  toScoreCounts(counts.value),
  currentEvaluationSettings.value,
  lessonPages.value
))

// In test mark-mode, only the tested spots stay lit; the rest of the lesson dims.
const spotHighlight = computed<((verseKey: string) => boolean) | undefined>(() =>
  isTest.value && captureMode.value === 'mark' ? inAnySpot : undefined
)

// Route a word tap: define a spot boundary (spot-mode), or mark an error — but in
// test mode only inside a defined spot (taps on dimmed, out-of-spot words are inert,
// so what's marked always matches what gets submitted).
function onWordTap(wordKey: string, verseKey: string) {
  if (isTest.value && captureMode.value === 'spot') {
    // Belt and braces: the mushaf already withholds the tap handler from these
    // verses (see `lockedAt`), so this only guards a stray call.
    if (isVerseTaken(verseKey)) return
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

// Tapping a موضع takes the mushaf to it — on a multi-page lesson the passage is
// often on a page that isn't the one currently shown — then pulses its two
// ornaments so the eye lands on the passage rather than hunting for it.
const FLASH_MS = 1600
const viewerRef = ref<{ goToVerse: (verseKey: string) => void } | null>(null)
const flashedVerses = ref<Set<string> | null>(null)
let flashTimer: ReturnType<typeof setTimeout> | null = null

const flashAt = computed<VerseEdge | undefined>(() => {
  const set = flashedVerses.value
  return set ? (verseKey: string) => set.has(verseKey) : undefined
})

function focusSpot(s: { startSurah: number, startVerse: number, endSurah: number, endVerse: number }) {
  viewerRef.value?.goToVerse(`${s.startSurah}:${s.startVerse}`)
  if (flashTimer) clearTimeout(flashTimer)
  // Drop the class first so tapping the same موضع twice replays the animation
  // instead of doing nothing (a running animation won't restart on re-add).
  flashedVerses.value = null
  void nextTick(() => {
    flashedVerses.value = new Set([
      `${s.startSurah}:${s.startVerse}`,
      `${s.endSurah}:${s.endVerse}`
    ])
    flashTimer = setTimeout(() => {
      flashedVerses.value = null
      flashTimer = null
    }, FLASH_MS)
  })
}

onBeforeUnmount(() => {
  if (flashTimer) clearTimeout(flashTimer)
})

const canSubmit = computed(() =>
  !!selectedItem.value && (!isTest.value || spots.value.length > 0)
)

function verseLabel(surah: number, verse: number): string {
  return `${SURAH_NAMES[surah] ?? `سورة ${surah}`} ${verse}`
}

// Names the step the teacher is on. Once a start is armed it echoes back exactly
// which verse was picked, so choosing the end is a decision rather than a guess.
const captureHint = computed(() => {
  if (captureMode.value !== 'spot') return 'علّم الكلمات الخاطئة داخل المواضع'
  const p = pendingStart.value
  if (!p) return `١. اضغط أول آية في الموضع ${spots.value.length + 1}`
  return `٢. البداية ${verseLabel(p.surah, p.verse)} — اضغط الآية الأخيرة`
})

// One-line breakdown of the four severity levels, reused in the confirm dialog
// and the success toasts. Reads its names off SEVERITY_LEVELS so it stays in
// step with the toolbar legend and إعدادات التقييم.
function countsSummary(c: MarkCounts): string {
  return SEVERITY_LEVELS.map(lvl => `${t(lvl.labelKey)}: ${c[lvl.key]}`).join('، ')
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

// Seed the mushaf with the errors the achievement was recorded with, so the
// teacher sees exactly what was marked — local marks are wiped on submit, so a
// fresh visit would otherwise start blank. Reads the detail already loaded by
// `loadAchievementDetail`; no second request. Only mushaf recitations carry real
// word positions (quick-entry errors are synthetic, all stacked at the range's
// start word). Seeds once, and never over marks started this visit.
// `hydratedFor` is declared up with the recitation-method state. The API
// serializes ids as strings ("47"), so normalize before comparing.
// Parents hydrate too: the API now serves them the same positions and itemized
// errors, and `markingLocked` keeps the mushaf read-only for them.
async function hydrateFromAchievement(detail: ApiAchievement) {
  const id = String(detail.id)
  if (hydratedFor.value === id) return
  if (detail.completion_method !== 'mushaf') return
  hydratedFor.value = id

  const positions = detail.recitation_positions ?? []
  const isTestRun = detail.recitation_method === 'test' && positions.length > 0

  // Restore the tested passages FIRST, and synchronously. Both matter:
  //  - `spotHighlight` dims every verse outside a spot, so with no spots a
  //    restored test shows neither its مواضع nor the errors inside them;
  //  - anything awaited before this yields to `watch(currentTrack)`, which
  //    resets captureMode to 'spot' and recitationMethod to the remembered one,
  //    silently undoing the restore.
  if (isTestRun) {
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

  // Never paint over marks the teacher already started this visit — but the
  // spots above are restored either way.
  if (Object.keys(marks.value).length > 0) return

  const runs = await buildMarkRunsFromErrors(positions.flatMap(p => p.errors ?? []))
  // Re-assert after the await, for the same reason as above.
  if (isTestRun) captureMode.value = 'mark'
  for (const run of runs) setMarks(run.keys, run.severity)
  // What's on the mushaf now IS what the server holds — make that the autosync
  // baseline, or the first tick would re-send the record its own contents back.
  markSynced()
}
// Waits for the session too: marks are stored per session id, so seeding before
// `selectedItem` resolves would file them under the wrong key.
watch([achievementDetail, selectedItem], () => {
  const detail = achievementDetail.value
  if (detail && selectedItem.value) void hydrateFromAchievement(detail)
}, { immediate: true })

// The other entry points (planner, achievements list without an id) don't carry a
// detail, yet the session may already have a record from earlier today. Autosync
// replaces that record wholesale, so seed the mushaf from it first: the teacher
// then continues from what's stored instead of overwriting it with a blank slate.
// The day's list may not embed the positions — fetch the detail when it doesn't.
watch([selectedItem, priorAchievements], async () => {
  if (achievementId.value != null) return
  const existing = existingAchievement.value
  if (!existing || hydratedFor.value === String(existing.id)) return
  try {
    const detail = existing.recitation_positions
      ? existing
      : await api<ApiAchievement>(`/achievements/${existing.id}`)
    await hydrateFromAchievement(detail)
  } catch {
    // Couldn't read it back — leave the mushaf as-is; autosync only ever writes
    // state that has marks in it, so nothing is silently emptied.
  }
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
        try {
          modal.close()
        } catch { /* dialog already closed */ }
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
        try {
          modal.close()
        } catch { /* dialog already closed */ }
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

// A 2xx on the save is NOT proof the errors were stored: a payload whitelist,
// a dropped carrier (`errors` vs `test_positions`) or a partial write all return
// the record just the same, and clearing the marks then would lose the whole
// recitation with no way to re-enter it. So read the persisted breakdown back and
// compare it against what we sent; the caller throws on a mismatch, before
// anything is cleared, leaving every mark on the mushaf for a retry.
async function verifyErrorsPersisted(
  saved: ApiAchievement,
  sentErrors: PositionError[],
  sentPositions: number
): Promise<void> {
  const expected = tallyErrors(sentErrors)
  const expectedTotal = sentErrors.length
  if (expectedTotal === 0 && sentPositions === 0) return

  // The write response doesn't always embed the positions; re-read the record
  // once when it doesn't rather than assuming the write took.
  let record = saved
  if (!record.recitation_positions) {
    record = await api<ApiAchievement>(`/achievements/${saved.id}`)
  }
  const positions = record.recitation_positions
  const storedErrors = (positions ?? []).flatMap(p => p.errors ?? [])

  // Prefer the itemized rows; fall back to the derived top-level totals when the
  // API serves counts without positions.
  const hasItemized = positions != null && positions.length > 0
  const stored = hasItemized
    ? tallyErrors(storedErrors)
    : {
        mistakes_count: record.mistakes_count ?? -1,
        warnings_count: record.warnings_count ?? -1,
        harakat_errors_count: record.harakat_errors_count ?? -1
      }

  const short
    = stored.mistakes_count < expected.mistakes_count
      || stored.warnings_count < expected.warnings_count
      || stored.harakat_errors_count < expected.harakat_errors_count
  // A test also has to keep every tested spot — a position dropped server-side
  // takes its errors with it.
  const lostPositions = hasItemized && positions!.length < sentPositions

  if (short || lostPositions) {
    throw new Error(
      'تم حفظ الإنجاز لكن الأخطاء المُعلَّمة لم تُحفَظ على الخادم. '
      + 'لم يتم مسح العلامات — يرجى إعادة المحاولة.'
    )
  }
}

// Write the marks currently on the mushaf to the backend — creating the session's
// achievement the first time and updating that same record afterwards — and only
// return once the stored breakdown has been verified against what was sent.
// Shared by the 5-second autosync and the explicit submit, so both write exactly
// the same record from exactly the same state.
async function saveRecitation(
  item: ApiWeeklyPlanItem, sid: number, hid: number
): Promise<ApiAchievement> {
  const settings = await loadEvaluationSettings(hid)

  // Build the recitation payload + score for the chosen method. `test` sends
  // one position per tested spot (each with its own errors); `full` sends the
  // whole-range errors. Score is derived from the errors that actually count.
  let payload: { errors?: PositionError[], test_positions?: AchievementTestPosition[] }
  let score: number
  // Kept for the post-save verification below — what we sent, to compare
  // against what the backend actually stored.
  let sentErrors: PositionError[]
  let sentPositions = 0
  // Weights are per mushaf page — a longer lesson divides each deduction by
  // the number of pages it spans.
  const pages = lessonPages.value
  if (isTest.value) {
    const positions = await buildTestPositions(spots.value, marks.value, groups.value)
    const allErrors = positions.flatMap(p => p.errors ?? [])
    score = computePercentageScore(tallyErrors(allErrors), settings, pages)
    payload = { test_positions: positions }
    sentErrors = allErrors
    sentPositions = positions.length
  } else {
    // Standalone words become one error each; a drag-selected block becomes one.
    const errors = await buildErrorsFromMarks(marks.value, groups.value)
    score = computePercentageScore(toScoreCounts(counts.value), settings, pages)
    payload = { errors }
    sentErrors = errors
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

  // Nothing downstream treats the save as done until the backend confirms it
  // holds the errors: this throws otherwise, so the marks stay on screen (and
  // stay dirty for the next autosync tick) instead of being cleared.
  await verifyErrorsPersisted(saved, sentErrors, sentPositions)
  return saved
}

// ── Autosync ────────────────────────────────────────────────────────────────
// A recitation is marked word-by-word over several minutes and used to live only
// in this tab's memory until the teacher pressed save — a refresh, a phone lock
// or a dropped connection took the whole session with it. So every 5 seconds the
// marks are compared against what the backend last confirmed, and any difference
// is written straight away: the first tick creates the session's achievement
// (unapproved — the explicit submit is still what approves it), later ticks
// update that same record. `saveRecitation` verifies the stored breakdown, so a
// tick only counts as synced once the errors are provably on the server.
const AUTOSYNC_MS = 5000

type SyncStatus = 'idle' | 'saving' | 'saved' | 'error'
const syncStatus = ref<SyncStatus>('idle')
const lastSyncedAt = ref<string | null>(null)
// Signature of the state the backend last confirmed. Everything that ends up in
// the payload goes in, so a change of severity, of grouping, of tested spot or of
// method all read as dirty — not just the number of marks.
const lastSyncedSignature = ref<string | null>(null)
// The in-flight tick, awaited by the explicit submit so the two can't both create.
let syncInFlight: Promise<void> | null = null
let syncTimer: ReturnType<typeof setInterval> | null = null

const currentSignature = computed(() => JSON.stringify({
  method: recitationMethod.value,
  // Sorted: the marks object is rebuilt on every edit, so insertion order alone
  // would flag unchanged state as dirty.
  marks: Object.entries(marks.value).sort(([a], [b]) => a.localeCompare(b)),
  groups: Object.entries(groups.value).sort(([a], [b]) => a.localeCompare(b)),
  spots: spots.value.map(s => `${s.startSurah}:${s.startVerse}-${s.endSurah}:${s.endVerse}`)
}))

const isDirty = computed(() => currentSignature.value !== lastSyncedSignature.value)

// Adopt the state on screen as synced — after a tick lands, after hydration
// seeds the marks from the server, and after a submit clears them.
function markSynced() {
  lastSyncedSignature.value = currentSignature.value
}

// Autosync runs only where an update is both possible and wanted: an editable
// session (parents and approved records are read-only), with the ids the write
// needs, and a test only once it has a موضع to attach its errors to.
const canAutosync = computed(() =>
  !isParentReadOnly.value
  && !markingLocked.value
  && !!selectedItem.value
  && !!studentId.value
  && !!halaqaId.value
  && (!isTest.value || spots.value.length > 0)
)

// Autosync only ever writes state that HAS something in it. Two reasons: opening
// the page to read shouldn't leave an empty achievement behind, and — since an
// update replaces the stored errors wholesale — an empty mushaf must never be
// able to blank a record automatically. Clearing everything is therefore a
// deliberate act that goes through the explicit submit.
const hasSomethingToSync = computed(() =>
  Object.keys(marks.value).length > 0 || spots.value.length > 0
)

async function runSync() {
  const item = selectedItem.value
  const sid = studentId.value
  const hid = halaqaId.value
  if (!item || !sid || !hid) return

  // Snapshot first: marks made *during* the request belong to the next tick, and
  // adopting the post-request state would silently swallow them.
  const attempted = currentSignature.value
  // Read before the state changes: it decides whether this failure is the start
  // of a streak (and so worth a toast) or another tick of one already reported.
  const wasFailing = syncStatus.value === 'error'
  syncStatus.value = 'saving'
  try {
    const saved = await saveRecitation(item, sid, hid)
    // The record now mirrors the mushaf, so claim it as hydrated: the seeding
    // watchers skip it instead of fetching the state back over the live marks.
    hydratedFor.value = String(saved.id)
    lastSyncedSignature.value = attempted
    lastSyncedAt.value = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    syncStatus.value = 'saved'
  } catch (e) {
    // Leave the signature dirty so the next tick retries. The marks are never
    // touched here, so nothing is lost while the backend is unreachable.
    syncStatus.value = 'error'
    if (!wasFailing) {
      // Announce the first failure of a streak only — a toast every 5 seconds
      // would bury the mushaf.
      const err = e as { data?: { message?: string }, message?: string }
      toast.add({
        title: 'تعذّر الحفظ التلقائي',
        description: apiError.format(err, err.message || 'سيُعاد المحاولة تلقائيًا — لا تغلق الصفحة.'),
        color: 'warning',
        icon: 'i-lucide-cloud-off'
      })
    }
  }
}

function tickAutosync() {
  // Never overlap: a tick still in flight, or the explicit submit running, owns
  // the record until it's done.
  if (syncInFlight || submitting.value) return
  if (!canAutosync.value || !isDirty.value || !hasSomethingToSync.value) return
  syncInFlight = runSync().finally(() => {
    syncInFlight = null
  })
}

onMounted(() => {
  syncTimer = setInterval(tickAutosync, AUTOSYNC_MS)
})

onBeforeUnmount(() => {
  if (syncTimer) clearInterval(syncTimer)
  syncTimer = null
  // Leaving with unsaved marks: fire one last write on the way out. It can't be
  // awaited in an unmount hook, but the request outlives the component.
  if (!syncInFlight && !submitting.value && canAutosync.value && isDirty.value && hasSomethingToSync.value) {
    void runSync()
  }
})

// Switching session resets the mushaf; the new session's baseline is its own.
watch(sessionId, () => {
  lastSyncedSignature.value = null
  syncStatus.value = 'idle'
  lastSyncedAt.value = null
})

// What the header chip shows. `saving`/`error` speak for themselves; `saved`
// carries the time so a teacher can tell at a glance how current it is.
const syncLabel = computed(() => {
  if (syncStatus.value === 'saving') return 'جارٍ الحفظ…'
  if (syncStatus.value === 'error') return 'تعذّر الحفظ — إعادة المحاولة'
  if (isDirty.value && hasSomethingToSync.value) return 'تغييرات غير محفوظة'
  if (syncStatus.value === 'saved') return `تم الحفظ ${lastSyncedAt.value}`
  return 'حفظ تلقائي'
})

async function postAchievement(item: ApiWeeklyPlanItem, sid: number, hid: number) {
  submitting.value = true
  try {
    // An autosync tick may be mid-flight on this very session — let it finish so
    // its create can't race this one into a duplicate record.
    await syncInFlight
    const saved = await saveRecitation(item, sid, hid)

    // The recitation is done — the errors were just marked word-by-word on the
    // mushaf — so approve the achievement on the spot rather than leaving it
    // pending. The caller then returns to the achievements list.
    await api(`/achievements/${saved.id}/approve`, { method: 'POST' })
    // Reflect the approval locally so the autosync sees a locked record and stops
    // touching it (an approved achievement rejects updates).
    priorAchievements.value = priorAchievements.value.map(
      a => a.id === saved.id ? { ...a, status: 'approved' as const } : a
    )

    // Only now — saved, verified and approved — are the marks safe to drop.
    clearAll()
    if (isTest.value) clearSpots()
    // Clearing is a state change like any other; adopt it as the synced baseline
    // so the next tick doesn't read the empty mushaf as "unsaved work" and wipe
    // the record that was just approved.
    markSynced()

    // A general message: the per-error summary can't be shown here — the marks were
    // just cleared above — and the approve response carries no message to relay.
    toast.add({
      description: 'تم حفظ التلاوة واعتماد الإنجاز بنجاح.',
      color: 'success'
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

console.log('mushaf page setup complete');
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
            {{ studentPending && !studentName ? '…' : (studentName ?? `طالب #${studentId}`) }}
          </p>
        </div>
        <UBadge color="neutral" variant="subtle" size="sm" class="shrink-0 tabular-nums hidden sm:inline-flex">
          {{ dateStr }}
        </UBadge>

        <!-- Autosync state: the marks are written to the backend on their own, so
             say plainly whether the server currently has them. -->
        <UBadge
          v-if="canAutosync || syncStatus !== 'idle'"
          :color="syncStatus === 'error' ? 'warning' : (isDirty && hasSomethingToSync ? 'neutral' : 'success')"
          variant="subtle"
          size="sm"
          class="shrink-0 gap-1"
        >
          <UIcon
            :name="syncStatus === 'saving'
              ? 'i-lucide-loader-2'
              : (syncStatus === 'error' ? 'i-lucide-cloud-off' : (isDirty && hasSomethingToSync ? 'i-lucide-cloud' : 'i-lucide-cloud-check'))"
            class="w-3.5 h-3.5"
            :class="syncStatus === 'saving' ? 'animate-spin' : ''"
          />
          <span class="text-[11px] hidden sm:inline">{{ syncLabel }}</span>
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
              <ul class="flex flex-col items-start gap-2">
                <li v-for="a in priorAchievements" :key="a.id" class="flex flex-col items-start gap-1">
                  <UBadge :color="TRACK_BADGE_COLOR[a.track_type as AchievementTrack]" variant="subtle" class="gap-1.5">
                    <span class="font-bold">{{ trackLabel(a.track_type) }}</span>
                    <span class="opacity-80">{{ rangeLabel(a) }}</span>
                  </UBadge>
                  <!-- Spelled out rather than the old «خ ت ج ح» initials, which
                       were ambiguous against the legend right above. -->
                  <span class="text-[11px] tabular-nums text-muted">
                    {{ t('pages.achievements.mistakes') }} {{ a.mistakes_count }}
                    · {{ t('pages.achievements.warnings') }} {{ a.warnings_count }}
                    · {{ t('pages.achievements.harakat') }} {{ a.harakat_errors_count ?? 0 }}
                  </span>
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
                  <p class="min-w-0 flex-1 text-xs" :class="isSelecting ? 'text-primary font-medium' : 'text-muted'">
                    {{ captureHint }}
                  </p>
                  <!-- Picked the wrong start? Back out without defining a موضع. -->
                  <UButton
                    v-if="isSelecting"
                    size="xs"
                    variant="soft"
                    color="neutral"
                    class="shrink-0"
                    @click="cancelPending"
                  >
                    إلغاء
                  </UButton>
                </div>

                <div v-if="spots.length" class="flex flex-wrap gap-1.5">
                  <span
                    v-for="(s, i) in spots"
                    :key="s.id"
                    class="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 ps-2 pe-1 py-1 text-xs"
                  >
                    <!-- Tapping the موضع takes the mushaf to it. Kept a sibling of
                         the remove button — a button can't nest inside a button. -->
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 rounded-full transition hover:opacity-70"
                      :aria-label="`الذهاب إلى الموضع ${i + 1}`"
                      @click="focusSpot(s)"
                    >
                      <span class="font-bold text-primary">{{ i + 1 }}</span>
                      <span>{{ spotLabel(s) }}</span>
                    </button>
                    <button
                      v-if="!markingLocked"
                      type="button"
                      class="text-muted hover:text-error px-0.5"
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
                ref="viewerRef"
                :start-surah="selectedItem.start_surah"
                :start-verse="selectedItem.start_verse"
                :end-surah="selectedItem.end_surah"
                :end-verse="selectedItem.end_verse"
                :marks="marks"
                :groups="groups"
                :highlight-override="spotHighlight"
                :pending-verse="isTest && captureMode === 'spot' ? pendingVerseKey : null"
                :locked-at="lockedAt"
                :spot-edge-at="spotEdgeAt"
                :flash-at="flashAt"
                :on-word-tap="markingLocked ? undefined : onWordTap"
                :on-words-mark="(markingLocked || !canDragMark) ? undefined : onWordsMark"
              />

              <!-- Marking controls pinned to the bottom, aligned with the mushaf. -->
              <div v-if="showToolbar" class="sticky bottom-3 z-30">
                <MushafMarkToolbar
                  :counts="counts"
                  :score="liveScore"
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
