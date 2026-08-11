import { rememberHalaqaAccess, rememberHalaqaDetailAccess } from '~/composables/usePermissions'
import type {
  ApiHalaqaCreated,
  ApiHalaqaDetail,
  ApiHalaqaListItem,
  ApiHalaqaListResult,
  ApiTeacherOption,
  ApiTeacher,
  HalaqaStatus,
  HalaqaType,
  ReportWeights
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

export interface CreateHalaqaPayload {
  name: string
  type: HalaqaType
  evaluation_settings?: Record<string, unknown> | null
  /** Daily-report track weights; all four required together, sum = 100. */
  report_weights?: ReportWeights
  primary_teacher_user_id?: number
}

export interface UpdateHalaqaPayload {
  name?: string
  type?: HalaqaType
  evaluation_settings?: Record<string, unknown> | null
  /** Daily-report track weights; all four required together, sum = 100. */
  report_weights?: ReportWeights
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
      // Feeds the permission cache: which halaqat are mine, and which of them
      // I am the primary/acting teacher of. Filtered fetches only ever add.
      rememberHalaqaAccess(result.items)
      halaqat.value = result.items
      total.value = result.total
      page.value = result.page
      limit.value = result.limit
      return result
    } catch (e) {
      // The list belongs to the query that just failed — leaving the previous
      // one on screen would show halaqat that don't match the active filters
      // (offline, any filter combination that was never cached lands here).
      halaqat.value = []
      total.value = 0
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function getHalaqa(id: number) {
    const halaqa = await api<ApiHalaqaDetail>(`/halaqat/${id}`)
    rememberHalaqaDetailAccess(halaqa)
    return halaqa
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
