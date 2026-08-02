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
  const requests = useAbortController()

  async function listActivity(halaqaId: number, query: ListActivityQuery = {}) {
    const params = new URLSearchParams()
    if (query.page) params.set('page', String(query.page))
    if (query.limit) params.set('limit', String(query.limit))
    if (query.action) params.set('action', query.action)
    if (query.from_date) params.set('from_date', query.from_date)
    if (query.to_date) params.set('to_date', query.to_date)
    const qs = params.toString()
    // A page/filter/date change re-triggers this read; abort the previous one so a
    // slow earlier response can't resolve after (and overwrite) the newer one. A
    // superseded call resolves to `undefined` — the caller treats that as "ignore".
    return requests.run('listActivity', signal =>
      api<ApiActivityLogResult>(`/halaqat/${halaqaId}/activity${qs ? `?${qs}` : ''}`, { signal }))
  }

  return { listActivity }
}
