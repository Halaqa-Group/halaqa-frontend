import { computed, reactive, ref } from 'vue'
import type {
  ApiStudent, ApiStudentListResult, ApiWeeklyPlan, ApiWeeklyPlanItem, StudentWithAttendance
} from '~/types'
import { unwrapList } from '~/utils/api/list'
import { totalVersesInRange } from '~/utils/quran'
import type { VerseRange } from '~/utils/quran-structure'

type TrackType = 'Hifz' | 'Near' | 'Far'
type ItemStatus = 'due' | 'partial' | 'completed' | 'overdue'

export const PLAN_TRACKS: TrackType[] = ['Hifz', 'Near', 'Far']

export interface CreatePlanItemDto {
  day_of_week: number
  track_type: TrackType
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
}

/** Tally returned by applyPlanToStudents (bulk fan-out). */
export interface ApplyResult {
  created: number
  skipped: number
  replaced: number
  failed: number
}

/** One (day × track) lesson in the editable matrix. `id` links it to a persisted item. */
export interface DraftCell extends VerseRange {
  id?: number
  status?: ItemStatus
  achieved_verses?: number
  total_verses?: number
}

const cellKey = (day: number, track: TrackType) => `${day}:${track}`
function splitCellKey(key: string): { day: number, track: TrackType } {
  const idx = key.indexOf(':')
  return { day: Number(key.slice(0, idx)), track: key.slice(idx + 1) as TrackType }
}
function sameRange(a: VerseRange, b: VerseRange): boolean {
  return a.start_surah === b.start_surah && a.start_verse === b.start_verse
    && a.end_surah === b.end_surah && a.end_verse === b.end_verse
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
const viewMode = ref<'matrix' | 'table' | 'grid'>('matrix')

const formOpen = ref(false)
const editing = ref<ApiWeeklyPlanItem | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<ApiWeeklyPlanItem | null>(null)

// ── Editable matrix draft (day × track) ───────────────────────────────────────
const draft = reactive(new Map<string, DraftCell>())
const restDays = reactive(new Set<number>())
const copiedCell = ref<DraftCell | null>(null)
const wizardOpen = ref(false)

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
      hydrateDraft()
    } finally {
      isLoading.value = false
    }
  }

  // ── Matrix draft ────────────────────────────────────────────────────────────
  /** Rebuild the editable draft from the loaded plan's persisted items. */
  function hydrateDraft() {
    draft.clear()
    restDays.clear()
    for (const it of plan.value?.items ?? []) {
      const k = cellKey(it.day_of_week, it.track_type)
      if (draft.has(k)) continue
      draft.set(k, {
        id: it.id,
        start_surah: it.start_surah,
        start_verse: it.start_verse,
        end_surah: it.end_surah,
        end_verse: it.end_verse,
        status: it.status,
        achieved_verses: it.achieved_verses,
        total_verses: it.total_verses
      })
    }
  }

  const getCell = (day: number, track: TrackType) => draft.get(cellKey(day, track))

  /** Write a lesson range into a cell, preserving its persisted id (so save PATCHes). */
  function setCell(day: number, track: TrackType, r: VerseRange) {
    const k = cellKey(day, track)
    const id = draft.get(k)?.id
    restDays.delete(day)
    draft.set(k, { id, start_surah: r.start_surah, start_verse: r.start_verse, end_surah: r.end_surah, end_verse: r.end_verse })
  }

  function clearCell(day: number, track: TrackType) {
    draft.delete(cellKey(day, track))
  }

  function toggleRestDay(day: number) {
    if (restDays.has(day)) {
      restDays.delete(day)
    } else {
      restDays.add(day)
      for (const t of PLAN_TRACKS) clearCell(day, t)
    }
  }

  const activeDays = computed(() => Array.from({ length: 7 }, (_, i) => i).filter(d => !restDays.has(d)))

  /** Replace a whole track column with generated ranges, laid onto active days in order. */
  function applyTrackGeneration(track: TrackType, ranges: VerseRange[]) {
    for (let d = 0; d < 7; d++) clearCell(d, track)
    const days = activeDays.value
    ranges.forEach((r, i) => {
      if (i < days.length) setCell(days[i]!, track, r)
    })
  }

  /** Copy every track's lesson from one day onto all other active days. */
  function copyRowToAllDays(day: number) {
    const src = PLAN_TRACKS.map(t => [t, getCell(day, t)] as const)
    for (let d = 0; d < 7; d++) {
      if (d === day || restDays.has(d)) continue
      for (const [t, cell] of src) {
        if (cell) setCell(d, t, cell)
        else clearCell(d, t)
      }
    }
  }

  /** Take the first filled cell in a track column and apply it to all active days. */
  function applyColumnToAllDays(track: TrackType): boolean {
    let source: DraftCell | undefined
    for (let d = 0; d < 7; d++) {
      const c = getCell(d, track)
      if (c) {
        source = c
        break
      }
    }
    if (!source) return false
    for (const d of activeDays.value) setCell(d, track, source)
    return true
  }

  function copyCell(day: number, track: TrackType) {
    const c = getCell(day, track)
    if (c) copiedCell.value = { start_surah: c.start_surah, start_verse: c.start_verse, end_surah: c.end_surah, end_verse: c.end_verse }
  }
  function pasteCell(day: number, track: TrackType) {
    if (copiedCell.value) setCell(day, track, copiedCell.value)
  }

  /** Persist the draft: create a plan, or add/patch/delete items on an existing draft plan. */
  async function saveDraft() {
    const halaqaId = selectedHalaqaId.value
    const studentId = selectedStudentId.value
    if (!halaqaId || !studentId) return
    isSaving.value = true
    try {
      if (!plan.value) {
        const items = Array.from(draft.entries()).map(([k, c]) => {
          const { day, track } = splitCellKey(k)
          return { day_of_week: day, track_type: track, start_surah: c.start_surah, start_verse: c.start_verse, end_surah: c.end_surah, end_verse: c.end_verse }
        })
        if (items.length === 0) return
        await api<ApiWeeklyPlan>('/weekly-plans', {
          method: 'POST',
          body: { student_id: studentId, halaqa_id: halaqaId, week_start_date: selectedWeekStart.value, items }
        })
      } else {
        const persisted = new Map<string, ApiWeeklyPlanItem>()
        for (const it of plan.value.items) {
          const k = cellKey(it.day_of_week, it.track_type)
          if (!persisted.has(k)) persisted.set(k, it)
        }
        for (const [k, c] of draft) {
          const { day, track } = splitCellKey(k)
          const body = { day_of_week: day, track_type: track, start_surah: c.start_surah, start_verse: c.start_verse, end_surah: c.end_surah, end_verse: c.end_verse }
          const p = persisted.get(k)
          if (p) {
            if (!sameRange(c, p)) await api(`/weekly-plan-items/${p.id}`, { method: 'PATCH', body })
          } else {
            await api(`/weekly-plans/${plan.value.id}/items`, { method: 'POST', body })
          }
        }
        for (const [k, p] of persisted) {
          if (!draft.has(k)) await api(`/weekly-plan-items/${p.id}`, { method: 'DELETE' })
        }
      }
      await loadPlan()
    } finally {
      isSaving.value = false
    }
  }

  /** Draft differs from what's persisted → the Save button lights up. */
  const matrixDirty = computed(() => {
    const persisted = new Map<string, ApiWeeklyPlanItem>()
    for (const it of plan.value?.items ?? []) {
      const k = cellKey(it.day_of_week, it.track_type)
      if (!persisted.has(k)) persisted.set(k, it)
    }
    for (const [k, c] of draft) {
      const p = persisted.get(k)
      if (!p || !sameRange(c, p)) return true
    }
    for (const k of persisted.keys()) if (!draft.has(k)) return true
    return false
  })

  const matrixSummary = computed(() => {
    let hifzAyahs = 0
    let reviewSessions = 0
    for (const [k, c] of draft) {
      const { track } = splitCellKey(k)
      if (track === 'Hifz') hifzAyahs += totalVersesInRange(c.start_surah, c.start_verse, c.end_surah, c.end_verse)
      else reviewSessions += 1
    }
    const plannedDays = new Set(Array.from(draft.keys()).map(k => splitCellKey(k).day))
    return { hifzAyahs, reviewSessions, restDays: restDays.size, plannedDays: plannedDays.size }
  })

  function clearWeek() {
    draft.clear()
    restDays.clear()
  }

  /**
   * Create the same set of plan items for many students in the current halaqa/week.
   * `policy` decides what to do when a student already has a plan that week:
   *   'skip'    — leave the existing plan untouched.
   *   'replace' — delete the existing plan, then create the new one.
   * Runs one request per student (the halaqa is small); returns a tally.
   */
  async function applyPlanToStudents(
    items: CreatePlanItemDto[],
    studentIds: number[],
    policy: 'skip' | 'replace'
  ): Promise<ApplyResult> {
    const halaqaId = selectedHalaqaId.value
    const result: ApplyResult = { created: 0, skipped: 0, replaced: 0, failed: 0 }
    if (!halaqaId || items.length === 0 || studentIds.length === 0) return result

    const week = selectedWeekStart.value
    const makeBody = (studentId: number) => ({ student_id: studentId, halaqa_id: halaqaId, week_start_date: week, items })

    isSaving.value = true
    try {
      for (const studentId of studentIds) {
        // Look up an existing plan first so we know whether this is a create or replace.
        let existingId: number | null = null
        try {
          const raw = await api<unknown>(`/weekly-plans?student_id=${studentId}&halaqa_id=${halaqaId}&week_start_date=${week}`)
          existingId = unwrapList<ApiWeeklyPlan>(raw)[0]?.id ?? null
        } catch { /* treat as no existing plan */ }

        if (existingId && policy === 'skip') {
          result.skipped++
          continue
        }

        try {
          if (existingId && policy === 'replace') {
            await api(`/weekly-plans/${existingId}`, { method: 'DELETE' })
          }
          await api<ApiWeeklyPlan>('/weekly-plans', { method: 'POST', body: makeBody(studentId) })
          if (existingId) result.replaced++
          else result.created++
        } catch {
          result.failed++
        }
      }
      await loadPlan()
      return result
    } finally {
      isSaving.value = false
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

    // Matrix draft
    draft,
    restDays,
    copiedCell,
    wizardOpen,
    activeDays,
    matrixDirty,
    matrixSummary,

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
    requestDelete,

    // Matrix methods
    getCell,
    setCell,
    clearCell,
    toggleRestDay,
    applyTrackGeneration,
    copyRowToAllDays,
    applyColumnToAllDays,
    copyCell,
    pasteCell,
    saveDraft,
    clearWeek,
    applyPlanToStudents
  }
}
