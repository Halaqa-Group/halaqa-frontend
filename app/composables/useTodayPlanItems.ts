import type { ApiWeeklyPlan, ApiWeeklyPlanItem } from '~/types'
import { unwrapList } from '~/utils/api/list'

function todayYmd(): string {
  const d = new Date()
  return ymd(d)
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1)
}

export function backendDayOfWeek(d: Date): number {
  return (d.getDay() + 1) % 7
}

export function startOfWeekSat(d: Date): Date {
  const offset = backendDayOfWeek(d)
  const sat = new Date(d)
  sat.setDate(d.getDate() - offset)
  return sat
}

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
      const weekStart = ymd(startOfWeekSat(target))
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
