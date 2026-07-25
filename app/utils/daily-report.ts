import type {
  EvaluationAttendanceStatus,
  SystemAlertSeverity
} from '~/types'

// NOTE: this module is imported explicitly everywhere it is used — the project
// does not auto-import from `app/utils`.

type BadgeColor = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary'

/**
 * Display a rate/score. The backend already rounds to 2 decimals (ROUND_HALF_UP),
 * so we only format — never re-round with a different rule. `null` renders as a
 * dash: a missing value is NOT a zero (§6 — missing_attendance ≠ 0).
 */
export function formatScore(value: number | null | undefined, dash = '—'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return dash
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/** Same as {@link formatScore} but suffixed with a percent sign. */
export function formatRate(value: number | null | undefined, dash = '—'): string {
  const s = formatScore(value, dash)
  return s === dash ? dash : `${s}%`
}

/** i18n key + badge colour for an attendance status as the report reports it. */
export function attendanceMeta(status: EvaluationAttendanceStatus): {
  labelKey: string
  color: BadgeColor
} {
  switch (status) {
    case 'present':
      return { labelKey: 'attendance.status.present', color: 'success' }
    case 'late':
      return { labelKey: 'attendance.status.late', color: 'warning' }
    case 'absent':
      return { labelKey: 'attendance.status.absent', color: 'error' }
    case 'excused':
      return { labelKey: 'attendance.status.excused', color: 'info' }
    case 'missing_attendance':
      return { labelKey: 'pages.dailyReport.attendance.missing', color: 'neutral' }
    default:
      return { labelKey: 'pages.dailyReport.attendance.missing', color: 'neutral' }
  }
}

/** A missing-attendance row must show "—" for scores, not a zero. */
export function isMissingAttendance(status: EvaluationAttendanceStatus): boolean {
  return status === 'missing_attendance'
}

const ALERT_COLORS: Record<SystemAlertSeverity, BadgeColor> = {
  info: 'info',
  warning: 'warning',
  error: 'error'
}

export function alertColor(severity: SystemAlertSeverity): BadgeColor {
  return ALERT_COLORS[severity] ?? 'neutral'
}

const ALERT_ICONS: Record<SystemAlertSeverity, string> = {
  info: 'i-lucide-info',
  warning: 'i-lucide-alert-triangle',
  error: 'i-lucide-octagon-alert'
}

export function alertIcon(severity: SystemAlertSeverity): string {
  return ALERT_ICONS[severity] ?? 'i-lucide-info'
}
