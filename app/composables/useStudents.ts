import { ref } from 'vue'
import {
  LazyStudentFormModal,
  LazyStudentViewModal,
  LazyStudentNotifyParentModal,
  LazyStudentDeleteConfirmModal,
  LazyStudentGraduateConfirmModal
} from '#components'
import type {
  Student,
  StudentNote,
  StudentAchievementSummary,
  StudentAttendanceEntry,
  StudentWeeklyPlanSummary,
  ApiGuardian,
  ApiStudent,
  ApiStudentListResult,
  ApiStudentsStats
} from '~/types'

const students = ref<Student[]>([])
const searchQuery = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)
const totalStudents = ref(0)
const studentNotes = ref<Record<string, StudentNote[]>>({})
const studentAchievements = ref<Record<string, StudentAchievementSummary[]>>({})
const studentAttendance = ref<Record<string, StudentAttendanceEntry[]>>({})
const studentWeeklyPlan = ref<Record<string, StudentWeeklyPlanSummary>>({})
const studentsStats = ref<ApiStudentsStats | null>(null)
const isStatsLoading = ref(false)

// ── Dummy parent-notification seeding (frontend-only until backend ships) ──
const DUMMY_AUTHORS = [
  { id: 9001, name: 'الأستاذ أحمد العبدالله' },
  { id: 9002, name: 'الأستاذ خالد المنصوري' },
  { id: 9003, name: 'الأستاذة منيرة الحربي' }
]

const DUMMY_NOTE_TEMPLATES = [
  'الطالب أبدى تحسناً ملحوظاً في الحفظ هذا الأسبوع.',
  'يرجى متابعة المراجعة اليومية في المنزل.',
  'تأخر الطالب عن الحلقة اليوم، نأمل الالتزام بالمواعيد.',
  'إنجاز ممتاز في حفظ سورة جديدة، نهنئكم.',
  'يحتاج الطالب إلى دعم إضافي في درس التجويد.'
]

function seedNotesFor(student: Student) {
  if (studentNotes.value[student.id]) return
  const idHash = Number.parseInt(student.id, 10) || 0
  const count = (idHash % 3) + 1
  const notes: StudentNote[] = []
  for (let i = 0; i < count; i++) {
    const author = DUMMY_AUTHORS[(idHash + i) % DUMMY_AUTHORS.length]!
    const message = DUMMY_NOTE_TEMPLATES[(idHash + i) % DUMMY_NOTE_TEMPLATES.length]!
    const date = new Date()
    date.setDate(date.getDate() - (i + 1) * 2)
    notes.push({
      id: `${student.id}-seed-${i}`,
      studentId: student.id,
      authorId: author.id,
      authorName: author.name,
      message,
      createdAt: date.toISOString()
    })
  }
  studentNotes.value[student.id] = notes
}

// ── Dummy activity (achievements / attendance / weekly plan) ──
const DUMMY_SURAHS = ['البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'التوبة']
const DUMMY_TRACKS: Array<'Hifz' | 'Near' | 'Far'> = ['Hifz', 'Near', 'Far']
const ATTENDANCE_HISTORY_DAYS = 14

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function seedActivityFor(student: Student) {
  const idHash = Number.parseInt(student.id, 10) || 0
  const today = new Date()

  if (!studentAchievements.value[student.id]) {
    const count = (idHash % 3) + 3
    const list: StudentAchievementSummary[] = []
    for (let i = 0; i < count; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - (i + 1) * 2)
      const trackType = DUMMY_TRACKS[(idHash + i) % DUMMY_TRACKS.length]!
      const surah = DUMMY_SURAHS[(idHash + i) % DUMMY_SURAHS.length]!
      const startVerse = ((idHash + i * 3) % 30) + 1
      const endVerse = startVerse + ((idHash + i) % 8) + 2
      list.push({
        id: `${student.id}-ach-${i}`,
        date: isoOf(date),
        trackType,
        startSurah: surah,
        startVerse,
        endSurah: surah,
        endVerse,
        score: 70 + ((idHash + i * 7) % 26),
        status: ((idHash + i) % 5 === 0) ? 'unapproved' : 'approved'
      })
    }
    studentAchievements.value[student.id] = list
  }

  if (!studentAttendance.value[student.id]) {
    const list: StudentAttendanceEntry[] = []
    for (let i = ATTENDANCE_HISTORY_DAYS - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const seed = (idHash + i) % 10
      let status: StudentAttendanceEntry['status']
      if (seed < 7) status = 'Present'
      else if (seed < 8) status = 'Late'
      else if (seed < 9) status = 'Absent'
      else status = 'Excused'
      list.push({
        id: `${student.id}-att-${i}`,
        date: isoOf(date),
        status
      })
    }
    studentAttendance.value[student.id] = list
  }

  if (!studentWeeklyPlan.value[student.id]) {
    const weekStart = new Date(today)
    // Backtrack to the most recent Saturday (week start in this domain).
    const daysToSat = (weekStart.getDay() + 1) % 7
    weekStart.setDate(weekStart.getDate() - daysToSat)
    const totalPlanned = 14
    const totalAchieved = Math.min(totalPlanned, ((idHash * 3 + 5) % 9) + 6)
    studentWeeklyPlan.value[student.id] = {
      weekStartDate: isoOf(weekStart),
      totalPlanned,
      totalAchieved,
      coveragePercent: Math.round((totalAchieved / totalPlanned) * 100)
    }
  }
}

