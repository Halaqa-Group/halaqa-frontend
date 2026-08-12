import type { ApiWeeklyPlan, ApiWeeklyPlanItem } from '~/types'
import { unwrapList } from '~/utils/api/list'
import { byTrackOrder } from '~/utils/achievement'
import { parseYmd, todayYmd, toYmd } from '~/utils/date'

export function useTodayPlanItems(
  studentId: MaybeRefOrGetter<number | null>,
  halaqaId: MaybeRefOrGetter<number | null>,
  date?: MaybeRefOrGetter<string | null>
) {
  const items = ref<ApiWeeklyPlanItem[]>([])
  const plan = ref<ApiWeeklyPlan | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const api = useApi()
  const requests = useAbortController()

  async function load() {
    const sid = toValue(studentId)
    const hid = toValue(halaqaId)
    const d = toValue(date) ?? todayYmd()

    if (!sid || !hid) {
      items.value = []
      plan.value = null
      return
    }

    const signal = requests.begin('load')
    loading.value = true
    error.value = null

    try {
      const target = parseYmd(d)
      const weekStart = toYmd(startOfWeekSat(target))
      const dow = backendDayOfWeek(target)

      const raw = await api<unknown>(
        `/weekly-plans?student_id=${sid}&halaqa_id=${hid}&week_start_date=${weekStart}`,
        { signal }
      )
      const plans = unwrapList<ApiWeeklyPlan>(raw)
      const wp = plans[0] ?? null
      plan.value = wp
      // Always حفظ → مراجعة قريبة → مراجعة بعيدة, the order a session is worked
      // through — the API returns the day's items in storage order, which puts
      // whichever lesson was added first at the front. Within a track the plan's
      // own `order` decides, falling back to id so the sort stays stable.
      // `filter` already copied the array, so sorting in place is safe.
      items.value = wp
        ? wp.items
            .filter(i => i.day_of_week === dow)
            .sort((a, b) => byTrackOrder(a, b) || (a.order ?? 0) - (b.order ?? 0) || a.id - b.id)
        : []
    } catch (e) {
      if (signal.aborted || isAbortError(e)) return
      error.value = e as Error
      items.value = []
      plan.value = null
    } finally {
      if (!signal.aborted) loading.value = false
      requests.end('load', signal)
    }
  }

  watch(
    [() => toValue(studentId), () => toValue(halaqaId), () => toValue(date)],
    () => { void load() },
    { immediate: true }
  )

  return { items, plan, loading, error, reload: load }
}
