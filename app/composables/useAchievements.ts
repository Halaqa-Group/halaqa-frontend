import { computed, reactive, ref } from 'vue'
import type {
  ApiAchievement, ApiAttendance, ApiAttendanceListResult, ApiHalaqaDetail, ApiStudent,
  ApiStudentListResult, StudentWithAttendance, CreateAchievementDto,
  AchievementErrorType, AchievementTestPosition, PositionError
} from '~/types'
import type { MarkGroups, RecitationMarks, Severity, WordKey } from '~/types/recitation'
import { SEVERITY_LEVELS } from '~/types/recitation'
import type { TestSpot } from '~/composables/useTestSpots'
import { unwrapList } from '~/utils/api/list'
import { makeRangePredicate } from '~/utils/mushaf'
import { computePercentageScore, type ScoreCounts } from '~/utils/score'
import { ensureQuranWordData, locateError, wordId } from '~/utils/quran-words'

interface VerseRangeLike {
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
}

// Tally the error types from an itemized errors[] list — the backend derives the
// same counts server-side; we mirror it to compute the score and to hydrate the
// numeric quick-entry form. Legacy `tajweed` rows on older records are ignored:
// the type is retired on the frontend.
export function tallyErrors(errors: PositionError[] | undefined | null): ScoreCounts {
  const c: ScoreCounts = {
    mistakes_count: 0, warnings_count: 0, harakat_errors_count: 0
  }
  for (const e of errors ?? []) {
    if (e.error_type === 'mistake') c.mistakes_count++
    else if (e.error_type === 'warning') c.warnings_count++
    else if (e.error_type === 'harakat') c.harakat_errors_count++
  }
  return c
}

// Quick-entry form: the teacher types how many of each error type occurred, with
// no per-word location. We synthesize one error row per occurrence, all located
// at the range's start word — enough to satisfy the backend (the (surah,ayah)
// falls within the achievement range and end_word_id >= start_word_id).
export async function buildErrorsFromCounts(
  counts: ScoreCounts,
  range: VerseRangeLike
): Promise<PositionError[]> {
  await ensureQuranWordData()
  const loc = locateError(range.start_surah, range.start_verse)
  const errors: PositionError[] = []
  const push = (type: AchievementErrorType, n: number) => {
    for (let i = 0; i < n; i++) errors.push({ error_type: type, ...loc })
  }
  push('mistake', counts.mistakes_count)
  push('warning', counts.warnings_count)
  push('harakat', counts.harakat_errors_count)
  return errors
}

// Mushaf flow: each standalone marked word becomes one precisely-located error.
// A drag-selected block (words sharing a group id) becomes a SINGLE error spanning
// the run instead of one error per word. The marking spectrum has no harakat
// notion, so this only emits mistake/warning (green `minor` is dropped).
export async function buildErrorsFromMarks(
  marks: Readonly<RecitationMarks>,
  groups: Readonly<MarkGroups> = {}
): Promise<PositionError[]> {
  await ensureQuranWordData()
  const errors: PositionError[] = []
  // Collect grouped words by block id; emit standalone words immediately.
  const blocks = new Map<string, { severity: Severity, words: Array<[number, number, number]> }>()

  for (const [key, severity] of Object.entries(marks)) {
    const slot = SEVERITY_LEVELS.find(l => l.key === severity)?.scoreSlot
    if (!slot || slot === 'none') continue
    // key = "surah:ayah:position"
    const [s, a, p] = key.split(':').map(Number)
    if (!s || !a || !p) continue

    const groupId = groups[key]
    if (groupId) {
      const block = blocks.get(groupId) ?? { severity, words: [] }
      block.words.push([s, a, p])
      blocks.set(groupId, block)
      continue
    }
    errors.push({ error_type: slot as AchievementErrorType, ...locateError(s, a, p) })
  }

  // One error per block: span start→end when the run stays within one ayah,
  // otherwise anchor it at the run's first word.
  for (const { severity, words } of blocks.values()) {
    const slot = SEVERITY_LEVELS.find(l => l.key === severity)?.scoreSlot
    if (!slot || slot === 'none' || !words.length) continue
    const sorted = words.slice().sort((x, y) => wordId(x[0], x[1], x[2]) - wordId(y[0], y[1], y[2]))
    const [s1, a1, p1] = sorted[0]!
    const [s2, a2, p2] = sorted[sorted.length - 1]!
    const loc = s1 === s2 && a1 === a2 ? locateError(s1, a1, p1, p2) : locateError(s1, a1, p1)
    errors.push({ error_type: slot as AchievementErrorType, ...loc })
  }

  return errors
}

