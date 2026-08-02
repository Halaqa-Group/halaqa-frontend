import type { ApiStudent, Student } from '~/types'

const children = ref<Student[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

function apiToStudent(s: ApiStudent): Student {
  const hifz = Number(s.daily_hifz_pages_capacity) || 0
  const near = Number(s.daily_near_pages_capacity) || 0
  const far = Number(s.daily_far_pages_capacity) || 0

  return {
    id: String(s.id),
    name: s.name,
    firstName: s.first_name ?? '',
    secondName: s.second_name ?? '',
    thirdName: s.third_name ?? '',
    familyName: s.family_name ?? '',
    gender: s.gender ?? 'male',
    status: s.status,
    idNumber: s.id_number ?? null,
    phoneCountryCode: s.phone_country_code ?? null,
    phone: s.phone ?? null,
    phoneE164: s.phone_e164 ?? null,
    dob: s.dob,
    joinDate: s.join_date,
    deletedAt: s.deleted_at ?? null,
    notes: s.notes,
    dailyHifzPagesCapacity: hifz,
    dailyNearPagesCapacity: near,
    dailyFarPagesCapacity: far,
    photoUrl: s.photo_url,
    guardians: s.guardians ?? [],
    avatar: s.photo_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(s.name)}`
  }
}

export function useMyChildren() {
  const api = useApi()
  const apiError = useApiError()
  const requests = useAbortController()

  async function fetchChildren() {
    const signal = requests.begin('fetchChildren')
    isLoading.value = true
    error.value = null
    try {
      const data = await api<{ items: ApiStudent[] } | ApiStudent[]>('/me/children', { signal })
      const items = Array.isArray(data) ? data : data.items
      children.value = items.map(apiToStudent)
    } catch (e: any) {
      if (signal.aborted || isAbortError(e)) return // superseded — newer load owns state
      error.value = apiError.format(e, 'حدث خطأ أثناء تحميل الأبناء')
    } finally {
      if (!signal.aborted) isLoading.value = false
      requests.end('fetchChildren', signal)
    }
  }

  async function fetchChild(id: number | string): Promise<Student> {
    const data = await api<ApiStudent>(`/me/children/${id}`)
    return apiToStudent(data)
  }

  return {
    children,
    isLoading,
    error,
    fetchChildren,
    fetchChild
  }
}
