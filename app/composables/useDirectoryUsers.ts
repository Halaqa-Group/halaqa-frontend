import type { ApiUserDirectoryRow, UserDirectoryRole } from '~/types'

export interface CreateDirectoryUserPayload {
  name: string
  email: string
  identity_number: string
  phone: string | null
  role: UserDirectoryRole
}

const users = ref<ApiUserDirectoryRow[]>([])
const isLoading = ref(false)

export function useDirectoryUsers() {
  const api = useApi()

  async function fetchUsers(search?: string, role?: string) {
    isLoading.value = true
    try {
      const q = new URLSearchParams()
      const s = (search ?? '').trim()
      if (s) q.set('search', s)
      if (role && role !== 'all') q.set('role', role)
      const qs = q.toString()
      users.value = await api<ApiUserDirectoryRow[]>(`/users${qs ? `?${qs}` : ''}`)
    } finally {
      isLoading.value = false
    }
  }

  async function createUser(payload: CreateDirectoryUserPayload) {
    return api<ApiUserDirectoryRow>('/users', { method: 'POST', body: payload })
  }

  return { users, isLoading, fetchUsers, createUser }
}
