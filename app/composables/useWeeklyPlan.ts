import { computed, reactive, ref } from 'vue'
import type {
  ApiStudent, ApiStudentListResult, ApiWeeklyPlan, ApiWeeklyPlanItem, StudentWithAttendance
} from '~/types'
import { unwrapList } from '~/utils/api/list'

type TrackType = 'Hifz' | 'Near' | 'Far'
type ItemStatus = 'due' | 'partial' | 'completed' | 'overdue'

export interface CreatePlanItemDto {
  day_of_week: number
  track_type: TrackType
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Saturday on/before the given date (backend week starts Sat = day_of_week 0). */
export function startOfWeekSat(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  r.setDate(r.getDate() - ((r.getDay() + 1) % 7))
  return r
}

// ── Module-level shared state (singleton) ─────────────────────────────────────
const students = ref<StudentWithAttendance[]>([])
const selectedStudentId = ref<number | undefined>(undefined)
const selectedWeekStart = ref<string>(ymd(startOfWeekSat(new Date())))
const plan = ref<ApiWeeklyPlan | null>(null)
const isLoading = ref(false)
const isSaving = ref(false)

const filters = reactive<{ trackType: TrackType | null, status: ItemStatus | null }>({
  trackType: null,
  status: null
})
const viewMode = ref<'table' | 'grid'>('table')

const formOpen = ref(false)
const editing = ref<ApiWeeklyPlanItem | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<ApiWeeklyPlanItem | null>(null)

export function useWeeklyPlan() {
  const api = useApi()
  const { selectedHalaqaId } = useGlobalHalaqa()

  async function loadStudents(halaqaId: number) {
    const raw = await api<ApiStudentListResult | ApiStudent[]>(`/students?halaqa_id=${halaqaId}&limit=100`)
    students.value = unwrapList<ApiStudent>(raw).map(s => ({
      id: s.id,
      name: s.name,
      avatar: s.photo_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(s.name)}`,
      attendanceStatus: null
    }))
  }

  async function loadPlan() {
    const halaqaId = selectedHalaqaId.value
    const studentId = selectedStudentId.value
    if (!halaqaId || !studentId) {
      plan.value = null
      return
    }
    isLoading.value = true
    try {
      const raw = await api<unknown>(
        `/weekly-plans?student_id=${studentId}&halaqa_id=${halaqaId}&week_start_date=${selectedWeekStart.value}`
      )
      plan.value = unwrapList<ApiWeeklyPlan>(raw)[0] ?? null
    } finally {
      isLoading.value = false
    }
  }

  // ── Item CRUD (persist immediately, then reload) ────────────────────────────
  async function addItem(dto: CreatePlanItemDto) {
    const halaqaId = selectedHalaqaId.value
    const studentId = selectedStudentId.value
    if (!halaqaId || !studentId) return
    isSaving.value = true
    try {
      if (!plan.value) {
        // No plan exists for this week yet — create it with this first item.
        await api<ApiWeeklyPlan>('/weekly-plans', {
          method: 'POST',
          body: {
            student_id: studentId,
            halaqa_id: halaqaId,
            week_start_date: selectedWeekStart.value,
            items: [dto]
          }
        })
      } else {
        await api<ApiWeeklyPlanItem>(`/weekly-plans/${plan.value.id}/items`, { method: 'POST', body: dto })
      }
      await loadPlan()
    } finally {
      isSaving.value = false
    }
  }

  async function updateItem(id: number, dto: CreatePlanItemDto) {
    isSaving.value = true
    try {
      await api<ApiWeeklyPlanItem>(`/weekly-plan-items/${id}`, { method: 'PATCH', body: dto })
      await loadPlan()
    } finally {
      isSaving.value = false
    }
  }

  async function deleteItem(id: number) {
    await api(`/weekly-plan-items/${id}`, { method: 'DELETE' })
    await loadPlan()
  }

  // ── Plan-level ──────────────────────────────────────────────────────────────
  async function approvePlan() {
    if (!plan.value) return
    isSaving.value = true
    try {
      await api(`/weekly-plans/${plan.value.id}/approve`, { method: 'POST' })
      await loadPlan()
    } finally {
      isSaving.value = false
    }
  }

  async function unapprovePlan() {
    if (!plan.value) return
    isSaving.value = true
    try {
      await api(`/weekly-plans/${plan.value.id}/unapprove`, { method: 'POST' })
      await loadPlan()
    } finally {
      isSaving.value = false
    }
  }

  async function deletePlan() {
    if (!plan.value) return
    await api(`/weekly-plans/${plan.value.id}`, { method: 'DELETE' })
    await loadPlan()
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const items = computed<ApiWeeklyPlanItem[]>(() => plan.value?.items ?? [])
  const planStatus = computed<'new' | 'draft' | 'approved'>(() => plan.value?.status ?? 'new')

  const filteredItems = computed(() => items.value.filter((it) => {
    if (filters.trackType && it.track_type !== filters.trackType) return false
    if (filters.status && it.status !== filters.status) return false
    return true
  }))

  const summary = computed(() => {
    const totalPlanned = items.value.reduce((s, it) => s + (it.total_verses || 0), 0)
    const totalAchieved = items.value.reduce((s, it) => s + (it.achieved_verses || 0), 0)
    const coverage = totalPlanned > 0 ? Math.round((totalAchieved / totalPlanned) * 100) : 0
    return { totalPlanned, totalAchieved, coverage }
  })

  const hasActiveFilters = computed(() => filters.trackType !== null || filters.status !== null)
  function clearFilters() {
    filters.trackType = null
    filters.status = null
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
    return studentById.value.get(id)?.avatar ?? `https://api.dicebear.com/9.x/notionists/svg?seed=${id}`
  }

  // ── Week navigation ─────────────────────────────────────────────────────────
  function shiftWeek(deltaDays: number) {
    const d = new Date(selectedWeekStart.value)
    d.setDate(d.getDate() + deltaDays)
    selectedWeekStart.value = ymd(startOfWeekSat(d))
  }
  function setWeekFromDate(d: Date) {
    selectedWeekStart.value = ymd(startOfWeekSat(d))
  }
  const prevWeek = () => shiftWeek(-7)
  const nextWeek = () => shiftWeek(7)

  /** Actual calendar date (YYYY-MM-DD) of an item's day_of_week within the selected week. */
  function dateOfDay(dayOfWeek: number): Date {
    const d = new Date(selectedWeekStart.value)
    d.setDate(d.getDate() + dayOfWeek)
    return d
  }

  // ── Modal / confirm orchestration ───────────────────────────────────────────
  function openAdd() {
    editing.value = null
    formOpen.value = true
  }
  function openEdit(it: ApiWeeklyPlanItem) {
    editing.value = it
    formOpen.value = true
  }
  function requestDelete(it: ApiWeeklyPlanItem) {
    deleteTarget.value = it
    deleteOpen.value = true
  }

  const hasStudents = computed(() => students.value.length > 0)

  return {
    // State
    students,
    selectedStudentId,
    selectedWeekStart,
    plan,
    items,
    planStatus,
    isLoading,
    isSaving,
    filters,
    viewMode,
    formOpen,
    editing,
    deleteOpen,
    deleteTarget,

    // Derived
    filteredItems,
    summary,
    hasActiveFilters,
    hasStudents,
    studentById,
    studentName,
    studentAvatar,
    dateOfDay,

    // Methods
    loadStudents,
    loadPlan,
    addItem,
    updateItem,
    deleteItem,
    approvePlan,
    unapprovePlan,
    deletePlan,
    clearFilters,
    prevWeek,
    nextWeek,
    setWeekFromDate,
    openAdd,
    openEdit,
    requestDelete
  }
}
