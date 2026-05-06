import { ref } from 'vue'
import type {
  Student,
  StudentNote,
  StudentAchievementSummary,
  StudentAttendanceEntry,
  StudentWeeklyPlanSummary,
  ApiGuardian,
  ApiStudent,
  ApiStudentListResult
} from '~/types'

const students = ref<Student[]>([])
const isAddModalOpen = ref(false)
const isViewModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isNotifyParentOpen = ref(false)
const viewingStudent = ref<Student | null>(null)
const editingApiStudent = ref<ApiStudent | null>(null)
const notifyingStudent = ref<Student | null>(null)
const isEditLoading = ref(false)
const isNotifySubmitting = ref(false)
const searchQuery = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)
const totalStudents = ref(0)
const studentNotes = ref<Record<string, StudentNote[]>>({})
const studentAchievements = ref<Record<string, StudentAchievementSummary[]>>({})
const studentAttendance = ref<Record<string, StudentAttendanceEntry[]>>({})
const studentWeeklyPlan = ref<Record<string, StudentWeeklyPlanSummary>>({})

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

// ── Dummy guardian seeding (frontend-only — used when the API returns no guardians) ──
const DUMMY_FATHER_NAMES = [
  'عبدالله الزهراني',
  'محمد العتيبي',
  'خالد الحربي',
  'سعد القحطاني',
  'فهد الشمري',
  'أحمد الغامدي'
]
const DUMMY_MOTHER_NAMES = [
  'نورة الشهري',
  'فاطمة الغامدي',
  'منى الدوسري',
  'ريم العنزي',
  'سارة المالكي',
  'هدى البقمي'
]
const DUMMY_GRANDPARENT_NAMES = [
  'صالح آل سعد',
  'إبراهيم الجهني',
  'حمد الرشيد'
]

function dummyPhone(idHash: number, salt: number): string {
  const tail = String(10000000 + Math.abs((idHash * salt + 7919) % 90000000)).slice(-8)
  return `05${tail}`
}

function generateDummyGuardians(studentId: string): ApiGuardian[] {
  const idHash = Number.parseInt(studentId, 10) || 0
  const guardianCount = (idHash % 3) + 1
  const motherIsPrimary = (idHash % 4) === 0
  const includeMother = guardianCount >= 2
  const includeGrandparent = guardianCount === 3

  const father: ApiGuardian = {
    user: {
      id: idHash * 100 + 1,
      name: DUMMY_FATHER_NAMES[idHash % DUMMY_FATHER_NAMES.length]!,
      email: `father.${studentId}@halaqa.example`,
      phone: dummyPhone(idHash, 7)
    },
    relation: 'الأب',
    is_primary: !includeMother || !motherIsPrimary,
    can_pickup: true
  }

  const guardians: ApiGuardian[] = [father]

  if (includeMother) {
    guardians.push({
      user: {
        id: idHash * 100 + 2,
        name: DUMMY_MOTHER_NAMES[idHash % DUMMY_MOTHER_NAMES.length]!,
        email: `mother.${studentId}@halaqa.example`,
        phone: dummyPhone(idHash, 11)
      },
      relation: 'الأم',
      is_primary: motherIsPrimary,
      can_pickup: true
    })
  }

  if (includeGrandparent) {
    guardians.push({
      user: {
        id: idHash * 100 + 3,
        name: DUMMY_GRANDPARENT_NAMES[idHash % DUMMY_GRANDPARENT_NAMES.length]!,
        email: `family.${studentId}@halaqa.example`,
        phone: dummyPhone(idHash, 13)
      },
      relation: 'الجد',
      is_primary: false,
      can_pickup: false
    })
  }

  return guardians
}

function apiToStudent(s: ApiStudent): Student {
  const hifz = Number(s.daily_hifz_pages_capacity) || 0
  const near = Number(s.daily_near_pages_capacity) || 0
  const far = Number(s.daily_far_pages_capacity) || 0
  const id = String(s.id)
  const guardians = (s.guardians && s.guardians.length > 0)
    ? s.guardians
    : generateDummyGuardians(id)

  return {
    id,
    name: s.name,
    gender: s.gender ?? 'male',
    status: s.status,
    dob: s.dob,
    joinDate: s.join_date,
    notes: s.notes,
    currentSurah: s.current_surah ?? '—',
    progress: s.progress_percent ?? 0,
    halaqa: s.halaqa_name ?? '—',
    attendance: s.attendance_rate ?? 0,
    dailyHifzPagesCapacity: hifz,
    dailyNearPagesCapacity: near,
    dailyFarPagesCapacity: far,
    guardians,
    avatar: s.photo_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(s.name)}`
  }
}

export function useStudents() {
  const api = useApi()

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
    viewingStudent.value = student
    isViewModalOpen.value = true
    try {
      const fresh = await fetchStudent(student.id)
      viewingStudent.value = fresh
    } catch {
      // Keep the already available list payload if detail fetch fails.
    }
  }

  function closeView() {
    isViewModalOpen.value = false
    viewingStudent.value = null
  }

  function openAdd() {
    isAddModalOpen.value = true
  }

  function closeAdd() {
    isAddModalOpen.value = false
  }

  async function openEdit(student: Student) {
    const toast = useToast()
    isEditLoading.value = true
    isEditModalOpen.value = true
    try {
      const data = await api<ApiStudent>(`/students/${student.id}`)
      editingApiStudent.value = data
    } catch {
      isEditModalOpen.value = false
      toast.add({ title: 'فشل تحميل بيانات الطالب', color: 'error' })
    } finally {
      isEditLoading.value = false
    }
  }

  function closeEdit() {
    isEditModalOpen.value = false
    editingApiStudent.value = null
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
    notifyingStudent.value = student
    isNotifyParentOpen.value = true
  }

  function closeNotifyParent() {
    isNotifyParentOpen.value = false
    notifyingStudent.value = null
  }

  async function submitParentNote(message: string): Promise<StudentNote | null> {
    const student = notifyingStudent.value
    const trimmed = message.trim()
    if (!student || !trimmed) return null
    isNotifySubmitting.value = true
    try {
      // Frontend-only dummy: persist in module state. Replace with real API call later.
      const { user } = useAuth()
      const author = user.value
      const note: StudentNote = {
        id: `${student.id}-${Date.now()}`,
        studentId: student.id,
        authorId: author?.id ?? 0,
        authorName: author?.name ?? 'أنا',
        message: trimmed,
        createdAt: new Date().toISOString()
      }
      const existing = studentNotes.value[student.id] ?? []
      studentNotes.value[student.id] = [note, ...existing]
      return note
    } finally {
      isNotifySubmitting.value = false
    }
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
    isAddModalOpen,
    isViewModalOpen,
    isEditModalOpen,
    isNotifyParentOpen,
    isEditLoading,
    isNotifySubmitting,
    viewingStudent,
    editingApiStudent,
    notifyingStudent,
    studentNotes,
    studentAchievements,
    studentAttendance,
    studentWeeklyPlan,
    searchQuery,
    fetchStudents,
    fetchStudent,
    createStudent,
    updateStudent,
    deleteStudent,
    restoreStudent,
    graduateStudent,
    fetchGuardians,
    linkGuardian,
    updateGuardian,
    unlinkGuardian,
    openView,
    closeView,
    openAdd,
    closeAdd,
    openEdit,
    closeEdit,
    openNotifyParent,
    closeNotifyParent,
    submitParentNote,
    getStudentNotes
  }
}
