import { ref } from 'vue'
import type {
  ApiHoliday,
  ApiSchoolSchedule,
  CreateHolidayPayload,
  CreateSchoolSchedulePayload
} from '~/types'
import { unwrapList } from '~/utils/api/list'

const schedules = ref<ApiSchoolSchedule[]>([])
const holidays = ref<ApiHoliday[]>([])
const isLoadingSchedules = ref(false)
const isLoadingHolidays = ref(false)

export function useSchoolCalendar() {
  const api = useApi()

  // ─── Schedules (operating days) ─────────────────────────────────────────────

  async function fetchSchedules(on?: string) {
    isLoadingSchedules.value = true
    try {
      const raw = await api<{ items: ApiSchoolSchedule[] } | ApiSchoolSchedule[]>(
        `/attendance/schedules${on ? `?on=${on}` : ''}`
      )
      schedules.value = unwrapList<ApiSchoolSchedule>(raw)
    } finally {
      isLoadingSchedules.value = false
    }
  }

  async function createSchedule(payload: CreateSchoolSchedulePayload): Promise<ApiSchoolSchedule> {
    const created = await api<ApiSchoolSchedule>('/attendance/schedules', {
      method: 'POST',
      body: payload
    })
    await fetchSchedules()
    return created
  }

  async function deleteSchedule(id: number) {
    await api(`/attendance/schedules/${id}`, { method: 'DELETE' })
    schedules.value = schedules.value.filter(s => s.id !== id)
  }

  // ─── Holidays ───────────────────────────────────────────────────────────────

  async function fetchHolidays(from?: string, to?: string) {
    isLoadingHolidays.value = true
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const qs = params.toString()
      const raw = await api<{ items: ApiHoliday[] } | ApiHoliday[]>(
        `/attendance/holidays${qs ? `?${qs}` : ''}`
      )
      holidays.value = unwrapList<ApiHoliday>(raw)
    } finally {
      isLoadingHolidays.value = false
    }
  }

  async function createHoliday(payload: CreateHolidayPayload): Promise<ApiHoliday> {
    const created = await api<ApiHoliday>('/attendance/holidays', {
      method: 'POST',
      body: payload
    })
    await fetchHolidays()
    return created
  }

  async function deleteHoliday(id: number) {
    await api(`/attendance/holidays/${id}`, { method: 'DELETE' })
    holidays.value = holidays.value.filter(h => h.id !== id)
  }

  return {
    schedules,
    holidays,
    isLoadingSchedules,
    isLoadingHolidays,
    fetchSchedules,
    createSchedule,
    deleteSchedule,
    fetchHolidays,
    createHoliday,
    deleteHoliday
  }
}
