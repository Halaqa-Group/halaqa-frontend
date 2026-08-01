<script setup lang="ts">
import { useMediaQuery, useOnline } from '@vueuse/core'
import { LazyCommonConfirmDialog } from '#components'
import { SURAH_NAMES, TRACK_TYPES } from '~/data/constants'
import { computePercentageScore } from '~/utils/score'
import { makeRangePredicate } from '~/utils/mushaf'
import type { VerseRange } from '~/utils/quran-structure'
import type { AchievementTrack } from '~/utils/achievement'
import type { AchievementTestPosition, ApiAchievement, ApiStudent, ApiWeeklyPlanItem, CreateAchievementDto, PositionError, RecitationMethod } from '~/types'
import type { Severity, VerseEdge, VerseLock, WordKey } from '~/types/recitation'
import { toScoreCounts } from '~/types/recitation'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const apiError = useApiError()
const api = useApi()
const overlay = useOverlay()
const { isParent: isParentReadOnly } = usePermissions()
const { loadEvaluationSettings, currentEvaluationSettings } = useAchievements()
// Offline recitation drafts: when disconnected the session is saved locally and
// synced once on reconnect (see useAchievementDrafts) instead of hitting the API.
const online = useOnline()
const { saveDraft: saveRecitationDraft } = useAchievementDrafts()
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

// ── Adjustable session range ────────────────────────────────────────────────
// The lesson arrives with a planned range, but a live recitation can run long or
// stop short of it: a strong student is pushed a few ayat further, a struggling
// one is pulled back. `rangeOverride` is the teacher's in-session adjustment;
// null means «as planned». Every range-driven surface — the mushaf bounds, the
// markable predicate, the per-page score and the saved record — reads
// `effectiveItem`, so extending or shortening here re-bounds the whole reader at
// once. The session id is deliberately keyed off the plan item, not the range, so
// an adjustment never restarts the marking session underneath it.
const rangeOverride = ref<VerseRange | null>(null)
const rangeEditorOpen = ref(false)

function sameVerseRange(a: VerseRange, b: VerseRange): boolean {
  return a.start_surah === b.start_surah && a.start_verse === b.start_verse
    && a.end_surah === b.end_surah && a.end_verse === b.end_verse
}

const baseRange = computed<VerseRange | null>(() =>
  selectedItem.value
    ? {
        start_surah: selectedItem.value.start_surah,
        start_verse: selectedItem.value.start_verse,
        end_surah: selectedItem.value.end_surah,
        end_verse: selectedItem.value.end_verse
      }
    : null
)

// The lesson as it will actually be recited and recorded: the planned item with
// the teacher's range adjustment folded in. Same object shape as `selectedItem`,
// so scoring, saving and the mushaf all keep reading one value.
const effectiveItem = computed<ApiWeeklyPlanItem | null>(() => {
  const item = selectedItem.value
  if (!item) return null
  const o = rangeOverride.value
  if (!o) return item
  return {
    ...item,
    start_surah: o.start_surah,
    start_verse: o.start_verse,
    end_surah: o.end_surah,
    end_verse: o.end_verse
  }
})

// Fed to the range editor; mirrors `effectiveItem` as a bare VerseRange.
const effectiveRange = computed<VerseRange>(() => ({
  start_surah: effectiveItem.value?.start_surah ?? 1,
  start_verse: effectiveItem.value?.start_verse ?? 1,
  end_surah: effectiveItem.value?.end_surah ?? 1,
  end_verse: effectiveItem.value?.end_verse ?? 1
}))

// True once either boundary has been moved off the plan.
const rangeAdjusted = computed(() =>
  !!rangeOverride.value && !!baseRange.value && !sameVerseRange(rangeOverride.value, baseRange.value)
)

// The editor emits only valid ranges (see PlannerSessionRangeFields). Fold the
// edit in unless it's identical to the plan, in which case snapping back clears
// the override entirely rather than storing a redundant copy.
function applyRangeEdit(r: VerseRange) {
  rangeOverride.value = (baseRange.value && sameVerseRange(r, baseRange.value)) ? null : { ...r }
}

function resetRange() {
  rangeOverride.value = null
}

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
  effectiveItem.value
    ? {
        startSurah: effectiveItem.value.start_surah,
        startVerse: effectiveItem.value.start_verse,
        endSurah: effectiveItem.value.end_surah,
        endVerse: effectiveItem.value.end_verse
      }
    : null
)
const { spots, pendingStart, isSelecting, isVerseTaken, pickBoundary, cancelPending, removeSpot, setSpots, clearSpots }
  = useTestSpots(sessionId, lessonRange)

// A page is a whole page: the mushaf shows the verses either side of the lesson as
// well, dimmed. Dimmed is not the same as inert, and `buildErrorsFromMarks` submits
// every mark it is given — so a tap on a neighbouring verse was recorded against
// this lesson. Nothing outside the lesson's own range is markable.
const inLessonRange = computed<(verseKey: string) => boolean>(() => {
  const r = lessonRange.value
  if (!r) return () => false
  return makeRangePredicate(r.startSurah, r.startVerse, r.endSurah, r.endVerse)
})

