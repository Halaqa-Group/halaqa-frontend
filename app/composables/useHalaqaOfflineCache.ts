import { unwrapList } from '~/utils/api/list'
import { toYmd, todayYmd } from '~/utils/date'
import { startOfWeekSat } from '~/utils/plan'
import { pageForVerseKey } from '~/composables/useVerseToPage'
import { prefetchMushafPage } from '~/composables/useMushafPage'
import type { ApiStudent, ApiWeeklyPlan, ApiWeeklyPlanItem } from '~/types'

// Caches everything a teacher needs offline for a halaqa: the attendance roster
// + today's attendance, the achievements list, each student's record +
// memorization + current/next-week plans, halaqa evaluation settings, and (for
// the manual download) the lessons' Mushaf pages. Warms the exact GET URLs the
// pages use, via api.warm() which PINS the cached copies so the read-cache
// eviction cap can't drop them. Runs online only.
//
// Two entry points: makeAvailableOffline() (manual, with progress + Mushaf) and
// autoWarm() (silent, throttled — fired automatically when a halaqa is selected
// so the teacher-work pages just work offline by default).

export type OfflineCacheState = 'idle' | 'running' | 'complete' | 'error'

const LAST_CACHED_KEY = 'halaqa:offline-cached'
const AUTO_WARM_KEY = 'halaqa:auto-warmed'
const AUTO_WARM_TTL = 15 * 60 * 1000

const state = ref<OfflineCacheState>('idle')
const done = ref(0)
const total = ref(0)
const cachingHalaqaId = ref<number | null>(null)
let autoWarming = false

function currentAndNextWeek(): string[] {
  const cur = startOfWeekSat(new Date())
  const next = new Date(cur)
  next.setDate(cur.getDate() + 7)
  return [toYmd(cur), toYmd(next)]
}

function collectPages(item: ApiWeeklyPlanItem, pages: Set<number>) {
  const start = pageForVerseKey(`${item.start_surah}:${item.start_verse}`)
  const end = pageForVerseKey(`${item.end_surah}:${item.end_verse}`)
  if (!start || !end) return
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  for (let p = lo; p <= hi && p - lo < 30; p++) pages.add(p)
}

function readTimestampMap(key: string): Record<string, number> {
  if (!import.meta.client) return {}
  try {
    return JSON.parse(localStorage.getItem(key) || '{}') as Record<string, number>
  } catch {
    return {}
  }
}

function writeTimestamp(key: string, halaqaId: number) {
  if (!import.meta.client) return
  try {
    const map = readTimestampMap(key)
    map[halaqaId] = Date.now()
    localStorage.setItem(key, JSON.stringify(map))
  } catch {
    // Non-fatal.
  }
}

export function useHalaqaOfflineCache() {
  const api = useApi()
  const progress = computed(() => (total.value ? Math.round((done.value / total.value) * 100) : 0))
  const isCaching = computed(() => state.value === 'running')

  function lastCachedAt(halaqaId: number): number | null {
    return readTimestampMap(LAST_CACHED_KEY)[halaqaId] ?? null
  }

  // Core: fetch (pinned) all teacher-work data for a halaqa. `onStep` drives the
  // manual progress bar; the auto path passes nothing.
  async function warmHalaqaData(
    halaqaId: number,
    opts: { withMushaf?: boolean, onStep?: (done: number, total: number) => void } = {}
  ) {
    const today = todayYmd()
    const rosterUrl = `/students?halaqa_id=${halaqaId}&limit=100`

    // Halaqa settings + the two list pages for today (attendance + achievements).
    await api.warm(`/halaqat/${halaqaId}`).catch(() => {})
    await api.warm(`/attendance/students?date=${today}&limit=100`).catch(() => {})
    await api.warm(`/achievements?date=${today}&page=1&limit=20&halaqa_id=${halaqaId}`).catch(() => {})

    const rosterRaw = await api.warm<unknown>(rosterUrl).catch(() => null)
    const students = rosterRaw ? unwrapList<ApiStudent>(rosterRaw) : []
    const weeks = currentAndNextWeek()

    let step = 0
    const steps = students.length * (2 + weeks.length)
    const pages = new Set<number>()

    for (const student of students) {
      await api.warm(`/students/${student.id}`).catch(() => {})
      opts.onStep?.(++step, steps)
      await api.warm(`/students/${student.id}/memorization`).catch(() => {})
      opts.onStep?.(++step, steps)
      for (const week of weeks) {
        const planRaw = await api
          .warm<unknown>(`/weekly-plans?student_id=${student.id}&halaqa_id=${halaqaId}&week_start_date=${week}`)
          .catch(() => null)
        opts.onStep?.(++step, steps)
        const plan = planRaw ? unwrapList<ApiWeeklyPlan>(planRaw)[0] : null
        if (plan?.items) for (const item of plan.items) collectPages(item, pages)
      }
    }

    // Only the manual download pulls the (heavier) Mushaf glyph pages.
    if (opts.withMushaf) for (const page of pages) prefetchMushafPage(page)
  }

  async function makeAvailableOffline(halaqaId: number): Promise<boolean> {
    if (!import.meta.client || state.value === 'running') return false
    if (!navigator.onLine) {
      state.value = 'error'
      return false
    }
    state.value = 'running'
    done.value = 0
    total.value = 0
    cachingHalaqaId.value = halaqaId
    try {
      await warmHalaqaData(halaqaId, {
        withMushaf: true,
        onStep: (d, t) => {
          done.value = d
          total.value = t
        }
      })
      writeTimestamp(LAST_CACHED_KEY, halaqaId)
      writeTimestamp(AUTO_WARM_KEY, halaqaId)
      state.value = 'complete'
      return true
    } catch {
      state.value = 'error'
      return false
    } finally {
      cachingHalaqaId.value = null
    }
  }

  // Silent, throttled background warm — fired automatically on halaqa select so
  // the teacher-work pages work offline without anyone tapping a button.
  async function autoWarm(halaqaId: number): Promise<void> {
    if (!import.meta.client || !navigator.onLine || autoWarming) return
    const last = readTimestampMap(AUTO_WARM_KEY)[halaqaId] ?? 0
    if (Date.now() - last < AUTO_WARM_TTL) return
    autoWarming = true
    try {
      await warmHalaqaData(halaqaId, { withMushaf: false })
      writeTimestamp(AUTO_WARM_KEY, halaqaId)
    } catch {
      // Best-effort; a normal page visit will still cache what it needs.
    } finally {
      autoWarming = false
    }
  }

  return { state, done, total, progress, isCaching, cachingHalaqaId, makeAvailableOffline, autoWarm, lastCachedAt }
}
