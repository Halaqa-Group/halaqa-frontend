import { ref } from 'vue'
import type { Student, ApiStudent } from '~/types'

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

function apiToStudent(s: ApiStudent): Student {
  return {
    id: String(s.id),
    name: s.name,
    status: s.status,
    currentSurah: s.current_surah ?? '—',
    progress: s.progress_percent ?? 0,
    halaqa: s.halaqa_name ?? '—',
    attendance: s.attendance_rate ?? 0,
    avatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(s.name)}`
  }
}

export function useStudents() {
  const api = useApi()
  const { user } = useAuth()

  async function fetchStudents(halaqaId?: number) {
    isLoading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      if (halaqaId) params.set('halaqaId', String(halaqaId))
      const data = await api<ApiStudent[]>(`/students${params.toString() ? `?${params}` : ''}`)
      students.value = data.map(apiToStudent)
    } catch (e: any) {
      error.value = e?.data?.message || 'حدث خطأ أثناء تحميل الطلاب'
    } finally {
      isLoading.value = false
    }
  }

  async function createStudent(dto: Record<string, any>) {
    if (!user.value?.school_id) {
      throw new Error('User school_id is required to create a student')
    }

    const requestBody = {
      ...dto,
      school_id: Number(user.value.school_id)
    }

    const data = await api<ApiStudent>('/students', {
      method: 'POST',
      body: requestBody
    })

    students.value.unshift(apiToStudent(data))
    return data
  }

  function openView(student: Student) {
    viewingStudent.value = student
    isViewModalOpen.value = true
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

  return {
    students,
    isLoading,
    error,
    isAddModalOpen,
    isViewModalOpen,
    isEditModalOpen,
    isEditLoading,
    viewingStudent,
    editingApiStudent,
    searchQuery,
    fetchStudents,
    createStudent,
    updateStudent,
    openView,
    closeView,
    openAdd,
    closeAdd,
    openEdit,
    closeEdit
  }
}
