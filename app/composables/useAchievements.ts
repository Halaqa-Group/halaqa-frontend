import { computed, reactive, ref } from 'vue'
import type {
  ApiAchievement, ApiAttendance, ApiHalaqaDetail, ApiStudent, ApiStudentListResult,
  StudentWithAttendance, CreateAchievementDto
} from '~/types'
import { unwrapList } from '~/utils/api/list'
import { computePercentageScore } from '~/utils/score'

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
const deleteOpen = ref(false)
const deleteTarget = ref<ApiAchievement | null>(null)

const settingsCache = new Map<number, Record<string, unknown> | null>()
const currentEvaluationSettings = ref<Record<string, unknown> | null>(null)

export function useAchievements() {
  const api = useApi()
  const { selectedHalaqaId } = useGlobalHalaqa()

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
    const [studentsData, attendanceData] = await Promise.all([
      api<ApiStudentListResult | ApiStudent[]>(`/students?halaqa_id=${halaqaId}&limit=100`),
      api<ApiAttendance[]>(`/attendance?halaqaId=${halaqaId}&date=${selectedDate.value}`).catch(() => []),
      loadEvaluationSettings(halaqaId)
    ])

    const studentItems = unwrapList<ApiStudent>(studentsData)
    const attendanceMap = new Map<number, ApiAttendance>(
      attendanceData.map(a => [a.student_id, a])
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
    if (!halaqaId) {
      achievements.value = []
      total.value = 0
      return
    }
    isLoading.value = true
    try {
      const params = new URLSearchParams({
        halaqa_id: String(halaqaId),
        date: selectedDate.value,
        page: String(page.value),
        limit: String(limit.value)
      })
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
    if (!halaqaId) {
      students.value = []
      achievements.value = []
      total.value = 0
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

  async function withComputedScore(data: CreateAchievementDto): Promise<CreateAchievementDto> {
    const settings = await loadEvaluationSettings(data.halaqa_id)
    const percentage_score = computePercentageScore(
      {
        mistakes_count: data.mistakes_count ?? 0,
        warnings_count: data.warnings_count ?? 0,
        tajweed_errors_count: data.tajweed_errors_count ?? 0
      },
      settings
    )
    return { ...data, percentage_score }
  }

  async function addAchievement(data: CreateAchievementDto) {
    isSaving.value = true
    try {
      const body = await withComputedScore(data)
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
      // backend's whitelist ("property student_id should not exist").
      const body = {
        track_type: full.track_type,
        start_surah: full.start_surah,
        start_verse: full.start_verse,
        end_surah: full.end_surah,
        end_verse: full.end_verse,
        mistakes_count: full.mistakes_count,
        warnings_count: full.warnings_count,
        tajweed_errors_count: full.tajweed_errors_count,
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
    navigateTo('/achievements/record')
  }
  function openEdit(a: ApiAchievement) {
    duplicateFrom.value = null
    editing.value = a
    navigateTo('/achievements/record')
  }
  function openDuplicate(a: ApiAchievement) {
    editing.value = null
    duplicateFrom.value = a
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
