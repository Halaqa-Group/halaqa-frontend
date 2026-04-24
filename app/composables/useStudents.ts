import { ref } from 'vue'
import type { Student } from '~/types'

const students = ref<Student[]>([])
const isAddModalOpen = ref(false)
const isViewModalOpen = ref(false)
const viewingStudent = ref<Student | null>(null)
const searchQuery = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)

function apiToStudent(s: any): Student {
  return {
    id: String(s.id),
    name: s.name,
    status: s.status as 'active' | 'inactive',
    currentSurah: '—',
    progress: 0,
    halaqa: '—',
    attendance: 0,
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
      const data = await api<any[]>(`/students${params.toString() ? `?${params}` : ''}`)
      students.value = data.map(apiToStudent)
    }
    catch (e: any) {
      error.value = e?.data?.message || 'حدث خطأ أثناء تحميل الطلاب'
    }
    finally {
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

    const data = await api<any>('/students', {
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

  return {
    students,
    isLoading,
    error,
    isAddModalOpen,
    isViewModalOpen,
    viewingStudent,
    searchQuery,
    fetchStudents,
    createStudent,
    openView,
    closeView,
    openAdd,
    closeAdd
  }
}
