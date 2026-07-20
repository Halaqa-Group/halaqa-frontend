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

interface StaffUser {
  id: number
  name: string
  photo_url?: string | null
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
      const [rosterRaw, existingData] = await Promise.all([
        api<{ items: StaffUser[] } | StaffUser[]>('/users?role=teacher&limit=100'),
        fetchAttendanceByDate(date)
      ])
      const roster = unwrapList<StaffUser>(rosterRaw)

      const recMap = indexByUser(existingData)
      existingRecords.value = recMap

      // Start from the roster, then append any seeded/recorded staff not in it
      // (e.g. admins) so every attendance row on the day is visible and editable.
      const byId = new Map<string, StaffRow>()
      roster.forEach((u) => {
        const ex = recMap.get(String(u.id))
        byId.set(String(u.id), {
          userId: String(u.id),
          name: u.name,
          avatar: u.photo_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(u.name)}`,
          status: ex ? ex.status : 'present' as AttendanceStatus,
          notes: ex?.notes || ''
        })
      })
      existingData.forEach((a) => {
        const key = String(a.user_id)
        if (byId.has(key)) return
        byId.set(key, {
          userId: key,
          name: `#${a.user_id}`,
          avatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${key}`,
          status: a.status,
          notes: a.excuse_note || ''
        })
      })

      staffRows.value = Array.from(byId.values())
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
