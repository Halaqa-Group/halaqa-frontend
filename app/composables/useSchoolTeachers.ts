import type { ApiTeacher } from '~/types'

export interface SaveTeacherPayload {
  first_name: string
  second_name: string
  third_name: string
  family_name: string
  email: string
  password?: string
  phone: string | null
  status: 'active' | 'inactive'
}

const teachers = ref<ApiTeacher[]>([])
const isLoading = ref(false)

interface UsersListResponse<T> {
  items: T[]
}

interface ApiUser {
  id: number
  name: string
  email: string
  phone: string | null
  status: 'active' | 'inactive' | 'suspended'
}

function toTeacherRow(user: ApiUser): ApiTeacher {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status === 'active' ? 'active' : 'inactive',
    identity_number: '—',
    assigned_halaqat: '—'
  }
}

export function useSchoolTeachers() {
  const api = useApi()

  async function fetchTeachers() {
    isLoading.value = true
    try {
      const response = await api<UsersListResponse<ApiUser>>('/users?role=teacher&limit=100')
      teachers.value = response.items.map(toTeacherRow)
    } finally {
      isLoading.value = false
    }
  }

  async function createTeacher(payload: SaveTeacherPayload) {
    const created = await api<ApiUser>('/users', {
      method: 'POST',
      body: {
        first_name: payload.first_name,
        second_name: payload.second_name,
        third_name: payload.third_name,
        family_name: payload.family_name,
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
        status: payload.status,
        roles: ['teacher']
      }
    })
    return toTeacherRow(created)
  }

  async function updateTeacher(id: number, payload: SaveTeacherPayload) {
    const updated = await api<ApiUser>(`/users/${id}`, {
      method: 'PATCH',
      body: {
        first_name: payload.first_name,
        second_name: payload.second_name,
        third_name: payload.third_name,
        family_name: payload.family_name,
        phone: payload.phone,
        status: payload.status
      }
    })
    return toTeacherRow(updated)
  }

  async function deleteTeacher(id: number) {
    await api(`/users/${id}`, { method: 'DELETE' })
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
