import { computed, reactive, ref } from 'vue'
import type {
  ApiAchievement, ApiAttendance, ApiAttendanceListResult, ApiHalaqaDetail, ApiStudent,
  ApiStudentListResult, StudentWithAttendance, CreateAchievementDto,
  AchievementErrorType, PositionError
} from '~/types'
import type { RecitationMarks } from '~/types/recitation'
import { SEVERITY_LEVELS } from '~/types/recitation'
import { unwrapList } from '~/utils/api/list'
import { computePercentageScore, type ScoreCounts } from '~/utils/score'
import { ensureQuranWordData, locateError } from '~/utils/quran-words'

interface VerseRangeLike {
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
}

// Tally the four error types from an itemized errors[] list — the backend
// derives the same counts server-side; we mirror it to compute the score and to
// hydrate the numeric quick-entry form.
export function tallyErrors(errors: PositionError[] | undefined | null): ScoreCounts {
  const c: ScoreCounts = {
    mistakes_count: 0, warnings_count: 0, tajweed_errors_count: 0, harakat_errors_count: 0
  }
  for (const e of errors ?? []) {
    if (e.error_type === 'mistake') c.mistakes_count++
    else if (e.error_type === 'warning') c.warnings_count++
    else if (e.error_type === 'tajweed') c.tajweed_errors_count++
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
  push('tajweed', counts.tajweed_errors_count)
  push('harakat', counts.harakat_errors_count)
  return errors
}

// Mushaf flow: each marked word becomes one precisely-located error. The marking
// spectrum has no harakat notion, so this only emits mistake/warning/tajweed
// (green `minor` carries no penalty and is dropped).
export async function buildErrorsFromMarks(marks: Readonly<RecitationMarks>): Promise<PositionError[]> {
  await ensureQuranWordData()
  const errors: PositionError[] = []
  for (const [key, severity] of Object.entries(marks)) {
    const slot = SEVERITY_LEVELS.find(l => l.key === severity)?.scoreSlot
    if (!slot || slot === 'none') continue
    // key = "surah:ayah:position"
    const [s, a, p] = key.split(':').map(Number)
    if (!s || !a || !p) continue
    errors.push({ error_type: slot as AchievementErrorType, ...locateError(s, a, p) })
  }
  return errors
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
const deleteOpen = ref(false)
const deleteTarget = ref<ApiAchievement | null>(null)

const settingsCache = new Map<number, Record<string, unknown> | null>()
const currentEvaluationSettings = ref<Record<string, unknown> | null>(null)

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
  function studentAvatar(id: number): string {
    return studentById.value.get(id)?.avatar
      ?? `https://api.dicebear.com/9.x/notionists/svg?seed=${id}`
  }

  const filteredAchievements = computed(() => {
    const q = filters.search.trim().toLowerCase()
    if (!q) return achievements.value
    return achievements.value.filter(a => studentName(a.student_id).toLowerCase().includes(q))
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

  // percentage_score is computed on the frontend from the error counts (derived
  // from the itemized errors[]) and the halaqa's weights, then stored as-is.
  async function withComputedScore(data: CreateAchievementDto): Promise<CreateAchievementDto> {
    const settings = await loadEvaluationSettings(data.halaqa_id)
    const percentage_score = computePercentageScore(tallyErrors(data.errors), settings)
    return { ...data, percentage_score }
  }

  async function addAchievement(data: CreateAchievementDto) {
    isSaving.value = true
    try {
      const full = await withComputedScore(data)
      const body: CreateAchievementDto = {
        ...full,
        recitation_method: full.recitation_method ?? 'full',
        errors: full.errors ?? []
      }
      const created = await api<ApiAchievement>('/achievements', { method: 'POST', body })
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
      // errors[] + recitation_method regenerates the positions wholesale.
      const body = {
        track_type: full.track_type,
        completion_method: full.completion_method,
        recitation_method: full.recitation_method ?? 'full',
        start_surah: full.start_surah,
        start_verse: full.start_verse,
        end_surah: full.end_surah,
        end_verse: full.end_verse,
        errors: full.errors ?? [],
        percentage_score: full.percentage_score,
        teacher_notes: full.teacher_notes
      }
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
    deleteOpen,
    deleteTarget,

    studentById,
    studentName,
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
