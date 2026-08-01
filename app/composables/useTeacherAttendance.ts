import { computed, ref } from 'vue'
import type {
  ApiTeacherAttendance,
  ApiTeacherAttendanceListResult,
  AttendanceStatus,
  TeacherAttendanceSyncEntry,
  TeacherAttendanceSyncResult
} from '~/types'
import { unwrapList } from '~/utils/api/list'
import type { StatusFilter, ViewMode } from '~/composables/useAttendance'

export interface StaffRow {
  userId: string
  name: string
  avatar: string
  status: AttendanceStatus
  notes: string
}

interface ExistingStaffRecord {
  id: number
  status: AttendanceStatus
  notes: string
}

interface RowSnapshot {
  status: AttendanceStatus
  notes: string
}

const search = ref('')
const staffRows = ref<StaffRow[]>([])
const existingRecords = ref<Map<string, ExistingStaffRecord>>(new Map())
const originalSnapshot = ref<Map<string, RowSnapshot>>(new Map())
const selectedDate = ref<string>(new Date().toISOString().split('T')[0]!)
const isLoading = ref(false)
const isSaving = ref(false)
const loadError = ref<string | null>(null)
const saveError = ref<string | null>(null)
const statusFilter = ref<StatusFilter>('all')
const viewMode = ref<ViewMode>('table')

function snapshotCurrentRows() {
  const snap = new Map<string, RowSnapshot>()
  staffRows.value.forEach((row) => {
    snap.set(row.userId, { status: row.status, notes: row.notes })
  })
  originalSnapshot.value = snap
}

export function useTeacherAttendance() {
  const api = useApi()
  const apiError = useApiError()

  async function fetchAttendanceByDate(date: string): Promise<ApiTeacherAttendance[]> {
    const raw = await api<ApiTeacherAttendanceListResult | ApiTeacherAttendance[]>(
      `/attendance/teachers?date=${date}&limit=100`
    )
    return unwrapList<ApiTeacherAttendance>(raw)
  }

  function indexByUser(rows: ApiTeacherAttendance[]): Map<string, ExistingStaffRecord> {
    const map = new Map<string, ExistingStaffRecord>()
    rows.forEach((a) => {
      map.set(String(a.user_id), { id: a.id, status: a.status, notes: a.excuse_note || '' })
    })
    return map
  }

  async function loadSession(date: string) {
    selectedDate.value = date
    isLoading.value = true
    loadError.value = null
    try {
      // The attendance list carries the staff member's name + photo for every
      // role (principal, VP, supervisor, teacher) via the seeded "present by
      // default" rows, so it is the single source for the roster. This also
      // works for non-admin viewers, who cannot call the admin-only GET /users.
      const existingData = await fetchAttendanceByDate(date)
      existingRecords.value = indexByUser(existingData)

      staffRows.value = existingData
        .map((a): StaffRow => {
          const name = a.user_name?.trim() || `#${a.user_id}`
          return {
            userId: String(a.user_id),
            name,
            avatar: a.user_photo_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}`,
            status: a.status,
            notes: a.excuse_note || ''
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      snapshotCurrentRows()
    } catch (e: any) {
      loadError.value = apiError.format(e, 'حدث خطأ أثناء تحميل حضور الطاقم')
    } finally {
      isLoading.value = false
    }
  }

  async function submitSession() {
    isSaving.value = true
    saveError.value = null
    try {
      const records: TeacherAttendanceSyncEntry[] = []
      for (const row of staffRows.value) {
        const snap = originalSnapshot.value.get(row.userId)
        const changed = !snap || snap.status !== row.status || snap.notes !== row.notes
        if (!changed) continue
        records.push({
          user_id: Number(row.userId),
          date: selectedDate.value,
          status: row.status,
          excuse_note: row.notes || undefined
        })
      }

      if (records.length > 0) {
        await api<TeacherAttendanceSyncResult>('/attendance/teachers/sync', {
          method: 'POST',
          body: { records }
        })
        existingRecords.value = indexByUser(await fetchAttendanceByDate(selectedDate.value))
      }
      snapshotCurrentRows()
    } catch (e: any) {
      saveError.value = apiError.format(e, 'حدث خطأ أثناء حفظ حضور الطاقم')
      throw e
    } finally {
      isSaving.value = false
    }
  }

  // Single-row correction via PATCH — records modification_reason server-side.
  async function correct(
    attendanceId: number,
    payload: { status: AttendanceStatus, excuseNote?: string, modificationReason?: string }
  ): Promise<ApiTeacherAttendance> {
    const updated = await api<ApiTeacherAttendance>(`/attendance/teachers/${attendanceId}`, {
      method: 'PATCH',
      body: {
        status: payload.status,
        excuse_note: payload.excuseNote,
        modification_reason: payload.modificationReason
      }
    })
    const userId = String(updated.user_id)
    existingRecords.value.set(userId, { id: updated.id, status: updated.status, notes: updated.excuse_note || '' })
    const row = staffRows.value.find(r => r.userId === userId)
    if (row) {
      row.status = updated.status
      row.notes = updated.excuse_note || ''
    }
    const snap = originalSnapshot.value.get(userId)
    if (snap) {
      snap.status = updated.status
      snap.notes = updated.excuse_note || ''
    }
    return updated
  }

  function setStatus(userId: string, status: AttendanceStatus) {
    const row = staffRows.value.find(r => r.userId === userId)
    if (row) row.status = status
  }

  function setNote(userId: string, notes: string) {
    const row = staffRows.value.find(r => r.userId === userId)
    if (row) row.notes = notes
  }

  function markAllPresent(): (RowSnapshot & { userId: string })[] {
    const snap = staffRows.value.map(r => ({ userId: r.userId, status: r.status, notes: r.notes }))
    for (const r of staffRows.value) r.status = 'present'
    return snap
  }

  function applyUndoSnapshot(snap: (RowSnapshot & { userId: string })[]) {
    snap.forEach((s) => {
      const row = staffRows.value.find(r => r.userId === s.userId)
      if (row) {
        row.status = s.status
        row.notes = s.notes
      }
    })
  }

  function discardChanges() {
    staffRows.value.forEach((row) => {
      const snap = originalSnapshot.value.get(row.userId)
      if (snap) {
        row.status = snap.status
        row.notes = snap.notes
      }
    })
  }

  const presentCount = computed(() => staffRows.value.filter(r => r.status === 'present').length)
  const absentCount = computed(() => staffRows.value.filter(r => r.status === 'absent').length)
  const lateCount = computed(() => staffRows.value.filter(r => r.status === 'late').length)
  const excusedCount = computed(() => staffRows.value.filter(r => r.status === 'excused').length)

  const filteredRows = computed(() => {
    const q = search.value.trim().toLowerCase()
    return staffRows.value.filter((r) => {
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
    if (originalSnapshot.value.size === 0 && staffRows.value.length === 0) return false
    for (const row of staffRows.value) {
      const snap = originalSnapshot.value.get(row.userId)
      if (!snap) return true
      if (snap.status !== row.status) return true
      if (snap.notes !== row.notes) return true
    }
    return false
  })

  return {
    staffRows,
    search,
    selectedDate,
    isLoading,
    isSaving,
    loadError,
    saveError,
    presentCount,
    absentCount,
    lateCount,
    excusedCount,
    filteredRows,
    hasActiveFilters,
    statusFilter,
    viewMode,
    isDirty,
    loadSession,
    submitSession,
    correct,
    setStatus,
    setNote,
    clearFilters,
    markAllPresent,
    applyUndoSnapshot,
    discardChanges
  }
}
