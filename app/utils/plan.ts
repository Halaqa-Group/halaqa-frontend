import type { BadgeColor } from '~/utils/halaqa'

export function backendDayOfWeek(d: Date): number {
  return (d.getDay() + 1) % 7
}

export function startOfWeekSat(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  r.setDate(r.getDate() - backendDayOfWeek(r))
  return r
}

export function planItemStatusColor(status: string): BadgeColor {
  switch (status) {
    case 'completed': return 'success'
    case 'partial': return 'warning'
    case 'overdue': return 'error'
    default: return 'neutral'
  }
}

export function planItemStatusDot(status: string): string {
  switch (status) {
    case 'completed': return 'bg-success-500'
    case 'partial': return 'bg-warning-500'
    case 'overdue': return 'bg-error-500'
    default: return 'bg-neutral-400'
  }
}
