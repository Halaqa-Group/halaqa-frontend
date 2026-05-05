import type { ApiParent } from '~/types'

export interface SaveParentPayload {
  name: string
  email: string
  password?: string
  phone: string | null
  status: 'active' | 'inactive'
}

const parents = ref<ApiParent[]>([])
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

function toParentRow(user: ApiUser): ApiParent {
  return {
    id: user.id,
    school_id: 0,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status === 'active' ? 'active' : 'inactive',
    identity_number: '—',
    children_count: 0,
    children_names: '—'
  }
}

export function useSchoolParents() {
  const api = useApi()

  async function fetchParents() {
    isLoading.value = true
    try {
      const response = await api<UsersListResponse<ApiUser>>('/users?role=parent&limit=100')
      parents.value = response.items.map(toParentRow)
    } finally {
      isLoading.value = false
    }
  }

  async function createParent(payload: SaveParentPayload) {
    const created = await api<ApiUser>('/users', {
      method: 'POST',
      body: {
        name: payload.name,
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
        status: payload.status,
        roles: ['parent']
      }
    })
    return toParentRow(created)
  }

  async function updateParent(id: number, payload: SaveParentPayload) {
    const updated = await api<ApiUser>(`/users/${id}`, {
      method: 'PATCH',
      body: {
        name: payload.name,
        phone: payload.phone,
        status: payload.status
      }
    })
    return toParentRow(updated)
  }

  async function deleteParent(id: number) {
    await api(`/users/${id}`, { method: 'DELETE' })
  }

  return {
    parents,
    isLoading,
    fetchParents,
    createParent,
    updateParent,
    deleteParent
  }
}
