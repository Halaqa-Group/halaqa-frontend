import { computed, ref } from 'vue'
import type { ApiAttendance, ApiStudent, ApiStudentListResult, AttendanceStatus } from '~/types'
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
  status: string
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
// Past 14 days of attendance for the loaded halaqa, grouped by ISO date.
// Populated by loadSession; powers buildDateStrip and wasAbsentYesterday.
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

function backendToStatus(status: string): AttendanceStatus {
  if (status === 'Present') return 'present'
  if (status === 'Late') return 'late'
  return 'absent'
}

function statusToBackend(status: AttendanceStatus): string {
  if (status === 'present') return 'Present'
  if (status === 'late') return 'Late'
  return 'Absent'
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

  async function loadSession(halaqaId: number, date: string) {
    selectedHalaqaId.value = halaqaId
    selectedDate.value = date
    isLoading.value = true
    loadError.value = null
    try {
      const sessionDate = new Date(date)
      const fromDate = new Date(sessionDate)
      fromDate.setDate(fromDate.getDate() - 14)

      const [studentsRaw, existingData, historyData] = await Promise.all([
        // Students come from the real backend (snake_case, paginated envelope).
        api<ApiStudentListResult | ApiStudent[]>(`/students?halaqa_id=${halaqaId}&limit=100`),
        // Attendance is mock-served (no backend module); its mock filters by camelCase halaqaId.
        api<ApiAttendance[]>(`/attendance?halaqaId=${halaqaId}&date=${date}`),
        api<ApiAttendance[]>(`/attendance?halaqaId=${halaqaId}&from=${isoOf(fromDate)}&to=${date}`)
      ])
      const studentsData = unwrapList<ApiStudent>(studentsRaw)

      const recMap = new Map<string, ExistingRecord>()
      existingData.forEach((a) => {
        recMap.set(String(a.student_id), { id: a.id, status: a.status, notes: a.notes || '' })
      })
      existingRecords.value = recMap

      const histMap = new Map<string, ApiAttendance[]>()
      for (const r of historyData) {
        const bucket = histMap.get(r.date) ?? []
        bucket.push(r)
        histMap.set(r.date, bucket)
      }
      historyByDate.value = histMap

      attendanceRows.value = studentsData.map((s) => {
        const ex = recMap.get(String(s.id))
        return {
          studentId: String(s.id),
          name: s.name,
          avatar: s.photo_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(s.name)}`,
          // current_surah is not on the slimmed ApiStudent — it belongs to the
          // (not-yet-built) achievements module. Leave as a placeholder.
          currentSurah: '—',
          status: ex ? backendToStatus(ex.status) : 'present' as AttendanceStatus,
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
      await Promise.all(
        attendanceRows.value.map((row) => {
          const existing = existingRecords.value.get(row.studentId)
          const newStatus = statusToBackend(row.status)
          const newNotes = row.notes || null

          if (!existing) {
            return api('/attendance', {
              method: 'POST',
              body: {
                student_id: Number(row.studentId),
                halaqa_id: selectedHalaqaId.value,
                date: selectedDate.value,
                status: newStatus,
                notes: newNotes
              }
            }).then((created: any) => {
              existingRecords.value.set(row.studentId, { id: created.id, status: newStatus, notes: row.notes || '' })
            })
          }

          const statusChanged = existing.status !== newStatus
          const notesChanged = existing.notes !== (row.notes || '')
          if (!statusChanged && !notesChanged) return Promise.resolve()

          return api(`/attendance/${existing.id}`, {
            method: 'PATCH',
            body: { status: newStatus, notes: newNotes }
          }).then(() => {
            existing.status = newStatus
            existing.notes = row.notes || ''
          })
        })
      )
      snapshotCurrentRows()
    } catch (e: any) {
      saveError.value = e?.data?.message || 'حدث خطأ أثناء حفظ الحضور'
      throw e
    } finally {
      isSaving.value = false
    }
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
      absent: 'present'
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
    return recs.some(r => String(r.student_id) === studentId && r.status === 'Absent')
  }

  const presentCount = computed(() => attendanceRows.value.filter(r => r.status === 'present').length)
  const absentCount = computed(() => attendanceRows.value.filter(r => r.status === 'absent').length)
  const lateCount = computed(() => attendanceRows.value.filter(r => r.status === 'late').length)
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
    attendanceRate,
    filteredRows,
    hasActiveFilters,
    statusFilter,
    viewMode,
    isDirty,
    loadSession,
    submitSession,
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
