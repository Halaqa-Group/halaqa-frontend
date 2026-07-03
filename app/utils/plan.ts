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

/**
 * Status → a static bg utility for the small progress dot. Kept as literal
 * strings so Tailwind's scanner emits them (dynamic `bg-${...}` would not).
 */
export function planItemStatusDot(status: string): string {
  switch (status) {
    case 'completed': return 'bg-success-500'
    case 'partial': return 'bg-warning-500'
    case 'overdue': return 'bg-error-500'
    default: return 'bg-neutral-400' // due
  }
}
