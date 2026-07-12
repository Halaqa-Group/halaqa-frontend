import { computed, ref } from 'vue'
import type {
  ApiAttendance,
  ApiAttendanceListResult,
  ApiStudent,
  ApiStudentListResult,
  AttendanceStatus,
  AttendanceSyncEntry,
  AttendanceSyncResult
} from '~/types'
import { unwrapList } from '~/utils/api/list'

export interface AttendanceRow {
  studentId: string
  name: string
  avatar: string
  currentSurah: string
  status: AttendanceStatus
  notes: string
}

interface ExistingRecord {
  id: number
  status: AttendanceStatus
  notes: string
}

interface RowSnapshot {
  status: AttendanceStatus
  notes: string
}

export type StatusFilter = 'all' | AttendanceStatus
export type ViewMode = 'grid' | 'table'

const search = ref('')
const attendanceRows = ref<AttendanceRow[]>([])
const existingRecords = ref<Map<string, ExistingRecord>>(new Map())
const originalSnapshot = ref<Map<string, RowSnapshot>>(new Map())
const historyByDate = ref<Map<string, ApiAttendance[]>>(new Map())
const selectedHalaqaId = ref<number | null>(null)
const selectedDate = ref<string>(new Date().toISOString().split('T')[0]!)
const isLoading = ref(false)
const isSaving = ref(false)
const loadError = ref<string | null>(null)
const saveError = ref<string | null>(null)
const statusFilter = ref<StatusFilter>('all')
const viewMode = ref<ViewMode>('table')

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function snapshotCurrentRows() {
  const snap = new Map<string, RowSnapshot>()
  attendanceRows.value.forEach((row) => {
    snap.set(row.studentId, { status: row.status, notes: row.notes })
  })
  originalSnapshot.value = snap
}

