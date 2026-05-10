import type { ApiActivityLogResult, HalaqaActivityAction } from '~/types'

export interface ListActivityQuery {
  page?: number
  limit?: number
  action?: HalaqaActivityAction
  from_date?: string
  to_date?: string
}

export function useHalaqaActivity() {
  const api = useApi()

  async function listActivity(halaqaId: number, query: ListActivityQuery = {}) {
    const params = new URLSearchParams()
    if (query.page) params.set('page', String(query.page))
    if (query.limit) params.set('limit', String(query.limit))
    if (query.action) params.set('action', query.action)
    if (query.from_date) params.set('from_date', query.from_date)
    if (query.to_date) params.set('to_date', query.to_date)
    const qs = params.toString()
    return api<ApiActivityLogResult>(`/halaqat/${halaqaId}/activity${qs ? `?${qs}` : ''}`)
  }

  return { listActivity }
}
