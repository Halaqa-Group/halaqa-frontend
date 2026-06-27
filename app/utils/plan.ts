import type { BadgeColor } from '~/utils/halaqa'

/** Weekly-plan item status → UBadge color (reconciliation-driven). */
export function planItemStatusColor(status: string): BadgeColor {
  switch (status) {
    case 'completed': return 'success'
    case 'partial': return 'warning'
    case 'overdue': return 'error'
    default: return 'neutral' // due
  }
}