// Which verses are out of bounds right now. Locked verses lose the tap handler and
// the `--tappable` class, so they take no taps, no hover and no drag-selection —
// every rule below is enforced at the word, not after the fact at submit.
const lockedAt = computed<VerseLock | undefined>(() => {
  const inRange = inLessonRange.value
  // Marking a straight recitation: the lesson range and nothing else.
  if (!isTest.value) return (verseKey: string) => !inRange(verseKey)
  // Picking a موضع: inside the lesson, and not already spoken for — a verse
  // belongs to at most one passage.
  if (captureMode.value === 'spot') {
    return (verseKey: string) => !inRange(verseKey) || inAnySpot(verseKey)
  }
  // Marking inside a test: an error has to fall within the position it is recorded
  // against, and the positions are themselves bounded by the lesson.
  return (verseKey: string) => !inAnySpot(verseKey)
})

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
function verseOfWord(wordKey: string): string {
  const [s, a] = wordKey.split(':')
  return `${s}:${a}`
}
/** Whether a word may carry an error at all, under the rules `lockedAt` enforces. */
function wordMarkable(wordKey: string): boolean {
  const verseKey = verseOfWord(wordKey)
  return isTest.value ? inAnySpot(verseKey) : inLessonRange.value(verseKey)
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
  const item = effectiveItem.value
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

// A mark can never outlive the bounds it was made in. Switching to test, dropping a
// passage or landing on a different lesson strands whatever was marked outside them:
// a stranded mark still counted toward the live score, still went to the server in a
// straight recitation, and — now that out-of-bounds words are locked — could not even
// be tapped away. Drop them the moment they fall out of range. Watching the bounds
// rather than the marks keeps this clear of `hydrateFromAchievement`, which restores
// the passages first and the marks inside them after.
watch([isTest, spots, lessonRange], () => {
  const stranded = Object.keys(marks.value).filter(k => !wordMarkable(k))
  if (stranded.length) setMarks(stranded, null)
})

// Shortening the range can leave a tested passage outside it — a موضع the mushaf
// no longer shows can't be recited or corrected, and would still divide the score
// by pages that are no longer on screen. So drop any spot that falls out of the
// (possibly adjusted) lesson bounds; extending the range never strands one.
watch(lessonRange, () => {
  const r = lessonRange.value
  if (!r || !spots.value.length) return
  const within = makeRangePredicate(r.startSurah, r.startVerse, r.endSurah, r.endVerse)
  const kept = spots.value.filter(s =>
    within(`${s.startSurah}:${s.startVerse}`) && within(`${s.endSurah}:${s.endVerse}`)
  )
  if (kept.length !== spots.value.length) setSpots(kept)
})

// Route a word tap: define a spot boundary (spot-mode), or mark an error. Both
// modes withhold the handler from out-of-bounds verses (see `lockedAt`), so these
// checks only guard a stray call.
function onWordTap(wordKey: string, verseKey: string) {
  if (isTest.value && captureMode.value === 'spot') {
    if (isVerseTaken(verseKey)) return
    pickBoundary(verseKey)
    return
  }
  if (!wordMarkable(wordKey)) return
  tap(wordKey)
}
// Drag-select marking: keep only the words that may carry an error, so a run that
// strays past the lesson (or past a tested passage) marks nothing outside it.
function onWordsMark(keys: string[], severity: Severity | null) {
  const applied = keys.filter(wordMarkable)
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
// The viewer owns which page of the lesson is on screen; the reader's bars draw
// that position, so its paging state is read back off the exposed instance.
const viewerRef = ref<{
  goToVerse: (verseKey: string) => void
  currentPage: number | undefined
  pages: number[]
  canPrev: boolean
  canNext: boolean
  prev: () => void
  next: () => void
} | null>(null)
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

// The record this session writes to, tracked by id so a range edit — which changes
// the very range `findExistingAchievement` matches on — can't strand it into a
// duplicate. Seeded from the reopen entry point (achievement_id); adopted the
// moment a record is matched by range or created by a save.
const boundAchievementId = ref<number | null>(null)
watch(achievementId, (id) => {
  boundAchievementId.value = id
}, { immediate: true })

// Resolve the achievement backing this session: the bound id if we have one, else
// a match on the PLANNED range (what the server still holds before the first save
// under an adjusted range). `selectedItem`, not `effectiveItem`, on purpose.
function resolveExisting(): ApiAchievement | null {
  const bound = boundAchievementId.value
  if (bound != null) {
    const byId = priorAchievements.value.find(a => a.id === bound)
    if (byId) return byId
  }
  return selectedItem.value ? findExistingAchievement(selectedItem.value) : null
}

// The achievement backing the current session, and whether it's approved — the
// primary toolbar action turns into "unapprove" once it is.
const existingAchievement = computed(() => resolveExisting())

// Once a record resolves by range, pin it by id so subsequent range edits stay
// bound to it rather than looking for a (now non-existent) planned-range match.
watch(existingAchievement, (a) => {
  if (a && boundAchievementId.value == null) boundAchievementId.value = a.id
}, { immediate: true })
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

// ── Finishing the session ───────────────────────────────────────────────────
// The session has two endings, and the sheet offers both side by side: «حفظ»
// stores the recitation and leaves it pending for review, «اعتماد» signs it off.
// Both end the visit and return to the achievements list — they are endings, not
// checkpoints; autosync is what keeps a session safe while it is still being
// recited. Neither goes through a confirmation: the sheet already shows the
// range, the method and the full error tally, so the tap is made on the facts,
// and an approval can be undone from the same button.
const savingOnly = ref(false)
// Either explicit write. `submitting` stays the approve button's own state — the
// two must not share a flag, or one tap spins both buttons.
const writeInFlight = computed(() => submitting.value || savingOnly.value)

function reportFinishError(e: unknown, title: string) {
  const err = e as { data?: { message?: string }, message?: string }
  toast.add({
    title,
    description: apiError.format(err, err.message || 'حدث خطأ غير معروف'),
    color: 'error',
    icon: 'i-lucide-alert-circle'
  })
}

// «حفظ» — the recitation is stored (created or updated) and stays pending, then
// the teacher is returned to the achievements list. Nothing is cleared: the
// record keeps its marks and reopening the session hydrates them back.
async function onToolbarSave() {
  const item = effectiveItem.value
  if (!item || !studentId.value || !halaqaId.value || savingOnly.value || submitting.value) return
  savingOnly.value = true
  try {
    await saveSessionOnly(item, studentId.value, halaqaId.value)
  } catch (e) {
    // Stay on the mushaf: the marks are still here and the next autosync tick
    // will retry the write.
    reportFinishError(e, 'خطأ في حفظ التلاوة')
    return
  } finally {
    savingOnly.value = false
  }
  // Redirect lives outside the try so a failure there can't be reported as a
  // failed save. The setup-captured router, not navigateTo — the Nuxt instance
  // context is lost after the awaits.
  await router.push('/achievements')
}

// Toolbar primary action: approve a fresh/pending recitation, or unapprove one
// that's already approved.
function onToolbarSubmit() {
  if (isApproved.value) {
    // The unapprove confirmation is a modal, and the sheet is stacked above every
    // other overlay (it has to clear the reader) — so it steps aside first.
    sheetOpen.value = false
    onUnapproveRequest()
    return
  }
  void onApprove()
}

async function onApprove() {
  const item = effectiveItem.value
  if (!item || !studentId.value || !halaqaId.value || savingOnly.value || submitting.value) return
  try {
    await postAchievement(item, studentId.value, halaqaId.value)
  } catch (e) {
    reportFinishError(e, 'خطأ في حفظ الإنجاز')
    return
  }
  // Redirect lives outside the try so a failure there can't be reported as a
  // failed save. The setup-captured router, not navigateTo — the Nuxt instance
  // context is lost after the awaits.
  await router.push('/achievements')
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
  // once when it doesn't rather than assuming the write took. Offline there's no
  // way to read it back — trust the optimistic write instead of failing.
  let record = saved
  if (!record.recitation_positions) {
    if (import.meta.client && !navigator.onLine) return
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
// Build the create DTO + score for the chosen method, shared by the online
// save and the offline draft. `test` sends one position per tested spot (each
// with its own errors); `full` sends the whole-range errors.
async function buildRecitationWrite(
  item: ApiWeeklyPlanItem, sid: number, hid: number
): Promise<{ dto: CreateAchievementDto, sentErrors: PositionError[], sentPositions: number }> {
  const settings = await loadEvaluationSettings(hid)

  let payload: { errors?: PositionError[], test_positions?: AchievementTestPosition[] }
  let score: number
  let sentErrors: PositionError[]
  let sentPositions = 0
  // Weights are per mushaf page — a longer lesson divides each deduction by
  // the number of pages it spans.
  const pages = lessonPages.value
  // Stored alongside the record (الصفحات الكلية). Distinct from `pages` above:
  // this is the breadth of the whole lesson range, never the tested subset —
  // the موضع pages ride inside each test position (see buildTestPositions).
  const totalPages = pagesForRange(item)
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
    percentage_score: score,
    total_pages: totalPages
  }
  return { dto, sentErrors, sentPositions }
}

// Offline: persist the session as a single local draft (create-only). Blocks
// when a real server record already backs the session — editing it offline
// can't be reconciled and a blind create would duplicate it. Returns whether a
// draft was written.
async function saveRecitationOffline(
  item: ApiWeeklyPlanItem, sid: number, hid: number, approve: boolean
): Promise<'drafted' | 'blocked'> {
  if (resolveExisting()) return 'blocked'
  const { dto } = await buildRecitationWrite(item, sid, hid)
  await saveRecitationDraft(sessionId.value, dto, approve)
  return 'drafted'
}

async function saveRecitation(
  item: ApiWeeklyPlanItem, sid: number, hid: number
): Promise<ApiAchievement> {
  const { dto, sentErrors, sentPositions } = await buildRecitationWrite(item, sid, hid)
  // Reuse the create DTO's payload for the update path.
  const payload = dto.test_positions
    ? { test_positions: dto.test_positions }
    : { errors: dto.errors }
  const score = dto.percentage_score
  const totalPages = dto.total_pages

  const existing = resolveExisting()

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
        percentage_score: score,
        total_pages: totalPages
      }
    })
    priorAchievements.value = priorAchievements.value.map(a => a.id === existing.id ? saved : a)
  } else {
    saved = await api<ApiAchievement>('/achievements', { method: 'POST', body: dto })
    priorAchievements.value = [saved, ...priorAchievements.value]
  }

  // Anchor to this record by id: after a save under an adjusted range the stored
  // range no longer matches the plan, so only the id can find it again.
  boundAchievementId.value = saved.id

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

type SyncStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline'
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
  // The recited range is part of what's stored, so an extend/shorten is a change
  // the backend must hear about even when no mark moved — otherwise a range-only
  // adjustment on a session that already has marks would never sync.
  range: effectiveItem.value
    ? [effectiveItem.value.start_surah, effectiveItem.value.start_verse, effectiveItem.value.end_surah, effectiveItem.value.end_verse]
    : null,
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
  const item = effectiveItem.value
  const sid = studentId.value
  const hid = halaqaId.value
  if (!item || !sid || !hid) return

  // Snapshot first: marks made *during* the request belong to the next tick, and
  // adopting the post-request state would silently swallow them.
  const attempted = currentSignature.value
  // Read before the state changes: it decides whether this failure is the start
  // of a streak (and so worth a toast) or another tick of one already reported.
  const wasFailing = syncStatus.value === 'error'

  // Offline: keep the recitation as a local draft (overwritten each tick, so no
  // duplicate creates) and sync it once on reconnect. A session already backed
  // by a server record can't be drafted safely — leave it dirty to retry online.
  if (!online.value) {
    try {
      const res = await saveRecitationOffline(item, sid, hid, false)
      if (res === 'drafted') {
        lastSyncedSignature.value = attempted
        syncStatus.value = 'offline'
      } else {
        syncStatus.value = 'error'
      }
    } catch {
      syncStatus.value = 'error'
    }
    return
  }

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
  // Never overlap: a tick still in flight, or either explicit write (حفظ /
  // اعتماد), owns the record until it's done.
  if (syncInFlight || writeInFlight.value) return
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
  if (!syncInFlight && !writeInFlight.value && canAutosync.value && isDirty.value && hasSomethingToSync.value) {
    void runSync()
  }
})

