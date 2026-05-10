import type { HalaqaStatus, HalaqaType, TeacherRole } from '~/types'

export const HALAQA_DAY_KEYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const
export const HALAQA_DAY_ORDER = [0, 1, 2, 3, 4, 5, 6] as const

export const HALAQA_TYPES: HalaqaType[] = ['Memorization', 'Tajweed', 'Aqeedah']
export const HALAQA_STATUSES: HalaqaStatus[] = ['active', 'archived', 'completed']
export const HALAQA_ROLES: TeacherRole[] = ['main', 'assistant', 'substitute']

export const HALAQA_TYPE_ICON: Record<HalaqaType, string> = {
  Memorization: 'i-lucide-book-open',
  Tajweed: 'i-lucide-mic',
  Aqeedah: 'i-lucide-book-text'
}

export type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

export const HALAQA_STATUS_COLOR: Record<HalaqaStatus, BadgeColor> = {
  active: 'success',
  completed: 'info',
  archived: 'neutral'
}

export const TEACHER_ROLE_COLOR: Record<TeacherRole, BadgeColor> = {
  main: 'primary',
  assistant: 'secondary',
  substitute: 'warning'
}
