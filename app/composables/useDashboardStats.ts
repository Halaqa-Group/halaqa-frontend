import type { Ref } from 'vue'
import type {
  ApiDashboardAlerts,
  ApiDashboardOverview,
  ApiHalaqatPerformance,
  ApiTeachersCommitment,
  ApiTopStudents,
  DashboardAlertsQuery,
  DashboardTopStudentsQuery,
  DashboardWindowQuery
} from '~/types'

/**
 * Reads for the role-scoped KPI dashboard (`GET /dashboard/*`).
 *
 * Named `useDashboardStats` because `useDashboard` is already taken by the
 * shell composable that owns the keyboard shortcuts — this one owns the data.
 *
 * Three things shape the design:
 *
 * 1. **Scope is the server's job.** Every endpoint resolves the caller's halaqat
 *    itself and answers with zeros/empty arrays when nothing is in scope, so
 *    there is no halaqa filter to pass and no 403 to handle. The one exception
 *    is `/dashboard/teachers`, which is genuinely role-gated — `fetchTeachers`
 *    refuses to call it rather than provoking a 403 (see `canViewTeacherCommitment`).
 * 2. **Sections fail independently.** Each endpoint gets its own `error` ref and
 *    `loadAll` uses `allSettled`, so a failing leaderboard cannot blank the KPI
 *    cards. A section that errored keeps its previous data rather than flashing
 *    empty.
 * 3. **The window is echoed back.** Every response carries the `range` the
 *    server resolved, which is what the UI labels itself with — we never
 *    recompute "which Saturday did the week start on" on the client.
 */
export function useDashboardStats() {
  const api = useApi()
  const apiError = useApiError()
  const { t } = useI18n()
  const { canViewTeacherCommitment } = usePermissions()
  // Each section (and loadAll itself) gets its own abort key, so re-running the
  // dashboard on a window change cancels the superseded section fetches instead of
  // letting a slow earlier response resolve on top of the newer one.
  const requests = useAbortController()

  const overview = ref<ApiDashboardOverview | null>(null)
  const topStudents = ref<ApiTopStudents | null>(null)
  const halaqat = ref<ApiHalaqatPerformance | null>(null)
  const teachers = ref<ApiTeachersCommitment | null>(null)
  const alerts = ref<ApiDashboardAlerts | null>(null)

  const overviewError = ref<string | null>(null)
  const topStudentsError = ref<string | null>(null)
  const halaqatError = ref<string | null>(null)
  const teachersError = ref<string | null>(null)
  const alertsError = ref<string | null>(null)

  const isLoading = ref(false)

  /**
   * `from`+`to` only take effect as a PAIR — the backend ignores a lone `from`
   * and silently falls back to `period`, which would show a window the user did
   * not ask for. Normalising here means a half-filled custom range can never
   * reach the wire.
   */
  function buildQuery(query: Record<string, string | number | boolean | undefined>): string {
    const params = new URLSearchParams()
    const hasRange = !!query.from && !!query.to

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue
      if ((key === 'from' || key === 'to') && !hasRange) continue
      // An explicit range wins server-side anyway; dropping `period` keeps the
      // request honest about which branch it is taking.
      if (key === 'period' && hasRange) continue
      params.set(key, String(value))
    }

    const qs = params.toString()
    return qs ? `?${qs}` : ''
  }

  async function load<T>(
    url: string,
    target: Ref<T | null>,
    error: Ref<string | null>,
    fallbackKey: string
  ): Promise<T | null> {
    // `fallbackKey` is unique per section, so it doubles as the abort key.
    const signal = requests.begin(fallbackKey)
    error.value = null
    try {
      const data = await api<T>(url, { signal })
      target.value = data
      return data
    } catch (e: unknown) {
      // Superseded by a newer load of this section — keep the stale payload and
      // don't surface an error for a request we deliberately cancelled.
      if (signal.aborted || isAbortError(e)) return null
      // Keep the stale payload on screen — a transient failure should not wipe
      // the section the user was already reading.
      error.value = apiError.format(e, t(fallbackKey))
      return null
    } finally {
      requests.end(fallbackKey, signal)
    }
  }

  function fetchOverview(query: DashboardWindowQuery & { compare?: boolean } = {}) {
    return load<ApiDashboardOverview>(
      `/dashboard/overview${buildQuery({ ...query })}`,
      overview,
      overviewError,
      'pages.home.errors.overview'
    )
  }

  function fetchTopStudents(query: DashboardTopStudentsQuery = {}) {
    return load<ApiTopStudents>(
      `/dashboard/top-students${buildQuery({ ...query })}`,
      topStudents,
      topStudentsError,
      'pages.home.errors.topStudents'
    )
  }

  function fetchHalaqatPerformance(query: DashboardWindowQuery = {}) {
    return load<ApiHalaqatPerformance>(
      `/dashboard/halaqat${buildQuery({ ...query })}`,
      halaqat,
      halaqatError,
      'pages.home.errors.halaqat'
    )
  }

  /**
   * Teacher commitment is the one endpoint with a hard role gate (principal, VP
   * and supervisor only). Calling it as a teacher is a guaranteed 403, so we
   * clear the section instead of firing a request we know will fail.
   */
  async function fetchTeacherCommitment(query: DashboardWindowQuery = {}) {
    if (!canViewTeacherCommitment.value) {
      teachers.value = null
      teachersError.value = null
      return null
    }
    return load<ApiTeachersCommitment>(
      `/dashboard/teachers${buildQuery({ ...query })}`,
      teachers,
      teachersError,
      'pages.home.errors.teachers'
    )
  }

  function fetchAlerts(query: DashboardAlertsQuery = {}) {
    return load<ApiDashboardAlerts>(
      `/dashboard/alerts${buildQuery({ ...query })}`,
      alerts,
      alertsError,
      'pages.home.errors.alerts'
    )
  }

  /**
   * Loads every section the caller is allowed to see, in parallel. `allSettled`
   * is deliberate: the per-section error refs already carry the failures, and
   * one rejected request must not abort the others.
   */
  async function loadAll(
    query: DashboardWindowQuery & {
      track?: DashboardTopStudentsQuery['track']
      limit?: number
      stalledDays?: number
    } = {}
  ) {
    const range: DashboardWindowQuery = {
      period: query.period,
      from: query.from,
      to: query.to
    }

    // A re-run on a window change supersedes this one; only the latest owns isLoading.
    const signal = requests.begin('loadAll')
    isLoading.value = true
    try {
      await Promise.allSettled([
        // `compare: true` is what populates `overview.previous`, which the KPI
        // cards turn into trend deltas.
        fetchOverview({ ...range, compare: true }),
        fetchTopStudents({ ...range, track: query.track, limit: query.limit ?? 5 }),
        fetchHalaqatPerformance(range),
        fetchTeacherCommitment(range),
        fetchAlerts({ ...range, stalled_days: query.stalledDays })
      ])
    } finally {
      if (!signal.aborted) isLoading.value = false
      requests.end('loadAll', signal)
    }
  }

  return {
    overview,
    topStudents,
    halaqat,
    teachers,
    alerts,

    overviewError,
    topStudentsError,
    halaqatError,
    teachersError,
    alertsError,

    isLoading,

    fetchOverview,
    fetchTopStudents,
    fetchHalaqatPerformance,
    fetchTeacherCommitment,
    fetchAlerts,
    loadAll
  }
}