// Switching session resets the mushaf; the new session's baseline is its own.
watch(sessionId, () => {
  lastSyncedSignature.value = null
  syncStatus.value = 'idle'
  lastSyncedAt.value = null
  // A range adjustment belongs to the session it was made in — start the next one
  // on its own planned range, bound to its own record (the reopen id, if any).
  rangeOverride.value = null
  rangeEditorOpen.value = false
  boundAchievementId.value = achievementId.value
})

// What the header chip shows. `saving`/`error` speak for themselves; `saved`
// carries the time so a teacher can tell at a glance how current it is.
const syncLabel = computed(() => {
  if (syncStatus.value === 'saving') return 'جارٍ الحفظ…'
  if (syncStatus.value === 'offline') return 'محفوظ محليًا — يُزامَن عند عودة الاتصال'
  if (syncStatus.value === 'error') return 'تعذّر الحفظ — إعادة المحاولة'
  if (isDirty.value && hasSomethingToSync.value) return 'تغييرات غير محفوظة'
  if (syncStatus.value === 'saved') return `تم الحفظ ${lastSyncedAt.value}`
  return 'حفظ تلقائي'
})

// The explicit «حفظ»: the same write autosync makes, but on demand and without
// the two conditions autosync imposes on itself (it only fires when the mushaf
// has something on it). Nothing is approved and nothing is cleared, so the record
// stays pending with the marks still on screen.
// `submitting` is deliberately untouched — it is the approve button's own state,
// and setting it here spun both buttons at once. `savingOnly`, set by the caller,
// is what marks this write as in flight.
async function saveSessionOnly(item: ApiWeeklyPlanItem, sid: number, hid: number) {
  // Snapshot before the request: marks made while it is in flight belong to the
  // next tick, and adopting the post-request state would swallow them.
  const attempted = currentSignature.value

  // Offline: save the recitation locally; it syncs on reconnect.
  if (!online.value) {
    await syncInFlight
    const res = await saveRecitationOffline(item, sid, hid, false)
    if (res === 'blocked') {
      throw new Error('لا يمكن تعديل إنجاز محفوظ مسبقًا دون اتصال بالإنترنت.')
    }
    lastSyncedSignature.value = attempted
    syncStatus.value = 'offline'
    toast.add({
      description: 'أنت غير متصل — سيُحفظ التلاوة تلقائيًا عند عودة الاتصال.',
      color: 'info'
    })
    return
  }

  syncStatus.value = 'saving'
  try {
    // An autosync tick may be mid-flight on this very session — let it finish so
    // its create can't race this one into a duplicate record.
    await syncInFlight
    const saved = await saveRecitation(item, sid, hid)
    hydratedFor.value = String(saved.id)
    lastSyncedSignature.value = attempted
    lastSyncedAt.value = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    syncStatus.value = 'saved'
    toast.add({
      description: 'تم حفظ التلاوة — الإنجاز قيد المراجعة ولم يُعتمد بعد.',
      color: 'success'
    })
  } catch (e) {
    // Left dirty on purpose: the next autosync tick retries what this failed to
    // write, exactly as it would after a failed tick.
    syncStatus.value = 'error'
    throw e
  }
}