function apiToStudent(s: ApiStudent): Student {
  const hifz = Number(s.daily_hifz_pages_capacity) || 0
  const near = Number(s.daily_near_pages_capacity) || 0
  const far = Number(s.daily_far_pages_capacity) || 0
  const id = String(s.id)
  const guardians = s.guardians ?? []

  return {
    id,
    name: s.name,
    gender: s.gender ?? 'male',
    status: s.status,
    dob: s.dob,
    joinDate: s.join_date,
    notes: s.notes,
    currentSurah: s.current_surah ?? null,
    progress: s.progress_percent ?? null,
    weekProgress: s.week_progress_percent ?? null,
    halaqat: s.halaqat ?? (s.halaqa_name ? [s.halaqa_name] : []),
    attendance: s.attendance_rate ?? null,
    dailyHifzPagesCapacity: hifz,
    dailyNearPagesCapacity: near,
    dailyFarPagesCapacity: far,
    guardians,
    avatar: s.photo_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(s.name)}`
  }
}

export function useStudents() {
  const api = useApi()
  const toast = useToast()
  const { t } = useI18n()
  const overlay = useOverlay()

  async function fetchStudents(halaqaId?: number) {
    isLoading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      if (halaqaId) params.set('halaqa_id', String(halaqaId))
      const data = await api<ApiStudentListResult | ApiStudent[]>(`/students${params.toString() ? `?${params}` : ''}`)
      const items = Array.isArray(data) ? data : data.items
      students.value = items.map(apiToStudent)
      totalStudents.value = Array.isArray(data) ? items.length : data.total
      students.value.forEach((s) => {
        seedNotesFor(s)
        seedActivityFor(s)
      })
    } catch (e: any) {
      error.value = e?.data?.message || 'حدث خطأ أثناء تحميل الطلاب'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchStudentsStats(halaqaId?: number) {
    isStatsLoading.value = true
    try {
      const params = new URLSearchParams()
      if (halaqaId) params.set('halaqa_id', String(halaqaId))
      studentsStats.value = await api<ApiStudentsStats>(
        `/students/stats${params.toString() ? `?${params}` : ''}`
      )
    } catch (e) {
      // Non-fatal: list still works without stats; cards fall back to client-side
      // counts of the loaded page until a retry succeeds.
      studentsStats.value = null
      if (import.meta.dev) console.warn('[students/stats] fetch failed', e)
    } finally {
      isStatsLoading.value = false
    }
  }

  async function createStudent(dto: Record<string, any>) {
    // Backend forces school_id from the authenticated user; we don't send it.
    const data = await api<ApiStudent>('/students', {
      method: 'POST',
      body: dto
    })
    students.value.unshift(apiToStudent(data))
    totalStudents.value += 1
    return data
  }

  async function openView(student: Student) {
    const modal = overlay.create(LazyStudentViewModal, {
      destroyOnClose: true,
      props: { student }
    })
    modal.open()
    try {
      const fresh = await fetchStudent(student.id)
      modal.patch({ student: fresh })
    } catch {
      // Keep the already available list payload if detail fetch fails.
    }
  }

  function openAdd() {
    overlay.create(LazyStudentFormModal, {
      destroyOnClose: true,
      props: { mode: 'add', student: null, loading: false }
    }).open()
  }

  async function openEdit(student: Student) {
    const modal = overlay.create(LazyStudentFormModal, {
      destroyOnClose: true,
      props: { mode: 'edit', student: null, loading: true }
    })
    modal.open()
    try {
      const data = await api<ApiStudent>(`/students/${student.id}`)
      modal.patch({ student: data, loading: false })
    } catch {
      modal.close()
      toast.add({ title: t('pages.students.addModal.loadFailed'), color: 'error' })
    }
  }

  async function updateStudent(id: number, dto: Record<string, any>) {
    const data = await api<ApiStudent>(`/students/${id}`, {
      method: 'PATCH',
      body: dto
    })
    const idx = students.value.findIndex(s => s.id === String(id))
    if (idx !== -1) {
      students.value[idx] = apiToStudent(data)
    }
    return data
  }

  async function fetchStudent(id: number | string) {
    const data = await api<ApiStudent>(`/students/${id}`)
    const student = apiToStudent(data)
    seedNotesFor(student)
    seedActivityFor(student)
    return student
  }

  function getStudentNotes(studentId: string): StudentNote[] {
    return studentNotes.value[studentId] ?? []
  }

  function openNotifyParent(student: Student) {
    overlay.create(LazyStudentNotifyParentModal, {
      destroyOnClose: true,
      props: { student }
    }).open()
  }

  async function submitParentNote(studentId: string, message: string): Promise<StudentNote | null> {
    const trimmed = message.trim()
    if (!studentId || !trimmed) return null
    // Frontend-only dummy: persist in module state. Replace with real API call later.
    const { user } = useAuth()
    const author = user.value
    const note: StudentNote = {
      id: `${studentId}-${Date.now()}`,
      studentId,
      authorId: author?.id ?? 0,
      authorName: author?.name ?? 'أنا',
      message: trimmed,
      createdAt: new Date().toISOString()
    }
    const existing = studentNotes.value[studentId] ?? []
    studentNotes.value[studentId] = [note, ...existing]
    return note
  }

  async function deleteStudent(id: number | string) {
    await api(`/students/${id}`, { method: 'DELETE' })
    students.value = students.value.filter(s => s.id !== String(id))
    totalStudents.value = Math.max(totalStudents.value - 1, 0)
  }

  async function restoreStudent(id: number | string) {
    const data = await api<ApiStudent>(`/students/${id}/restore`, { method: 'POST' })
    const normalized = apiToStudent(data)
    const idx = students.value.findIndex(s => s.id === String(id))
    if (idx === -1) students.value.unshift(normalized)
    else students.value[idx] = normalized
    totalStudents.value += idx === -1 ? 1 : 0
    return data
  }

  async function graduateStudent(id: number | string, dto?: { graduation_date?: string, notes?: string }) {
    const data = await api<ApiStudent>(`/students/${id}/graduate`, {
      method: 'POST',
      body: dto ?? {}
    })
    const idx = students.value.findIndex(s => s.id === String(id))
    if (idx !== -1) students.value[idx] = apiToStudent(data)
    return data
  }

  function requestDelete(student: Student) {
    overlay.create(LazyStudentDeleteConfirmModal, {
      destroyOnClose: true,
      props: { student }
    }).open()
  }

  function requestGraduate(student: Student) {
    overlay.create(LazyStudentGraduateConfirmModal, {
      destroyOnClose: true,
      props: { student }
    }).open()
  }

  async function fetchGuardians(studentId: number | string): Promise<ApiGuardian[]> {
    return api<ApiGuardian[]>(`/students/${studentId}/guardians`)
  }

  async function linkGuardian(studentId: number | string, dto: Record<string, any>) {
    return api<ApiGuardian>(`/students/${studentId}/guardians`, { method: 'POST', body: dto })
  }

  async function updateGuardian(studentId: number | string, guardianUserId: number | string, dto: Record<string, any>) {
    return api<ApiGuardian>(`/students/${studentId}/guardians/${guardianUserId}`, {
      method: 'PATCH',
      body: dto
    })
  }

  async function unlinkGuardian(studentId: number | string, guardianUserId: number | string) {
    await api(`/students/${studentId}/guardians/${guardianUserId}`, { method: 'DELETE' })
  }

  return {
    students,
    isLoading,
    error,
    totalStudents,
    studentNotes,
    studentAchievements,
    studentAttendance,
    studentWeeklyPlan,
    studentsStats,
    isStatsLoading,
    searchQuery,
    fetchStudents,
    fetchStudentsStats,
    fetchStudent,
    createStudent,
    updateStudent,
    deleteStudent,
    restoreStudent,
    graduateStudent,
    requestDelete,
    requestGraduate,
    fetchGuardians,
    linkGuardian,
    updateGuardian,
    unlinkGuardian,
    openView,
    openAdd,
    openEdit,
    openNotifyParent,
    submitParentNote,
    getStudentNotes
  }
}
