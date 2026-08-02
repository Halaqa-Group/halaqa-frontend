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
import { ETHICS_RATING_DEFAULT, ETHICS_RATING_MAX, ETHICS_RATING_MIN } from '~/data/constants'

export interface AttendanceRow {
  studentId: string
  name: string
  avatar: string
  currentSurah: string
  status: AttendanceStatus
  /** تقييم الأخلاق — 1..5, starts at the full mark and is lowered by exception. */
  ethicsRating: number
  notes: string
  /**
   * ملاحظة المحفّظ اليومية — teacher's daily note (report `teacher_note`). Saved
   * through the single-row correction endpoint only; the attendance list does
   * not return it yet, so it starts empty on every reload.
   */
  dailyNote: string
}

interface ExistingRecord {
  id: number
  status: AttendanceStatus
  ethicsRating: number
  notes: string
  dailyNote: string
}

interface RowSnapshot {
  status: AttendanceStatus
  ethicsRating: number
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

// Dedup guard for loadSession. On entry the attendance page can fire several
// identical loads in the same tick — page onMounted, the halaqa-resolve watcher,
// the date watcher, and tab (re)activation. We fetch a given (halaqa, date) once
// and let repeat triggers reuse the in-flight or already-loaded result.
let loadedSessionKey: string | null = null
let inFlightSession: { key: string, promise: Promise<void> } | null = null
// Aborts a superseded session load (different halaqa/date, or a forced reload) so
// its slower roster+attendance response can't resolve after — and overwrite — the
// rows the newer load put on screen. Module-scoped to match the shared state above.
const sessionRequests = useAbortController()

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function snapshotCurrentRows() {
  const snap = new Map<string, RowSnapshot>()
  attendanceRows.value.forEach((row) => {
    snap.set(row.studentId, { status: row.status, ethicsRating: row.ethicsRating, notes: row.notes })
  })
  originalSnapshot.value = snap
}

export function useAttendance() {
  const api = useApi()
  const apiError = useApiError()

  async function fetchAttendanceByDate(date: string, signal?: AbortSignal): Promise<ApiAttendance[]> {
    const raw = await api<ApiAttendanceListResult | ApiAttendance[]>(
      `/attendance/students?date=${date}&limit=100`,
      { signal }
    )
    return unwrapList<ApiAttendance>(raw)
  }

  function indexByStudent(rows: ApiAttendance[]): Map<string, ExistingRecord> {
    const map = new Map<string, ExistingRecord>()
    rows.forEach((a) => {
      map.set(String(a.student_id), {
        id: a.id,
        status: a.status,
        ethicsRating: a.ethics_rating ?? ETHICS_RATING_DEFAULT,
        notes: a.excuse_note || '',
        dailyNote: a.daily_note || ''
      })
    })
    return map
  }

  // Forget the "already loaded" marker so the next loadSession fetches fresh.
  // Called when the attendance page unmounts so revisiting it reloads once,
  // while the dedup still collapses the burst of triggers within a single visit.
  function resetSessionCache() {
    loadedSessionKey = null
    inFlightSession = null
  }

  // halaqaId null loads every student the caller may see — the school-wide roster
  // for a principal. Attendance itself is stored per (student, date), so the
  // sync payload never carries a halaqa.
  async function loadSession(halaqaId: number | null, date: string, opts: { force?: boolean } = {}) {
    const key = `${halaqaId ?? 'all'}:${date}`
    // Same scope already loaded (or being loaded) → reuse it instead of firing a
    // duplicate roster + attendance round-trip. `force` re-fetches on demand.
    if (!opts.force) {
      if (inFlightSession && inFlightSession.key === key) return inFlightSession.promise
      if (key === loadedSessionKey) return
    }

    // A different scope or a forced reload supersedes the previous load.
    const signal = sessionRequests.begin('session')
    const run = performLoad(halaqaId, date, key, signal)
    inFlightSession = { key, promise: run }
    try {
      await run
    } finally {
      if (inFlightSession?.key === key) inFlightSession = null
      sessionRequests.end('session', signal)
    }
  }

  async function performLoad(halaqaId: number | null, date: string, key: string, signal: AbortSignal) {
    selectedHalaqaId.value = halaqaId
    selectedDate.value = date
    isLoading.value = true
    loadError.value = null
    try {
      const yesterday = new Date(date)
      yesterday.setDate(yesterday.getDate() - 1)

      const studentsQuery = halaqaId !== null ? `?halaqa_id=${halaqaId}&limit=100` : '?limit=100'
      const [studentsRaw, existingData, yesterdayData] = await Promise.all([
        api<ApiStudentListResult | ApiStudent[]>(`/students${studentsQuery}`, { signal }),
        fetchAttendanceByDate(date, signal),
        fetchAttendanceByDate(isoOf(yesterday), signal)
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
          ethicsRating: ex ? ex.ethicsRating : ETHICS_RATING_DEFAULT,
          notes: ex?.notes || '',
          dailyNote: ex?.dailyNote || ''
        }
      })
      snapshotCurrentRows()
      loadedSessionKey = key
    } catch (e: any) {
      // Superseded by a newer load — leave its rows/loading flag untouched.
      if (signal.aborted || isAbortError(e)) return
      loadError.value = apiError.format(e, 'حدث خطأ أثناء تحميل الحضور')
      loadedSessionKey = null
    } finally {
      if (!signal.aborted) isLoading.value = false
    }
  }

