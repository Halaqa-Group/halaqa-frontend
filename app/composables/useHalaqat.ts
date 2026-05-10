import type {
  ApiHalaqaCreated,
  ApiHalaqaDetail,
  ApiHalaqaListItem,
  ApiHalaqaListResult,
  ApiTeacherOption,
  ApiTeacher,
  HalaqaStatus,
  HalaqaType,
  PrayerSlot
} from '~/types'

export interface ListHalaqatQuery {
  page?: number
  limit?: number
  type?: HalaqaType
  status?: HalaqaStatus
  supervisor_user_id?: number
  teacher_user_id?: number
  search?: string
}

export interface ScheduleEntryPayload {
  day_of_week: number
  prayer_slot?: PrayerSlot | null
  start_time?: string | null
  end_time?: string | null
}

export interface CreateHalaqaPayload {
  name: string
  type: HalaqaType
  evaluation_settings?: Record<string, unknown> | null
  primary_teacher_user_id?: number
  schedule?: ScheduleEntryPayload[]
}

export interface UpdateHalaqaPayload {
  name?: string
  type?: HalaqaType
  evaluation_settings?: Record<string, unknown> | null
}

const halaqat = ref<ApiHalaqaListItem[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const isLoading = ref(false)

export function useHalaqat() {
  const api = useApi()

  interface UsersListResponse<T> {
    items: T[]
  }

  function buildQuery(query: ListHalaqatQuery) {
    const params = new URLSearchParams()
    if (query.page) params.set('page', String(query.page))
    if (query.limit) params.set('limit', String(query.limit))
    if (query.type) params.set('type', query.type)
    if (query.status) params.set('status', query.status)
    if (query.supervisor_user_id) params.set('supervisor_user_id', String(query.supervisor_user_id))
    if (query.teacher_user_id) params.set('teacher_user_id', String(query.teacher_user_id))
    if (query.search) params.set('search', query.search)
    const qs = params.toString()
    return qs ? `?${qs}` : ''
  }

  async function fetchHalaqat(query: ListHalaqatQuery = {}) {
    isLoading.value = true
    try {
      const result = await api<ApiHalaqaListResult>(`/halaqat${buildQuery(query)}`)
      halaqat.value = result.items
      total.value = result.total
      page.value = result.page
      limit.value = result.limit
      return result
    } finally {
      isLoading.value = false
    }
  }

  async function getHalaqa(id: number) {
    return api<ApiHalaqaDetail>(`/halaqat/${id}`)
  }

  async function createHalaqa(payload: CreateHalaqaPayload) {
    return api<ApiHalaqaCreated>('/halaqat', { method: 'POST', body: payload })
  }

  async function updateHalaqa(id: number, payload: UpdateHalaqaPayload) {
    return api<ApiHalaqaDetail>(`/halaqat/${id}`, { method: 'PATCH', body: payload })
  }

  async function archiveHalaqa(id: number) {
    return api<{ message: string }>(`/halaqat/${id}/archive`, { method: 'POST' })
  }

  async function completeHalaqa(id: number) {
    return api<{ message: string }>(`/halaqat/${id}/complete`, { method: 'POST' })
  }

  async function restoreHalaqa(id: number) {
    return api<{ message: string }>(`/halaqat/${id}/restore`, { method: 'POST' })
  }

  async function fetchTeachers(): Promise<ApiTeacherOption[]> {
    // Only active users with the `teacher` role slug — same school is implicit
    // from the bearer token. Backend caps page size at 100; pull in batches if
    // a school ever exceeds that.
    const response = await api<UsersListResponse<ApiTeacher>>(
      '/users?role=teacher&status=active&limit=100'
    )
    return response.items.map(({ id, name, email }) => ({ id, name, email }))
  }

  return {
    halaqat,
    total,
    page,
    limit,
    isLoading,
    fetchHalaqat,
    getHalaqa,
    createHalaqa,
    updateHalaqa,
    archiveHalaqa,
    completeHalaqa,
    restoreHalaqa,
    fetchTeachers
  }
}
