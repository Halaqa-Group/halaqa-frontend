import type { ApiPlanLink } from '~/types'

/**
 * Helpers over the plan's **stored** settlement rows (`ApiPlanLink`) — the
 * backend's record of which approved achievement credited which verse span of
 * which plan item.
 *
 * Nothing here infers a linkage: every function only reads what reconciliation
 * already wrote. Comparing an achievement's range to an item's would attach the
 * wrong recitations, because reconciliation is week-scoped and consumption-ordered
 * (an earlier item may already have consumed the overlap).
 */

/**
 * Group settlement rows under the plan item each credited. Outside-plan rows
 * (`weekly_plan_item_id === null`) are dropped — they belong to the week, and
 * folding them under an item is exactly the mistake this data exists to prevent.
 */
export function groupLinksByItem(links: ApiPlanLink[]): Map<number, ApiPlanLink[]> {
  const byItem = new Map<number, ApiPlanLink[]>()
  for (const link of links) {
    const itemId = link.weekly_plan_item_id
    if (itemId === null) continue
    const list = byItem.get(itemId)
    if (list) list.push(link)
    else byItem.set(itemId, [link])
  }
  return byItem
}

/** The rows credited to no item — recited that week, planned by nothing. */
export function outsidePlanOf(links: ApiPlanLink[]): ApiPlanLink[] {
  return links.filter(l => l.weekly_plan_item_id === null)
}

/**
 * Whether only part of the achievement was credited here — the recitation ran
 * past the item's range on either side. Drives the "recorded: …" line that shows
 * the fuller range next to the credited one.
 */
export function isPartialCredit(link: ApiPlanLink): boolean {
  const a = link.achievement
  if (!a) return false
  return a.start_surah !== link.start_surah || a.start_verse !== link.start_verse
    || a.end_surah !== link.end_surah || a.end_verse !== link.end_verse
}

/** Ayahs credited across a set of rows. For one item this equals `achieved_verses`. */
export function creditedVerses(links: ApiPlanLink[]): number {
  return links.reduce((sum, l) => sum + (l.credited_verses || 0), 0)
}

/** Pages credited across a set of rows — fractional, since a span rarely fills a page. */
export function creditedPages(links: ApiPlanLink[]): number {
  return links.reduce((sum, l) => sum + (Number(l.credited_pages) || 0), 0)
}

/** Distinct achievements behind a set of rows — one recitation can credit several items. */
export function creditingAchievements(links: ApiPlanLink[]): number {
  return new Set(links.map(l => l.achievement_id)).size
}
