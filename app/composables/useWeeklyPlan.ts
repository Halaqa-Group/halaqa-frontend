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
  order?: number
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
}

export interface ApplyResult {
  created: number
  skipped: number
  replaced: number
  failed: number
}

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

const draft = reactive(new Map<string, DraftCell[]>())
const restDays = reactive(new Set<number>())
const copiedCell = ref<DraftCell[] | null>(null)
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

  function hydrateDraft() {
    draft.clear()
    restDays.clear()
    // Group every item under its cell, ordered by `order` (then id) so a session's
    // array index matches its stored order — keeps re-saves from looking dirty.
    const items = [...(plan.value?.items ?? [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id
    )
    for (const it of items) {
      const k = cellKey(it.day_of_week, it.track_type)
      draft.set(k, [...(draft.get(k) ?? []), {
        id: it.id,
        start_surah: it.start_surah,
        start_verse: it.start_verse,
        end_surah: it.end_surah,
        end_verse: it.end_verse,
        status: it.status,
        achieved_verses: it.achieved_verses,
        total_verses: it.total_verses
      }])
    }
  }

  const getCells = (day: number, track: TrackType): DraftCell[] => draft.get(cellKey(day, track)) ?? []
  // First session only — kept for callers that need a single representative range
  // (drag ghost label, presence check).
  const getCell = (day: number, track: TrackType): DraftCell | undefined => getCells(day, track)[0]

  function makeSession(r: VerseRange, extra: Partial<DraftCell> = {}): DraftCell {
    return { start_surah: r.start_surah, start_verse: r.start_verse, end_surah: r.end_surah, end_verse: r.end_verse, ...extra }
  }
  function toRange(c: DraftCell): VerseRange {
    return { start_surah: c.start_surah, start_verse: c.start_verse, end_surah: c.end_surah, end_verse: c.end_verse }
  }

  // Replace every session in a cell with a fresh set (new items, no ids). Used by
  // the wizard's per-day generation, paste, and row/column copy.
  function setCellSessions(day: number, track: TrackType, ranges: VerseRange[]) {
    const k = cellKey(day, track)
    if (!ranges.length) {
      draft.delete(k)
      return
    }
    restDays.delete(day)
    draft.set(k, ranges.map(r => makeSession(r)))
  }
  function setCell(day: number, track: TrackType, r: VerseRange) {
    setCellSessions(day, track, [r])
  }

  // Append a session to a cell.
  function addSession(day: number, track: TrackType, r: VerseRange) {
    const k = cellKey(day, track)
    restDays.delete(day)
    draft.set(k, [...(draft.get(k) ?? []), makeSession(r)])
  }
  // Replace one session's range in place, preserving its id/status so a saved item
  // is PATCHed rather than recreated.
  function updateSession(day: number, track: TrackType, index: number, r: VerseRange) {
    const k = cellKey(day, track)
    const list = draft.get(k)
    const cur = list?.[index]
    if (!list || !cur) return
    const next = [...list]
    next[index] = { ...cur, start_surah: r.start_surah, start_verse: r.start_verse, end_surah: r.end_surah, end_verse: r.end_verse }
    draft.set(k, next)
  }
  function removeSession(day: number, track: TrackType, index: number) {
    const k = cellKey(day, track)
    const list = draft.get(k)
    if (!list) return
    const next = list.filter((_, i) => i !== index)
    if (next.length) draft.set(k, next)
    else draft.delete(k)
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

  function applyTrackGeneration(track: TrackType, ranges: VerseRange[]) {
    for (let d = 0; d < 7; d++) clearCell(d, track)
    const days = activeDays.value
    ranges.forEach((r, i) => {
      if (i < days.length) setCell(days[i]!, track, r)
    })
  }

  function copyRowToAllDays(day: number) {
    const src = PLAN_TRACKS.map(t => [t, getCells(day, t).map(toRange)] as const)
    for (let d = 0; d < 7; d++) {
      if (d === day || restDays.has(d)) continue
      for (const [t, ranges] of src) setCellSessions(d, t, ranges)
    }
  }

  function applyColumnToAllDays(track: TrackType): boolean {
    let source: VerseRange[] | undefined
    for (let d = 0; d < 7; d++) {
      const list = getCells(d, track)
      if (list.length) {
        source = list.map(toRange)
        break
      }
    }
    if (!source) return false
    for (const d of activeDays.value) setCellSessions(d, track, source)
    return true
  }

  function moveCell(fromDay: number, fromTrack: TrackType, toDay: number, toTrack: TrackType) {
    if (fromDay === toDay && fromTrack === toTrack) return
    if (restDays.has(toDay)) return
    const fromK = cellKey(fromDay, fromTrack)
    const toK = cellKey(toDay, toTrack)
    const src = draft.get(fromK)
    if (!src?.length) return
    // Move the whole session list, preserving ids (saved items are re-homed via a
    // PATCH of day_of_week/track_type). Swap with the destination if it's occupied.
    const dest = draft.get(toK)
    restDays.delete(toDay)
    draft.set(toK, src)
    if (dest?.length) draft.set(fromK, dest)
    else draft.delete(fromK)
  }

  // Reorder a session within its own cell, moving it from one slot to another.
  // The dragged session takes the target slot; the others shift to fill the gap.
  // Order is persisted as the array index, so this re-sequences the saved items.
  function reorderSession(day: number, track: TrackType, from: number, to: number) {
    if (from === to) return
    const k = cellKey(day, track)
    const list = draft.get(k)
    if (!list || from < 0 || from >= list.length || to < 0 || to >= list.length) return
    const next = [...list]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved!)
    draft.set(k, next)
  }

  // Move a single session out of its cell and append it to the destination,
  // leaving the source cell's remaining sessions in place. This is the drag unit
  // when a cell holds more than one session — the whole list no longer moves as a
  // block. The session keeps its id so a saved item is re-homed via a PATCH of
  // day_of_week/track_type/order rather than being recreated.
  function moveSession(
    fromDay: number, fromTrack: TrackType, fromIndex: number, toDay: number, toTrack: TrackType
  ) {
    if (fromDay === toDay && fromTrack === toTrack) return
    if (restDays.has(toDay)) return
    const fromK = cellKey(fromDay, fromTrack)
    const src = draft.get(fromK)
    const session = src?.[fromIndex]
    if (!session) return
    const rest = src.filter((_, i) => i !== fromIndex)
    if (rest.length) draft.set(fromK, rest)
    else draft.delete(fromK)
    const toK = cellKey(toDay, toTrack)
    restDays.delete(toDay)
    draft.set(toK, [...(draft.get(toK) ?? []), session])
  }

  function copyCell(day: number, track: TrackType) {
    const list = getCells(day, track)
    if (list.length) copiedCell.value = list.map(c => makeSession(toRange(c)))
  }
  function pasteCell(day: number, track: TrackType) {
    if (copiedCell.value?.length) setCellSessions(day, track, copiedCell.value.map(toRange))
  }

  async function saveDraft() {
    const halaqaId = selectedHalaqaId.value
    const studentId = selectedStudentId.value
    if (!halaqaId || !studentId) return
    isSaving.value = true
    try {
      if (!plan.value) {
        const items: CreatePlanItemDto[] = []
        for (const [k, list] of draft) {
          const { day, track } = splitCellKey(k)
          list.forEach((c, i) => items.push({
            day_of_week: day, track_type: track, order: i,
            start_surah: c.start_surah, start_verse: c.start_verse, end_surah: c.end_surah, end_verse: c.end_verse
          }))
        }
        if (items.length === 0) return
        await api<ApiWeeklyPlan>('/weekly-plans', {
          method: 'POST',
          body: { student_id: studentId, halaqa_id: halaqaId, week_start_date: selectedWeekStart.value, items }
        })
      } else {
        // Diff by item id: PATCH moved/edited sessions, POST new ones, DELETE the
        // persisted items no draft session still maps to. `order` = array index.
        const persistedById = new Map<number, ApiWeeklyPlanItem>()
        for (const it of plan.value.items) persistedById.set(it.id, it)
        const seen = new Set<number>()
        for (const [k, list] of draft) {
          const { day, track } = splitCellKey(k)
          for (let i = 0; i < list.length; i++) {
            const c = list[i]!
            const body = {
              day_of_week: day, track_type: track, order: i,
              start_surah: c.start_surah, start_verse: c.start_verse, end_surah: c.end_surah, end_verse: c.end_verse
            }
            const p = c.id != null ? persistedById.get(c.id) : undefined
            if (p) {
              seen.add(p.id)
              if (!sameRange(c, p) || p.day_of_week !== day || p.track_type !== track || (p.order ?? 0) !== i) {
                await api(`/weekly-plan-items/${p.id}`, { method: 'PATCH', body })
              }
            } else {
              await api(`/weekly-plans/${plan.value.id}/items`, { method: 'POST', body })
            }
          }
        }
        for (const it of plan.value.items) {
          if (!seen.has(it.id)) await api(`/weekly-plan-items/${it.id}`, { method: 'DELETE' })
        }
      }
      await loadPlan()
    } finally {
      isSaving.value = false
    }
  }

  const matrixDirty = computed(() => {
    const persistedById = new Map<number, ApiWeeklyPlanItem>()
    for (const it of plan.value?.items ?? []) persistedById.set(it.id, it)
    const seen = new Set<number>()
    for (const [k, list] of draft) {
      const { day, track } = splitCellKey(k)
      for (let i = 0; i < list.length; i++) {
        const c = list[i]!
        const p = c.id != null ? persistedById.get(c.id) : undefined
        if (!p) return true
        seen.add(p.id)
        if (!sameRange(c, p) || p.day_of_week !== day || p.track_type !== track || (p.order ?? 0) !== i) return true
      }
    }
    for (const it of plan.value?.items ?? []) if (!seen.has(it.id)) return true
    return false
  })

  const matrixSummary = computed(() => {
    let hifzAyahs = 0
    let reviewSessions = 0
    const plannedDays = new Set<number>()
    for (const [k, list] of draft) {
      const { day, track } = splitCellKey(k)
      if (list.length) plannedDays.add(day)
      for (const c of list) {
        if (track === 'Hifz') hifzAyahs += totalVersesInRange(c.start_surah, c.start_verse, c.end_surah, c.end_verse)
        else reviewSessions += 1
      }
    }
    return { hifzAyahs, reviewSessions, restDays: restDays.size, plannedDays: plannedDays.size }
  })

  function clearWeek() {
    draft.clear()
    restDays.clear()
  }

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
        let existingId: number | null = null
        try {
          const raw = await api<unknown>(`/weekly-plans?student_id=${studentId}&halaqa_id=${halaqaId}&week_start_date=${week}`)
          existingId = unwrapList<ApiWeeklyPlan>(raw)[0]?.id ?? null
        } catch {
          // No existing plan (or lookup failed) — treat as "none" and try to create.
        }

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

  async function addItem(dto: CreatePlanItemDto) {
    const halaqaId = selectedHalaqaId.value
    const studentId = selectedStudentId.value
    if (!halaqaId || !studentId) return
    isSaving.value = true
    try {
      if (!plan.value) {
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

  function dateOfDay(dayOfWeek: number): Date {
    const d = new Date(selectedWeekStart.value)
    d.setDate(d.getDate() + dayOfWeek)
    return d
  }

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

    draft,
    restDays,
    copiedCell,
    wizardOpen,
    activeDays,
    matrixDirty,
    matrixSummary,

    filteredItems,
    summary,
    hasActiveFilters,
    hasStudents,
    studentById,
    studentName,
    studentAvatar,
    dateOfDay,

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

    getCell,
    getCells,
    setCell,
    addSession,
    updateSession,
    removeSession,
    clearCell,
    toggleRestDay,
    applyTrackGeneration,
    copyRowToAllDays,
    applyColumnToAllDays,
    copyCell,
    pasteCell,
    moveCell,
    moveSession,
    reorderSession,
    saveDraft,
    clearWeek,
    applyPlanToStudents
  }
}
