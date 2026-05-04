import type { ApiHalaqa, ApiTeacher, ApiTeacherOption } from '~/types'

const halaqat = ref<ApiHalaqa[]>([])
const isLoading = ref(false)

export interface SaveHalaqaPayload {
  name: string
  type: ApiHalaqa['type']
  teacher_id: number
  days: number[]
}

export function useHalaqat() {
  const api = useApi()
  const { user } = useAuth()

  async function fetchHalaqat() {
    isLoading.value = true
    try {
      const params = new URLSearchParams()
      // Only send teacherId if user is a teacher
      if (user.value?.roles?.includes('teacher')) {
        params.set('teacherId', String(user.value.id))
      }
      // Backend gets school_id from authenticated user automatically
      const queryString = params.toString()
      halaqat.value = await api<ApiHalaqa[]>(`/halaqat${queryString ? `?${queryString}` : ''}`)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchTeachers(): Promise<ApiTeacherOption[]> {
    const list = await api<ApiTeacher[]>('/teachers')
    return list.map(({ id, name, email }) => ({ id, name, email }))
  }

  async function createHalaqa(payload: SaveHalaqaPayload) {
    return api<ApiHalaqa>('/halaqat', {
      method: 'POST',
      body: {
        name: payload.name,
        type: payload.type,
        teacher_id: payload.teacher_id,
        days: payload.days
      }
    })
  }

  async function updateHalaqa(id: number, payload: SaveHalaqaPayload) {
    return api<ApiHalaqa>(`/halaqat/${id}`, {
      method: 'PATCH',
      body: {
        name: payload.name,
        type: payload.type,
        teacher_id: payload.teacher_id,
        days: payload.days
      }
    })
  }

  async function deleteHalaqa(id: number) {
    await api(`/halaqat/${id}`, { method: 'DELETE' })
  }

  return {
    halaqat,
    isLoading,
    fetchHalaqat,
    fetchTeachers,
    createHalaqa,
    updateHalaqa,
    deleteHalaqa
  }
}
