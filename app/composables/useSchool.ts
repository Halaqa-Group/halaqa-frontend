import type { ApiSchool } from '~/types'

export function useSchool() {
  const api = useApi()
  const school = useState<ApiSchool | null>('school_profile', () => null)
  const isLoading = ref(false)

  async function fetchSchool() {
    isLoading.value = true
    try {
      school.value = await api<ApiSchool>('/school')
    } catch {
      school.value = null
    } finally {
      isLoading.value = false
    }
  }

  async function updateSchool(payload: Partial<Pick<ApiSchool, 'name' | 'address' | 'phone' | 'status'>>) {
    const updated = await api<ApiSchool>('/school', { method: 'PATCH', body: payload })
    school.value = updated
    return updated
  }

  return { school, isLoading, fetchSchool, updateSchool }
}
