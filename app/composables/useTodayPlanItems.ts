import type { ApiWeeklyPlan, ApiWeeklyPlanItem } from '~/types'
import { unwrapList } from '~/utils/api/list'
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

  async function load() {
    const sid = toValue(studentId)
    const hid = toValue(halaqaId)
    const d = toValue(date) ?? todayYmd()

    if (!sid || !hid) {
      items.value = []
      plan.value = null
      return
    }

    loading.value = true
    error.value = null

    try {
      const target = parseYmd(d)
      const weekStart = toYmd(startOfWeekSat(target))
      const dow = backendDayOfWeek(target)

      const raw = await api<unknown>(
        `/weekly-plans?student_id=${sid}&halaqa_id=${hid}&week_start_date=${weekStart}`
      )
      const plans = unwrapList<ApiWeeklyPlan>(raw)
      const wp = plans[0] ?? null
      plan.value = wp
      items.value = wp ? wp.items.filter(i => i.day_of_week === dow) : []
    } catch (e) {
      error.value = e as Error
      items.value = []
      plan.value = null
    } finally {
      loading.value = false
    }
  }

  watch(
    [() => toValue(studentId), () => toValue(halaqaId), () => toValue(date)],
    () => { void load() },
    { immediate: true }
  )

  return { items, plan, loading, error, reload: load }
}
