import type { ApiHalaqa } from '~/types'

const halaqat = ref<ApiHalaqa[]>([])
const isLoading = ref(false)

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

  return { halaqat, isLoading, fetchHalaqat }
}