async function postAchievement(item: ApiWeeklyPlanItem, sid: number, hid: number) {
  submitting.value = true
  try {
    // An autosync tick may be mid-flight on this very session — let it finish so
    // its create can't race this one into a duplicate record.
    await syncInFlight

    // Offline: draft the recitation with the approve intent. On reconnect it is
    // created and then approved in one pass (see useAchievementDrafts.flush).
    if (!online.value) {
      const res = await saveRecitationOffline(item, sid, hid, true)
      if (res === 'blocked') {
        throw new Error('لا يمكن اعتماد إنجاز محفوظ مسبقًا دون اتصال بالإنترنت.')
      }
      clearAll()
      if (isTest.value) clearSpots()
      markSynced()
      syncStatus.value = 'offline'
      toast.add({
        description: 'أنت غير متصل — سيُحفظ الإنجاز ويُعتمد تلقائيًا عند عودة الاتصال.',
        color: 'info'
      })
      return
    }

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

// ── Reader chrome ───────────────────────────────────────────────────────────
// The reader has two shapes, not one shape restyled — so the breakpoint is read
// in JS rather than left to CSS. On a phone the page is the screen: a thin bar
// top and bottom, the mushaf filling everything between, the session's identity
// behind the header's middle button and the committing actions behind
// «إنهاء التسميع». On a desktop there is room for all of it at once, so the
// controls stand in a rail beside the page and neither drawer nor modal is built
// at all — see MushafReaderControls.
const isDesktop = useMediaQuery('(min-width: 1024px)')
const sheetOpen = ref(false)
const sessionPanelOpen = ref(false)

// Header wording for the session, shared by the phone's modal and the rail's head.
const sessionStatusLabel = computed(() => {
  if (isParentReadOnly.value) return 'تلاوة اليوم — للعرض فقط'
  return isApproved.value ? 'تلاوة في المصحف — معتمد (للعرض)' : 'تلاوة في المصحف'
})
const displayStudentName = computed(() =>
  studentPending.value && !studentName.value
    ? '…'
    : (studentName.value ?? `طالب #${studentId.value}`)
)

// The day's records, pre-labelled: MushafPriorList renders the same rows in the
// modal and in the rail, and the label helpers live here.
const priorRows = computed(() => priorAchievements.value.map(a => ({
  id: a.id,
  track: a.track_type as AchievementTrack,
  trackLabel: trackLabel(a.track_type),
  range: rangeLabel(a),
  mistakes: a.mistakes_count ?? 0,
  warnings: a.warnings_count ?? 0,
  harakat: a.harakat_errors_count ?? 0
})))

const currentPage = computed(() => viewerRef.value?.currentPage)
const lessonPageCount = computed(() => viewerRef.value?.pages.length ?? 0)
const pagePosition = computed(() => {
  const pages = viewerRef.value?.pages
  const page = currentPage.value
  if (!pages || !page) return 0
  return pages.indexOf(page) + 1
})

const { surahName: currentSurahName, juz: currentJuz, hizb: currentHizb } = useMushafPageMeta(currentPage)

// Paging by keyboard, desktop only — a phone has the swipe, and a desktop had
// nothing but the two small buttons in the rail. Mirrored for RTL, like the swipe
// and like the nav buttons' own chevrons: left turns to the next page.
function onReaderKey(e: KeyboardEvent) {
  if (!isDesktop.value || e.ctrlKey || e.metaKey || e.altKey) return
  const el = e.target as HTMLElement | null
  // Never steal the arrow keys from something being typed into or chosen from.
  if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
  if (e.key === 'ArrowLeft') viewerRef.value?.next()
  else if (e.key === 'ArrowRight') viewerRef.value?.prev()
  else return
  e.preventDefault()
}
onMounted(() => window.addEventListener('keydown', onReaderKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onReaderKey))

// ── Clearing ────────────────────────────────────────────────────────────────
// «مسح» wipes the page on screen, not the whole lesson: a long revision is marked
// page by page, and a teacher correcting the page in front of them must not lose
// the pages already recited. The page's own layout data says which words are on
// it — the same source the mushaf renders from, so what the button clears is
// exactly what is visible. It comes from the module-level page cache the reader
// already filled, so this costs no extra request.
const { page: currentPageData } = useMushafPage(() => currentPage.value ?? 0)

const currentPageWordKeys = computed<WordKey[]>(() => {
  const data = currentPageData.value
  if (!data) return []
  const keys: WordKey[] = []
  for (const line of data.lines) {
    // Ayah ornaments (`e`) are never marked — no point offering them for clearing.
    for (const word of line.words) if (word.t !== 'e') keys.push(`${word.k}:${word.p}`)
  }
  return keys
})

const pageMarkCount = computed(() =>
  currentPageWordKeys.value.reduce((n, key) => n + (marks.value[key] ? 1 : 0), 0)
)

function clearCurrentPage() {
  const keys = currentPageWordKeys.value
  if (!keys.length) return
  // `setMarks(..., null)` is the same unmark the drag picker uses: it drops the
  // words' block membership too, so a run that straddles two pages keeps working
  // as a block on the page that still has it.
  setMarks(keys, null)
}

// Marking must never be one mis-tap from a wipe or an approval, so the drawer that
// holds them shuts again as soon as the teacher goes back to the mushaf.
watch(selectedItem, () => {
  sheetOpen.value = false
})
</script>

<template>
  <!--
    The reader. On a phone it takes the whole viewport — over the dashboard navbar,
    not inside it — so the mushaf reads the way a printed page does. From `lg` it
    drops back in flow inside the dashboard panel as a workspace: the page on the
    reading side, every control standing in the rail beside it.
  -->
  <div
    v-if="!missingArgs && selectedItem"
    class="reader"
  >
    <MushafReaderTopBar
      :surah-name="currentSurahName"
      :juz="currentJuz"
      :muted="markingLocked"
      :show-menu="!isDesktop"
      @back="router.push('/achievements')"
      @menu="sessionPanelOpen = true"
    />

    <div class="reader__main">
      <div class="reader__body">
        <MushafRangeViewer
          ref="viewerRef"
          :start-surah="effectiveItem!.start_surah"
          :start-verse="effectiveItem!.start_verse"
          :end-surah="effectiveItem!.end_surah"
          :end-verse="effectiveItem!.end_verse"
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

        <!-- Turning the page with a mouse. The phone swipes and the rail has its
             pager; a desktop reader reaches for the margin of the sheet, so the
             margins are where the controls go. -->
        <template v-if="isDesktop && lessonPageCount > 1">
          <button
            type="button"
            class="reader__turn reader__turn--prev"
            :disabled="!viewerRef?.canPrev"
            aria-label="الصفحة السابقة"
            @click="viewerRef?.prev()"
          >
            <UIcon name="i-lucide-chevron-right" class="size-5" />
          </button>
          <button
            type="button"
            class="reader__turn reader__turn--next"
            :disabled="!viewerRef?.canNext"
            aria-label="الصفحة التالية"
            @click="viewerRef?.next()"
          >
            <UIcon name="i-lucide-chevron-left" class="size-5" />
          </button>
        </template>
      </div>

      <MushafReaderControls
        v-model:expanded="sheetOpen"
        :desktop="isDesktop"
        :page="currentPage"
        :hizb="currentHizb"
        :score="showToolbar ? liveScore : undefined"
        :sync-status="syncStatus"
        :sync-label="syncLabel"
        :sync-pending="isDirty && hasSomethingToSync"
        :show-sync="canAutosync || syncStatus !== 'idle'"
        :position="pagePosition"
        :total-pages="lessonPageCount"
        :can-prev="viewerRef?.canPrev"
        :can-next="viewerRef?.canNext"
        :show-finish="showToolbar"
        @prev="viewerRef?.prev()"
        @next="viewerRef?.next()"
      >
        <!-- The rail's head. On a phone the same three facts are the body of the
             session modal, opened from the top bar. -->
        <template v-if="isDesktop" #session>
          <MushafSessionIdentity
            :status-label="sessionStatusLabel"
            :student-name="displayStudentName"
            :date="dateStr"
            :track="currentTrack"
            :track-label="currentTrack ? trackLabel(currentTrack) : null"
            :range="rangeLabel(effectiveItem!)"
          />
        </template>

        <!--
          اختبار capture steers the mushaf itself — which tap defines a موضع and which
          marks an error — so it stays on screen with the sheet shut. Everything below
          only matters once the teacher is done reciting.
        -->
        <template v-if="isTest && !isParentReadOnly && !markingLocked" #context>
          <div dir="rtl" class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
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
          </div>
        </template>

        <!--
          One section per decision, each a label at the start edge and its control at
          the end, so the sheet scans as a settings list. The sheet draws the rules
          between them; sections bring no spacing of their own.
        -->

        <!-- Recitation method: full recitation vs. partial test. The selector is
             replaced by a locked reading when the method can't be changed (approved
             view, or حفظ جديد which is always a full recitation). -->
        <section
          v-if="(showMethodSelector && !markingLocked) || (!isParentReadOnly && currentTrack === 'Hifz')"
          dir="rtl"
          class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
        >
          <span class="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted">
            <UIcon name="i-lucide-list-checks" class="size-3.5" />
            نوع التسميع
          </span>

          <div
            v-if="showMethodSelector && !markingLocked"
            class="inline-flex rounded-lg border border-default bg-default p-0.5"
          >
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
          <span
            v-else
            class="inline-flex items-center gap-1.5 rounded-lg border border-default px-2.5 py-1.5 text-xs text-muted"
          >
            <UIcon name="i-lucide-lock" class="size-3.5" />
            تسميع كامل — إلزامي للحفظ الجديد
          </span>
        </section>

        <!-- Extend or shorten the session on the fly: the range came from the plan,
             but the recitation itself decides where it ends. Editing here re-bounds
             the mushaf, the score and the saved record together. Read-only for
             parents and for an approved record (unapprove to adjust). -->
        <section
          v-if="!isParentReadOnly && effectiveItem"
          dir="rtl"
          class="flex flex-col gap-2"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted">
              <UIcon name="i-lucide-move-horizontal" class="size-3.5" />
              نطاق التسميع
            </span>
            <div class="flex min-w-0 items-center gap-1.5">
              <UBadge color="neutral" variant="subtle" size="sm" class="truncate">
                {{ rangeLabel(effectiveItem) }}
              </UBadge>
              <UButton
                v-if="!markingLocked"
                size="xs"
                :variant="rangeEditorOpen ? 'solid' : 'soft'"
                color="neutral"
                class="shrink-0"
                :icon="rangeEditorOpen ? 'i-lucide-check' : 'i-lucide-pencil'"
                @click="rangeEditorOpen = !rangeEditorOpen"
              >
                {{ rangeEditorOpen ? 'تم' : 'تعديل' }}
              </UButton>
            </div>
          </div>

          <template v-if="rangeEditorOpen && !markingLocked">
            <PlannerSessionRangeFields :range="effectiveRange" stacked @update="applyRangeEdit" />
            <div class="flex items-center justify-between gap-2">
              <p class="min-w-0 flex-1 text-[11px] text-muted">
                مدّ النطاق ليسمّع الطالب أكثر، أو قصّره ليتوقف قبل نهاية المقرر.
              </p>
              <UButton
                v-if="rangeAdjusted"
                size="xs"
                variant="ghost"
                color="neutral"
                class="shrink-0"
                icon="i-lucide-rotate-ccw"
                @click="resetRange"
              >
                استعادة المخطط
              </UButton>
            </div>
          </template>
          <p v-else-if="rangeAdjusted" class="inline-flex items-center gap-1.5 text-[11px] text-warning">
            <UIcon name="i-lucide-pencil-line" class="size-3" />
            نطاق معدّل عن الخطة الأصلية.
          </p>
        </section>

        <!-- The tested مواضع, each a jump target into the mushaf. -->
        <section
          v-if="isTest && !isParentReadOnly && (spots.length > 0 || !markingLocked)"
          dir="rtl"
          class="flex flex-col gap-2"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
              <UIcon name="i-lucide-map-pin" class="size-3.5" />
              المواضع المختبرة
            </span>
            <span
              v-if="spots.length"
              class="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted"
            >{{ spots.length }}</span>
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
                @click="focusSpot(s); sheetOpen = false"
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
                <UIcon name="i-lucide-x" class="size-3.5" />
              </button>
            </span>
          </div>
          <p v-else class="text-xs text-muted">
            لا مواضع بعد — حدّد موضعًا واحدًا على الأقل للاختبار.
          </p>
        </section>

        <!-- The tally is a reading, so it stays with the other rows … -->
        <MushafMarkSummary v-if="showToolbar" :counts="counts" />

        <!-- The rail has no collapsed bar to carry the day's records, so they come
             down here as one more section. On a phone they stay in the modal. -->
        <MushafPriorList v-if="isDesktop" :items="priorRows" />

        <!-- … and only the actions go to the footer, below the rule. -->
        <template v-if="showToolbar" #actions>
          <MushafMarkToolbar
            :can-clear="pageMarkCount > 0"
            :can-submit="canSubmit"
            :submitting="submitting"
            :saving="savingOnly"
            :approved="isApproved"
            :stacked="isDesktop"
            @clear="clearCurrentPage"
            @save="onToolbarSave"
            @submit="onToolbarSubmit"
          />
        </template>
      </MushafReaderControls>
    </div>

    <!-- Who, which lesson, and what has already been recorded today — everything
         the old header bar carried, moved off the reading surface. Never built on
         a desktop: the rail shows all of it without being asked. -->
    <UModal v-if="!isDesktop" v-model:open="sessionPanelOpen" :ui="{ content: 'sm:max-w-md' }">
      <template #header>
        <div class="flex items-start justify-between gap-3 w-full" dir="rtl">
          <MushafSessionIdentity
            class="min-w-0"
            :status-label="sessionStatusLabel"
            :student-name="displayStudentName"
            :date="dateStr"
            :track="currentTrack"
            :track-label="currentTrack ? trackLabel(currentTrack) : null"
            :range="rangeLabel(effectiveItem!)"
          />
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            :aria-label="'إغلاق'"
            @click="sessionPanelOpen = false"
          />
        </div>
      </template>

      <template #body>
        <div class="flex flex-col gap-3" dir="rtl">
          <!-- Autosync state: the marks are written to the backend on their own, so
               say plainly whether the server currently has them. -->
          <div
            v-if="canAutosync || syncStatus !== 'idle'"
            class="flex items-center gap-1.5 text-xs"
            :class="syncStatus === 'error' ? 'text-warning' : 'text-muted'"
          >
            <UIcon
              :name="syncStatus === 'saving'
                ? 'i-lucide-loader-2'
                : (syncStatus === 'error' ? 'i-lucide-cloud-off' : (isDirty && hasSomethingToSync ? 'i-lucide-cloud' : 'i-lucide-cloud-check'))"
              class="w-3.5 h-3.5"
              :class="syncStatus === 'saving' ? 'animate-spin' : ''"
            />
            {{ syncLabel }}
          </div>

          <MushafPriorList :items="priorRows" />
        </div>
      </template>
    </UModal>
  </div>

  <!-- Nothing to read yet. These keep the ordinary page layout: a full-screen
       empty state with no navigation would be a dead end. -->
  <div v-else class="flex flex-col gap-3 w-full max-w-[640px] mx-auto pb-6">
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

    <div v-else-if="planLoading" class="flex items-center justify-center gap-2 py-6 text-sm text-muted">
      <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
      جارٍ تحميل خطة اليوم…
    </div>

    <div v-else-if="planError" class="flex items-center justify-center gap-2 py-6 text-sm text-error" dir="ltr">
      <UIcon name="i-lucide-alert-triangle" class="w-4 h-4" />
      Couldn't load this week's plan — {{ planError.message }}
    </div>

    <div
      v-else-if="!plan"
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
      v-else
      class="mx-auto max-w-sm w-full flex flex-col items-center gap-2 text-center px-6 py-8 rounded-2xl border border-default bg-default"
    >
      <UIcon name="i-lucide-coffee" class="w-8 h-8 text-muted opacity-70" />
      <p class="text-sm font-medium">
        لا يوجد مقرر مخطط لهذا اليوم.
      </p>
    </div>
  </div>
</template>

<style scoped>
.reader {
  position: fixed;
  inset: 0;
  /* Above UDashboardNavbar, which the reader deliberately covers on a phone. */
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: var(--color-mushaf-bg);
  /* Nothing in the reader is meant to be selected — every drag here is a marking
     gesture, and a stray text selection leaves highlight the teacher then has to
     tap away. Inputs opt back in below. */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

/* Anything the user actually types into keeps native selection. `:deep` because
   the fields live inside child components, past the scope attribute. */
.reader :deep(input),
.reader :deep(textarea) {
  user-select: text;
  -webkit-user-select: text;
}

/* The two columns of the desktop workspace; on a phone simply the stack between
   the two bars. */
.reader__main {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.reader__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

@media (min-width: 1024px) {
  /* Back in flow inside the dashboard panel, but claiming the panel's full height
     rather than growing to whatever 15 lines come to. The panel body is a flex
     column of definite height, so the reader can hand a real height down to the
     mushaf and the page fits the screen the way it does on a phone.
     A framed surface rather than bare content: the top bar, the page and the rail
     are one instrument, and the border is what says so. */
  .reader {
    position: static;
    z-index: auto;
    inset: auto;
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    max-width: none;
    margin: 0;
    background: var(--color-mushaf-bg);
    border: 1px solid var(--color-mushaf-border);
    border-radius: 14px;
    overflow: hidden;
  }

  /* `direction: rtl` and not `row-reverse`: the reading side is the start side, so
     the mushaf takes the right of the workspace and the rail the left — away from
     the dashboard's own sidebar, which is on the right. Written as direction so
     the rail's `border-inline-start` lands between the two columns. */
  .reader__main {
    flex-direction: row;
    direction: rtl;
  }

  .reader__body {
    /* The page is height-driven and fits whole, so nothing here scrolls. */
    overflow: hidden;
    min-width: 0;
    /* Room for the page's shadow and for the turn buttons to sit in the margin. */
    padding: 1rem 3.25rem;
    position: relative;
  }

  /* Page turns live in the margin either side of the sheet — the desktop
     equivalent of the phone's swipe. Quiet until the pointer is near them. */
  .reader__turn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    /* A gutter rather than a lone chevron: at the width of the margin it sits in,
       and tall enough that the pointer finds it without aiming. */
    height: min(45%, 20rem);
    border-radius: 12px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-mushaf-muted);
    cursor: pointer;
    opacity: 0.55;
    transition: opacity 0.12s, background-color 0.12s, border-color 0.12s;
  }

  .reader__turn:not(:disabled):hover {
    opacity: 1;
    background: var(--color-mushaf-chrome);
    border-color: var(--color-mushaf-border);
  }

  .reader__turn:disabled {
    opacity: 0.15;
    cursor: not-allowed;
  }

  /* «prev» is the lower page number, which in a mushaf is the sheet to the right —
     and the column is laid out RTL, so that is the inline start. */
  .reader__turn--prev {
    inset-inline-start: 0.5rem;
  }

  .reader__turn--next {
    inset-inline-end: 0.5rem;
  }
}
</style>