// Test flow: partition the session marks by tested spot. For each spot we keep
// only the marks (and their group links) whose verse falls inside it, then build
// that spot's itemized errors — yielding one test_position per spot. Marks that
// fall outside every spot are dropped (they weren't part of a tested passage).
export async function buildTestPositions(
  spots: readonly TestSpot[],
  marks: Readonly<RecitationMarks>,
  groups: Readonly<MarkGroups> = {}
): Promise<AchievementTestPosition[]> {
  await ensureQuranWordData()
  const positions: AchievementTestPosition[] = []
  for (const spot of spots) {
    const within = makeRangePredicate(spot.startSurah, spot.startVerse, spot.endSurah, spot.endVerse)
    const spotMarks: RecitationMarks = {}
    const spotGroups: MarkGroups = {}
    for (const [key, severity] of Object.entries(marks)) {
      // key = "surah:ayah:position" → verseKey "surah:ayah"
      const [s, a] = key.split(':')
      if (!within(`${s}:${a}`)) continue
      spotMarks[key] = severity
      const g = groups[key]
      if (g) spotGroups[key] = g
    }
    positions.push({
      start_surah: spot.startSurah,
      start_verse: spot.startVerse,
      end_surah: spot.endSurah,
      end_verse: spot.endVerse,
      errors: await buildErrorsFromMarks(spotMarks, spotGroups)
    })
  }
  return positions
}

// Inverse of buildErrorsFromMarks: reconstruct the mushaf marking runs from a
// saved achievement's itemized errors, so reopening a recitation shows exactly
// the words that were marked (the local marks are cleared on submit). Each run is
// a contiguous word span + severity, ready to feed `setMarks` (a multi-word span
// re-forms as one drag-block). The severity is the inverse of the severity →
// scoreSlot(error_type) map. 'harakat' has no mushaf-severity equivalent (it's
// only produced by the numeric quick-entry form), so those errors are skipped —
// as are legacy 'tajweed' rows, whose severity level no longer exists.
export async function buildMarkRunsFromErrors(
  errors: readonly PositionError[]
): Promise<Array<{ keys: WordKey[], severity: Severity }>> {
  await ensureQuranWordData()
  const runs: Array<{ keys: WordKey[], severity: Severity }> = []
  for (const e of errors) {
    const severity = SEVERITY_LEVELS.find(l => l.scoreSlot === e.error_type)?.key
    if (!severity) continue
    // Positions within the ayah: word ids are global, so subtract the ayah's
    // first word id (position 1) to get the 1-based position back.
    const first = wordId(e.surah, e.ayah, 1)
    const startPos = Math.max(1, e.start_word_id - first + 1)
    const endPos = Math.max(startPos, e.end_word_id - first + 1)
    const keys: WordKey[] = []
    for (let p = startPos; p <= endPos; p++) keys.push(`${e.surah}:${e.ayah}:${p}`)
    if (keys.length) runs.push({ keys, severity })
  }
  return runs
}

type TrackType = 'Hifz' | 'Near' | 'Far'

