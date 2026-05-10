import type { ApiScheduleEntry, ApiSetScheduleResult } from '~/types'
import type { ScheduleEntryPayload } from '~/composables/useHalaqat'

export function useHalaqaSchedule() {
  const api = useApi()

  async function getSchedule(halaqaId: number) {
    return api<ApiScheduleEntry[]>(`/halaqat/${halaqaId}/schedule`)
  }

  async function setSchedule(halaqaId: number, schedule: ScheduleEntryPayload[]) {
    return api<ApiSetScheduleResult>(`/halaqat/${halaqaId}/schedule`, {
      method: 'PUT',
      body: { schedule }
    })
  }

  return { getSchedule, setSchedule }
}
