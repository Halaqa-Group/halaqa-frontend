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
      if (user.value?.role === 'teacher') {
        params.set('teacherId', String(user.value.id))
      }
      else if (user.value?.school_id) {
        params.set('schoolId', String(user.value.school_id))
      }
      halaqat.value = await api<ApiHalaqa[]>(`/halaqat?${params}`)
    }
    finally {
      isLoading.value = false
    }
  }

  return { halaqat, isLoading, fetchHalaqat }
}