function todayYmd(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const students = ref<StudentWithAttendance[]>([])
const achievements = ref<ApiAchievement[]>([])
const selectedDate = ref(todayYmd())
const isLoading = ref(false)
const isSaving = ref(false)

const total = ref(0)
const page = ref(1)
const limit = ref(20)

const viewMode = ref<'table' | 'grid'>('table')
const filters = reactive<{ search: string, trackType: TrackType | null, status: 'approved' | 'unapproved' | null }>({
  search: '',
  trackType: null,
  status: null
})

const editing = ref<ApiAchievement | null>(null)
const duplicateFrom = ref<ApiAchievement | null>(null)
// Pre-selects the student when recording a fresh achievement (e.g. launched
// from the planner's cell dialog). Cleared by openRecord for the plain "+" flow.
const prefillStudentId = ref<number | null>(null)

export interface PrefillPlanItem {
  // The plan item's id, or null for an unsaved draft session (range-only prefill).
  id: number | null
  track_type: TrackType
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
}
// Pre-selects the planned lesson (track + range) when recording from the
// planner's cell dialog, so the teacher doesn't re-pick it. Kept selected even
// when the lesson's weekday differs from the record date. Cleared by openRecord.
const prefillPlanItem = ref<PrefillPlanItem | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<ApiAchievement | null>(null)

const settingsCache = new Map<number, Record<string, unknown> | null>()
const currentEvaluationSettings = ref<Record<string, unknown> | null>(null)

// Weights are fetched once per halaqa and reused for every score computed in the
// session. Editing them on the halaqa page has to seed the new value here, or
// the next achievement would still be scored with the old deductions.
export function invalidateEvaluationSettings(halaqaId: number, next: Record<string, unknown> | null) {
  settingsCache.set(halaqaId, next)
}

export function useAchievements() {
  const api = useApi()
  const { selectedHalaqaId, halaqat, selectHalaqa } = useGlobalHalaqa()

  // The record form writes halaqa_id from the global scope, so editing a row while
  // unscoped (principal viewing all halaqat) has to pin the scope to that row's
  // own halaqa first.
  function pinHalaqa(halaqaId: number) {
    if (selectedHalaqaId.value === halaqaId) return
    const halaqa = halaqat.value.find(h => h.id === halaqaId)
    if (halaqa) selectHalaqa(halaqa)
  }

  async function loadEvaluationSettings(halaqaId: number): Promise<Record<string, unknown> | null> {
    if (settingsCache.has(halaqaId)) {
      const cached = settingsCache.get(halaqaId) ?? null
      currentEvaluationSettings.value = cached
      return cached
    }
    try {
      const halaqa = await api<ApiHalaqaDetail>(`/halaqat/${halaqaId}`)
      const settings = halaqa.evaluation_settings ?? null
      settingsCache.set(halaqaId, settings)
      currentEvaluationSettings.value = settings
      return settings
    } catch {
      settingsCache.set(halaqaId, null)
      currentEvaluationSettings.value = null
      return null
    }
  }

  async function loadStudents(halaqaId: number) {
    const [studentsData, attendanceRaw] = await Promise.all([
      api<ApiStudentListResult | ApiStudent[]>(`/students?halaqa_id=${halaqaId}&limit=100`),
      api<ApiAttendanceListResult | ApiAttendance[]>(`/attendance/students?date=${selectedDate.value}&limit=100`).catch(() => []),
      loadEvaluationSettings(halaqaId)
    ])

    const studentItems = unwrapList<ApiStudent>(studentsData)
    const attendanceMap = new Map<number, ApiAttendance>(
      unwrapList<ApiAttendance>(attendanceRaw).map(a => [a.student_id, a])
    )

    students.value = studentItems.map(s => ({
      id: s.id,
      name: s.name,
      avatar: s.photo_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(s.name)}`,
      attendanceStatus: attendanceMap.get(s.id)?.status ?? null
    }))
  }

  async function loadAchievements() {
    const halaqaId = selectedHalaqaId.value
    isLoading.value = true
    try {
      // halaqa_id is an additive filter server-side: omitting it returns every
      // achievement the caller may see.
      const params = new URLSearchParams({
        date: selectedDate.value,
        page: String(page.value),
        limit: String(limit.value)
      })
      if (halaqaId) params.set('halaqa_id', String(halaqaId))
      if (filters.trackType) params.set('track_type', filters.trackType)
      if (filters.status) params.set('status', filters.status)

      const raw = await api<unknown>(`/achievements?${params.toString()}`)
      achievements.value = unwrapList<ApiAchievement>(raw)
      total.value = raw && typeof raw === 'object' && 'total' in raw
        ? Number((raw as { total: number }).total)
        : achievements.value.length
    } finally {
      isLoading.value = false
    }
  }

  async function loadAll() {
    const halaqaId = selectedHalaqaId.value
    // The student roster and evaluation settings are per-halaqa and only feed the
    // record form, which demands a halaqa of its own. Unscoped, just list.
    if (!halaqaId) {
      students.value = []
      await loadAchievements()
      return
    }
    await Promise.all([loadStudents(halaqaId), loadAchievements()])
  }

  const studentById = computed(() => {
    const map = new Map<number, StudentWithAttendance>()
    for (const s of students.value) map.set(s.id, s)
    return map
  })

  function studentName(id: number): string {
    return studentById.value.get(id)?.name ?? `#${id}`
  }
  // Prefer the name the backend denormalizes onto the achievement (works even in
  // the unscoped list where no per-halaqa roster is loaded); fall back to roster.
  function studentDisplayName(a: { student_id: number, student_name?: string | null }): string {
    return a.student_name || studentName(a.student_id)
  }
  function studentAvatar(id: number): string {
    return studentById.value.get(id)?.avatar
      ?? `https://api.dicebear.com/9.x/notionists/svg?seed=${id}`
  }

  const filteredAchievements = computed(() => {
    const q = filters.search.trim().toLowerCase()
    if (!q) return achievements.value
    return achievements.value.filter(a => studentDisplayName(a).toLowerCase().includes(q))
  })

  const hasActiveFilters = computed(() =>
    filters.search.trim() !== '' || filters.trackType !== null || filters.status !== null
  )

  function clearFilters() {
    filters.search = ''
    filters.trackType = null
    filters.status = null
  }

  const totalPages = computed(() => (limit.value > 0 ? Math.ceil(total.value / limit.value) : 1))

  // Where the itemized errors live depends on the method: `full` carries them at
  // the top level, `test` inside each position.
  function allErrorsOf(data: CreateAchievementDto): PositionError[] {
    return data.recitation_method === 'test'
      ? (data.test_positions ?? []).flatMap(p => p.errors ?? [])
      : (data.errors ?? [])
  }

  // percentage_score is computed on the frontend from the error counts (derived
  // from the itemized errors[]), the halaqa's weights, and the range's page span
  // (weights are per page), then stored as-is.
  async function withComputedScore(data: CreateAchievementDto): Promise<CreateAchievementDto> {
    const settings = await loadEvaluationSettings(data.halaqa_id)
    // A test is scored over the positions actually recited, not the lesson span.
    const pages = pagesRecited(
      data,
      data.recitation_method === 'test' ? data.test_positions : null
    )
    const percentage_score = computePercentageScore(tallyErrors(allErrorsOf(data)), settings, pages)
    return { ...data, percentage_score }
  }

  // The API accepts exactly one error carrier per method and 400s on the other:
  // "test_positions is only valid when recitation_method is 'test'" / "Errors are
  // per-position when recitation_method is 'test'". Send one, strip the other.
  function withPositionsPayload(data: CreateAchievementDto): CreateAchievementDto {
    const body: CreateAchievementDto = { ...data, recitation_method: data.recitation_method ?? 'full' }
    if (body.recitation_method === 'test') {
      body.test_positions = body.test_positions ?? []
      delete body.errors
    } else {
      body.errors = body.errors ?? []
      delete body.test_positions
    }
    return body
  }

  async function addAchievement(data: CreateAchievementDto) {
    isSaving.value = true
    try {
      const full = await withComputedScore(data)
      const created = await api<ApiAchievement>('/achievements', {
        method: 'POST',
        body: withPositionsPayload(full)
      })
      await loadAchievements()
      return created
    } finally {
      isSaving.value = false
    }
  }

  async function updateAchievement(id: number, data: CreateAchievementDto) {
    isSaving.value = true
    try {
      const full = await withComputedScore(data)
      // The update endpoint only accepts mutable fields — student_id, halaqa_id
      // and date are immutable for an existing record and are rejected by the
      // backend's whitelist ("property student_id should not exist"). Sending
      // the errors + recitation_method regenerates the positions wholesale.
      const method = full.recitation_method ?? 'full'
      const body: Record<string, unknown> = {
        track_type: full.track_type,
        completion_method: full.completion_method,
        recitation_method: method,
        start_surah: full.start_surah,
        start_verse: full.start_verse,
        end_surah: full.end_surah,
        end_verse: full.end_verse,
        percentage_score: full.percentage_score,
        teacher_notes: full.teacher_notes
      }
      // Same one-carrier rule as create.
      if (method === 'test') body.test_positions = full.test_positions ?? []
      else body.errors = full.errors ?? []
      const updated = await api<ApiAchievement>(`/achievements/${id}`, { method: 'PATCH', body })
      await loadAchievements()
      return updated
    } finally {
      isSaving.value = false
    }
  }

  async function deleteAchievement(id: number) {
    await api(`/achievements/${id}`, { method: 'DELETE' })
    await loadAchievements()
  }

  async function approveAchievement(id: number) {
    await api<ApiAchievement>(`/achievements/${id}/approve`, { method: 'POST' })
    await loadAchievements()
  }

  async function unapproveAchievement(id: number) {
    await api<ApiAchievement>(`/achievements/${id}/unapprove`, { method: 'POST' })
    await loadAchievements()
  }

  // Record/edit/duplicate now happen on a dedicated page. These set the shared
  // state, then navigate there; the record page reads editing/duplicateFrom.
  function openRecord() {
    editing.value = null
    duplicateFrom.value = null
    prefillStudentId.value = null
    prefillPlanItem.value = null
    navigateTo('/achievements/record')
  }
  function openEdit(a: ApiAchievement) {
    duplicateFrom.value = null
    editing.value = a
    pinHalaqa(a.halaqa_id)
    navigateTo('/achievements/record')
  }
  function openDuplicate(a: ApiAchievement) {
    editing.value = null
    duplicateFrom.value = a
    pinHalaqa(a.halaqa_id)
    navigateTo('/achievements/record')
  }
  function requestDelete(a: ApiAchievement) {
    deleteTarget.value = a
    deleteOpen.value = true
  }

  const hasStudents = computed(() => students.value.length > 0)

  return {
    students,
    achievements,
    selectedDate,
    isLoading,
    isSaving,
    currentEvaluationSettings,
    total,
    page,
    limit,
    viewMode,
    filters,
    editing,
    duplicateFrom,
    prefillStudentId,
    prefillPlanItem,
    deleteOpen,
    deleteTarget,

    studentById,
    studentName,
    studentDisplayName,
    studentAvatar,
    filteredAchievements,
    hasActiveFilters,
    totalPages,
    hasStudents,

    loadAll,
    loadStudents,
    loadAchievements,
    loadEvaluationSettings,
    clearFilters,
    addAchievement,
    updateAchievement,
    deleteAchievement,
    approveAchievement,
    unapproveAchievement,
    openRecord,
    openEdit,
    openDuplicate,
    requestDelete
  }
}
