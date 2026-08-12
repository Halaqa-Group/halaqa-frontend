import type { ApiPlanItemLinks, ApiPlanLinks } from '~/types'

/**
 * Read access to a plan's **stored** settlement — which approved achievement
 * credited which verse span of which plan item.
 *
 * Two ways in, both server-computed:
 *  - the planner already holds a whole week, so it embeds the settlement with
 *    `?include=links` on the plan fetch (see `useWeeklyPlan.loadPlan`) — no extra
 *    round-trip;
 *  - a caller holding nothing but an id uses the fetchers here.
 *
 * A client must never derive the linkage itself by comparing ranges: an item's
 * credit depends on what earlier items of the same week already consumed, which
 * the range alone does not say.
 */
export function usePlanLinks() {
  const api = useApi()

  /** `GET /weekly-plans/:id/links` — the week's rows, already split by the API. */
  function fetchPlanLinks(planId: number, opts: { signal?: AbortSignal } = {}) {
    return api<ApiPlanLinks>(`/weekly-plans/${planId}/links`, { signal: opts.signal })
  }

  /**
   * `GET /weekly-plan-items/:id/links` — one item's rows. Outside-plan spans are
   * never here (they carry no item); they come from `fetchPlanLinks`.
   */
  function fetchItemLinks(itemId: number, opts: { signal?: AbortSignal } = {}) {
    return api<ApiPlanItemLinks>(`/weekly-plan-items/${itemId}/links`, { signal: opts.signal })
  }

  return { fetchPlanLinks, fetchItemLinks }
}
