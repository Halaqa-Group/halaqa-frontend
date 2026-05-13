import { computed, ref } from 'vue'
import type { ApiAttendance, ApiStudent, AttendanceStatus } from '~/types'

interface AttendanceRow {
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
export type ViewMode = 'grid' | 'list'

export interface DateStripDay {
  iso: string
  dayName: string
  dayNumber: number
  rate: number | null
  isToday: boolean
  isFuture: boolean
}

const sessionNotes = ref('')
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
const viewMode = ref<ViewMode>('grid')

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
    sessionNotes.value = ''
    isLoading.value = true
    loadError.value = null
    try {
      const sessionDate = new Date(date)
      const fromDate = new Date(sessionDate)
      fromDate.setDate(fromDate.getDate() - 14)

      const [studentsData, existingData, historyData] = await Promise.all([
        api<ApiStudent[]>(`/students?halaqaId=${halaqaId}`),
        api<ApiAttendance[]>(`/attendance?halaqaId=${halaqaId}&date=${date}`),
        api<ApiAttendance[]>(`/attendance?halaqaId=${halaqaId}&from=${isoOf(fromDate)}&to=${date}`)
      ])

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
          avatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(s.name)}`,
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

  function appendNote(tag: string) {
    sessionNotes.value = sessionNotes.value
      ? `${sessionNotes.value}، ${tag}`
      : tag
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
    attendanceRows.value.forEach((r) => { r.status = 'present' })
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

  function rateForDate(iso: string): number | null {
    const recs = historyByDate.value.get(iso)
    if (!recs || recs.length === 0) return null
    const present = recs.filter(r => r.status === 'Present').length
    return Math.round((present / recs.length) * 100)
  }

  function buildDateStrip(locale: string, days = 14): DateStripDay[] {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIso = isoOf(today)
    const fmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short' })
    const out: DateStripDay[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const iso = isoOf(d)
      const isToday = iso === todayIso
      const isFuture = d > today
      out.push({
        iso,
        dayName: fmt.format(d),
        dayNumber: d.getDate(),
        rate: isFuture || isToday ? null : rateForDate(iso),
        isToday,
        isFuture
      })
    }
    return out
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
    if (statusFilter.value === 'all') return attendanceRows.value
    return attendanceRows.value.filter(r => r.status === statusFilter.value)
  })

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
    sessionNotes,
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
    statusFilter,
    viewMode,
    isDirty,
    loadSession,
    submitSession,
    setStatus,
    cycleStatus,
    setNote,
    appendNote,
    setFilter,
    toggleFilter,
    setViewMode,
    markAllPresent,
    applyUndoSnapshot,
    discardChanges,
    wasAbsentYesterday,
    buildDateStrip
  }
}