export function useAttendance() {
  const api = useApi()

  async function fetchAttendanceByDate(date: string): Promise<ApiAttendance[]> {
    const raw = await api<ApiAttendanceListResult | ApiAttendance[]>(
      `/attendance/students?date=${date}&limit=100`
    )
    return unwrapList<ApiAttendance>(raw)
  }

  function indexByStudent(rows: ApiAttendance[]): Map<string, ExistingRecord> {
    const map = new Map<string, ExistingRecord>()
    rows.forEach((a) => {
      map.set(String(a.student_id), { id: a.id, status: a.status, notes: a.excuse_note || '' })
    })
    return map
  }

  async function loadSession(halaqaId: number, date: string) {
    selectedHalaqaId.value = halaqaId
    selectedDate.value = date
    isLoading.value = true
    loadError.value = null
    try {
      const yesterday = new Date(date)
      yesterday.setDate(yesterday.getDate() - 1)

      const [studentsRaw, existingData, yesterdayData] = await Promise.all([
        api<ApiStudentListResult | ApiStudent[]>(`/students?halaqa_id=${halaqaId}&limit=100`),
        fetchAttendanceByDate(date),
        fetchAttendanceByDate(isoOf(yesterday))
      ])
      const studentsData = unwrapList<ApiStudent>(studentsRaw)

      const recMap = indexByStudent(existingData)
      existingRecords.value = recMap

      const histMap = new Map<string, ApiAttendance[]>()
      histMap.set(isoOf(yesterday), yesterdayData)
      historyByDate.value = histMap

      attendanceRows.value = studentsData.map((s) => {
        const ex = recMap.get(String(s.id))
        return {
          studentId: String(s.id),
          name: s.name,
          avatar: s.photo_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(s.name)}`,
          currentSurah: '—',
          status: ex ? ex.status : 'present' as AttendanceStatus,
          notes: ex?.notes || ''
        }
      })
      snapshotCurrentRows()
    } catch (e: any) {
      loadError.value = e?.data?.message || 'حدث خطأ أثناء تحميل الحضور'
    } finally {
      isLoading.value = false
    }
  }

  async function submitSession() {
    if (!selectedHalaqaId.value) return
    isSaving.value = true
    saveError.value = null
    try {
      const records: AttendanceSyncEntry[] = []
      for (const row of attendanceRows.value) {
        const snap = originalSnapshot.value.get(row.studentId)
        const changed = !snap || snap.status !== row.status || snap.notes !== row.notes
        if (!changed) continue
        records.push({
          student_id: Number(row.studentId),
          date: selectedDate.value,
          status: row.status,
          excuse_note: row.notes || undefined
        })
      }

      if (records.length > 0) {
        await api<AttendanceSyncResult>('/attendance/students/sync', {
          method: 'POST',
          body: { records }
        })
        // Re-pull the day's rows so ids/statuses reflect what the server stored.
        existingRecords.value = indexByStudent(await fetchAttendanceByDate(selectedDate.value))
      }
      snapshotCurrentRows()
    } catch (e: any) {
      saveError.value = e?.data?.message || 'حدث خطأ أثناء حفظ الحضور'
      throw e
    } finally {
      isSaving.value = false
    }
  }

  // Single-row correction via the dedicated PATCH endpoint. Unlike the bulk /sync
  // path, this records a modification_reason and preserves original_status server-side.
  async function correct(
    attendanceId: number,
    payload: { status: AttendanceStatus, excuseNote?: string, modificationReason?: string }
  ): Promise<ApiAttendance> {
    const updated = await api<ApiAttendance>(`/attendance/students/${attendanceId}`, {
      method: 'PATCH',
      body: {
        status: payload.status,
        excuse_note: payload.excuseNote,
        modification_reason: payload.modificationReason
      }
    })
    // Reflect the corrected row into local state.
    const studentId = String(updated.student_id)
    existingRecords.value.set(studentId, {
      id: updated.id,
      status: updated.status,
      notes: updated.excuse_note || ''
    })
    const row = attendanceRows.value.find(r => r.studentId === studentId)
    if (row) {
      row.status = updated.status
      row.notes = updated.excuse_note || ''
    }
    const snap = originalSnapshot.value.get(studentId)
    if (snap) {
      snap.status = updated.status
      snap.notes = updated.excuse_note || ''
    }
    return updated
  }

  function setStatus(studentId: string, status: AttendanceStatus) {
    const row = attendanceRows.value.find(r => r.studentId === studentId)
    if (row) row.status = status
  }

  function cycleStatus(studentId: string) {
    const row = attendanceRows.value.find(r => r.studentId === studentId)
    if (!row) return
    const next: Record<AttendanceStatus, AttendanceStatus> = {
      present: 'late',
      late: 'absent',
      absent: 'excused',
      excused: 'present'
    }
    row.status = next[row.status]
  }

  function setNote(studentId: string, notes: string) {
    const row = attendanceRows.value.find(r => r.studentId === studentId)
    if (row) row.notes = notes
  }

  function setFilter(filter: StatusFilter) {
    statusFilter.value = filter
  }

  function toggleFilter(filter: StatusFilter) {
    statusFilter.value = statusFilter.value === filter ? 'all' : filter
  }

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode
  }

  function markAllPresent(): RowSnapshot[] {
    const snap: RowSnapshot[] = attendanceRows.value.map(r => ({
      status: r.status,
      notes: r.notes
    }))
    const ids = attendanceRows.value.map(r => r.studentId)
    for (const r of attendanceRows.value) r.status = 'present'
    return snap.map((s, i) => ({ ...s, studentId: ids[i] } as any))
  }

  function applyUndoSnapshot(snap: any[]) {
    snap.forEach((s) => {
      const row = attendanceRows.value.find(r => r.studentId === s.studentId)
      if (row) {
        row.status = s.status
        row.notes = s.notes
      }
    })
  }

  function discardChanges() {
    attendanceRows.value.forEach((row) => {
      const snap = originalSnapshot.value.get(row.studentId)
      if (snap) {
        row.status = snap.status
        row.notes = snap.notes
      }
    })
  }

  function wasAbsentYesterday(studentId: string): boolean {
    const yesterday = new Date(selectedDate.value)
    yesterday.setDate(yesterday.getDate() - 1)
    const recs = historyByDate.value.get(isoOf(yesterday)) ?? []
    return recs.some(r => String(r.student_id) === studentId && r.status === 'absent')
  }

  const presentCount = computed(() => attendanceRows.value.filter(r => r.status === 'present').length)
  const absentCount = computed(() => attendanceRows.value.filter(r => r.status === 'absent').length)
  const lateCount = computed(() => attendanceRows.value.filter(r => r.status === 'late').length)
  const excusedCount = computed(() => attendanceRows.value.filter(r => r.status === 'excused').length)
  const attendanceRate = computed(() =>
    attendanceRows.value.length > 0
      ? Math.round((presentCount.value / attendanceRows.value.length) * 100)
      : 0
  )

  const filteredRows = computed(() => {
    const q = search.value.trim().toLowerCase()
    return attendanceRows.value.filter((r) => {
      if (statusFilter.value !== 'all' && r.status !== statusFilter.value) return false
      if (q && !r.name.toLowerCase().includes(q)) return false
      return true
    })
  })

  const hasActiveFilters = computed(() => search.value.trim() !== '' || statusFilter.value !== 'all')
  function clearFilters() {
    search.value = ''
    statusFilter.value = 'all'
  }

  const isDirty = computed(() => {
    if (originalSnapshot.value.size === 0 && attendanceRows.value.length === 0) return false
    for (const row of attendanceRows.value) {
      const snap = originalSnapshot.value.get(row.studentId)
      if (!snap) return true
      if (snap.status !== row.status) return true
      if (snap.notes !== row.notes) return true
    }
    return false
  })

  return {
    attendanceRows,
    search,
    selectedHalaqaId,
    selectedDate,
    isLoading,
    isSaving,
    loadError,
    saveError,
    presentCount,
    absentCount,
    lateCount,
    excusedCount,
    attendanceRate,
    filteredRows,
    hasActiveFilters,
    statusFilter,
    viewMode,
    isDirty,
    loadSession,
    submitSession,
    correct,
    setStatus,
    cycleStatus,
    setNote,
    setFilter,
    toggleFilter,
    setViewMode,
    clearFilters,
    markAllPresent,
    applyUndoSnapshot,
    discardChanges,
    wasAbsentYesterday
  }
}
