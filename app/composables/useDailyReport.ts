import type { ApiDailyReport, ApiStudentReportDetail } from '~/types'

/**
 * Daily evaluation report reads + the manual recalculate action.
 *
 * The report is computed live for the current week and served from a saved
 * snapshot for older dates (`source` tells you which). All rates/scores arrive
 * rounded to 2 decimals from the backend — see `formatScore` for display.
 *
 * Route param is the halaqa id as `:id` (the shared HalaqaAccessGuard scopes on
 * it); a cross-scope request answers 404, surfaced here as a normal fetch error.
 */
export function useDailyReport() {
  const api = useApi()

  const report = ref<ApiDailyReport | null>(null)
  const isLoading = ref(false)
  const isRecalculating = ref(false)
  const error = ref<string | null>(null)

  const apiError = useApiError()

  async function fetchReport(halaqaId: number, date: string): Promise<ApiDailyReport> {
    isLoading.value = true
    error.value = null
    try {
      const data = await api<ApiDailyReport>(
        `/halaqat/${halaqaId}/daily-report?date=${date}`
      )
      report.value = data
      return data
    } catch (e: unknown) {
      error.value = apiError.format(e, 'تعذّر تحميل تقرير اليوم')
      report.value = null
      throw e
    } finally {
      isLoading.value = false
    }
  }

  function fetchStudentDetail(
    halaqaId: number,
    date: string,
    studentId: number
  ): Promise<ApiStudentReportDetail> {
    return api<ApiStudentReportDetail>(
      `/halaqat/${halaqaId}/daily-report/${date}/students/${studentId}`
    )
  }

  // Supervisor/principal action: recompute and replace the saved report for a
  // day (never creates a second copy). Returns the API's ack message.
  async function recalculate(
    halaqaId: number,
    date: string,
    reason: string
  ): Promise<{ message: string }> {
    isRecalculating.value = true
    try {
      // Recomputing a whole halaqa's day is real server work, so it gets a much
      // longer deadline than the client-wide default — this one is legitimately
      // slow rather than stalled.
      return await api<{ message: string }>(
        `/halaqat/${halaqaId}/daily-reports/${date}/recalculate`,
        { method: 'POST', body: { reason }, timeout: 90_000 } as Parameters<typeof api>[1]
      )
    } finally {
      isRecalculating.value = false
    }
  }

  return {
    report,
    isLoading,
    isRecalculating,
    error,
    fetchReport,
    fetchStudentDetail,
    recalculate
  }
}
