import type { ApiParent } from '~/types'

export interface SaveParentPayload {
  name: string
  email: string
  identity_number: string
  phone: string | null
  children_count: number
  children_names: string
  status: 'active' | 'inactive'
}

const parents = ref<ApiParent[]>([])
const isLoading = ref(false)

export function useSchoolParents() {
  const api = useApi()

  async function fetchParents() {
    isLoading.value = true
    try {
      parents.value = await api<ApiParent[]>('/parents')
    } finally {
      isLoading.value = false
    }
  }

  async function createParent(payload: SaveParentPayload) {
    return api<ApiParent>('/parents', { method: 'POST', body: payload })
  }

  async function updateParent(id: number, payload: SaveParentPayload) {
    return api<ApiParent>(`/parents/${id}`, { method: 'PATCH', body: payload })
  }

  async function deleteParent(id: number) {
    await api(`/parents/${id}`, { method: 'DELETE' })
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
