import { ref } from 'vue'
import type { Student, ApiGuardian, ApiStudent, ApiStudentListResult } from '~/types'

const students = ref<Student[]>([])
const isAddModalOpen = ref(false)
const isViewModalOpen = ref(false)
const isEditModalOpen = ref(false)
const viewingStudent = ref<Student | null>(null)
const editingApiStudent = ref<ApiStudent | null>(null)
const isEditLoading = ref(false)
const searchQuery = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)
const totalStudents = ref(0)

function apiToStudent(s: ApiStudent): Student {
  const hifz = Number(s.daily_hifz_pages_capacity) || 0
  const near = Number(s.daily_near_pages_capacity) || 0
  const far = Number(s.daily_far_pages_capacity) || 0

  return {
    id: String(s.id),
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
    guardians: s.guardians ?? [],
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
    return apiToStudent(data)
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
    isEditLoading,
    viewingStudent,
    editingApiStudent,
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
    closeEdit
  }
}
