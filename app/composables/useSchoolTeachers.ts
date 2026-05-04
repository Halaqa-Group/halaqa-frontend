import type { ApiTeacher } from '~/types'

export interface SaveTeacherPayload {
  name: string
  email: string
  identity_number: string
  phone: string | null
  status: 'active' | 'inactive'
}

const teachers = ref<ApiTeacher[]>([])
const isLoading = ref(false)

export function useSchoolTeachers() {
  const api = useApi()

  async function fetchTeachers() {
    isLoading.value = true
    try {
      teachers.value = await api<ApiTeacher[]>('/teachers')
    } finally {
      isLoading.value = false
    }
  }

  async function createTeacher(payload: SaveTeacherPayload) {
    return api<ApiTeacher>('/teachers', { method: 'POST', body: payload })
  }

  async function updateTeacher(id: number, payload: SaveTeacherPayload) {
    return api<ApiTeacher>(`/teachers/${id}`, { method: 'PATCH', body: payload })
  }

  async function deleteTeacher(id: number) {
    await api(`/teachers/${id}`, { method: 'DELETE' })
  }

  return {
    teachers,
    isLoading,
    fetchTeachers,
    createTeacher,
    updateTeacher,
    deleteTeacher
  }
}