  async function submitSession() {
    isSaving.value = true
    saveError.value = null
    try {
      const records: AttendanceSyncEntry[] = []
      for (const row of attendanceRows.value) {
        const snap = originalSnapshot.value.get(row.studentId)
        const changed = !snap
          || snap.status !== row.status
          || snap.ethicsRating !== row.ethicsRating
          || snap.notes !== row.notes
        if (!changed) continue
        records.push({
          student_id: Number(row.studentId),
          date: selectedDate.value,
          status: row.status,
          ethics_rating: row.ethicsRating,
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
      saveError.value = apiError.format(e, 'حدث خطأ أثناء حفظ الحضور')
      throw e
    } finally {
      isSaving.value = false
    }
  }

  // Single-row correction via the dedicated PATCH endpoint. Unlike the bulk /sync
  // path, this records a modification_reason and preserves original_status server-side.
  // `status` and `ethicsRating` are both optional server-side; send whichever
  // actually changed. Sending neither (or values equal to the stored row) is 400.
  async function correct(
    attendanceId: number,
    payload: {
      status?: AttendanceStatus
      ethicsRating?: number
      excuseNote?: string
      dailyNote?: string
      modificationReason?: string
    }
  ): Promise<ApiAttendance> {
    const updated = await api<ApiAttendance>(`/attendance/students/${attendanceId}`, {
      method: 'PATCH',
      body: {
        ...(payload.status !== undefined && { status: payload.status }),
        ...(payload.ethicsRating !== undefined && { ethics_rating: payload.ethicsRating }),
        ...(payload.dailyNote !== undefined && { daily_note: payload.dailyNote }),
        excuse_note: payload.excuseNote,
        modification_reason: payload.modificationReason
      }
    })
    // Reflect the corrected row into local state. `daily_note` is not returned by
    // the endpoint yet, so keep whatever we just sent rather than blanking it.
    const studentId = String(updated.student_id)
    const rating = updated.ethics_rating ?? ETHICS_RATING_DEFAULT
    const prev = existingRecords.value.get(studentId)
    const dailyNote = updated.daily_note ?? payload.dailyNote ?? prev?.dailyNote ?? ''
    existingRecords.value.set(studentId, {
      id: updated.id,
      status: updated.status,
      ethicsRating: rating,
      notes: updated.excuse_note || '',
      dailyNote
    })
    const row = attendanceRows.value.find(r => r.studentId === studentId)
    if (row) {
      row.status = updated.status
      row.ethicsRating = rating
      row.notes = updated.excuse_note || ''
      row.dailyNote = dailyNote
    }
    const snap = originalSnapshot.value.get(studentId)
    if (snap) {
      snap.status = updated.status
      snap.ethicsRating = rating
      snap.notes = updated.excuse_note || ''
    }
    return updated
  }

  // Whether the student already has a saved attendance row for the selected day.
  // The daily note can only be written through the correction endpoint, which
  // needs a row id — so the note editor is gated on this.
  function hasSavedRecord(studentId: string): boolean {
    return existingRecords.value.has(studentId)
  }

  // Save just the teacher's daily note via the single-row correction endpoint.
  // The endpoint requires a modification reason (min 3 chars); a fixed one is
  // used since editing a note is not an attendance correction per se.
  async function saveDailyNote(studentId: string, note: string): Promise<void> {
    const ex = existingRecords.value.get(studentId)
    if (!ex) throw new Error('no-saved-record')
    await correct(ex.id, {
      dailyNote: note,
      modificationReason: 'تحديث ملاحظة المحفّظ اليومية'
    })
  }

  function setStatus(studentId: string, status: AttendanceStatus) {
    const row = attendanceRows.value.find(r => r.studentId === studentId)
    if (row) row.status = status
  }

  // Back to the "nothing to report" state the seeder would have produced:
  // present, full ethics mark, no excuse note.
  function resetRow(studentId: string) {
    const row = attendanceRows.value.find(r => r.studentId === studentId)
    if (!row) return
    row.status = 'present'
    row.ethicsRating = ETHICS_RATING_DEFAULT
    row.notes = ''
  }

  function isRowAtDefault(studentId: string): boolean {
    const row = attendanceRows.value.find(r => r.studentId === studentId)
    if (!row) return true
    return row.status === 'present' && row.ethicsRating === ETHICS_RATING_DEFAULT && !row.notes
  }

  function setEthicsRating(studentId: string, rating: number) {
    const row = attendanceRows.value.find(r => r.studentId === studentId)
    if (!row) return
    row.ethicsRating = Math.min(ETHICS_RATING_MAX, Math.max(ETHICS_RATING_MIN, Math.round(rating)))
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
      ethicsRating: r.ethicsRating,
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
        row.ethicsRating = s.ethicsRating
        row.notes = s.notes
      }
    })
  }

  function discardChanges() {
    attendanceRows.value.forEach((row) => {
      const snap = originalSnapshot.value.get(row.studentId)
      if (snap) {
        row.status = snap.status
        row.ethicsRating = snap.ethicsRating
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
      if (snap.ethicsRating !== row.ethicsRating) return true
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
    resetSessionCache,
    submitSession,
    correct,
    hasSavedRecord,
    saveDailyNote,
    setStatus,
    setEthicsRating,
    resetRow,
    isRowAtDefault,
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
