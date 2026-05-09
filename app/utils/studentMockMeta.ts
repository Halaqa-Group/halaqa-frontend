import type { Student } from '~/types'

export type StudentStatusVariant = 'active' | 'frequentAbsent' | 'stopped' | 'new'

export interface StudentMockMeta {
  statusVariant: StudentStatusVariant
  lastSessionDays: number | null
  ayahCount: number
  attendanceRate: number
  progress: number
  currentSurah: string
  hasAnyAchievement: boolean
}

const SAMPLE_SURAHS = [
  'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام',
  'الأعراف', 'يوسف', 'الإسراء', 'الكهف', 'مريم', 'طه', 'يس'
]

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

export function getStudentMockMeta(student: Student): StudentMockMeta {
  const h = hashId(student.id)
  const realProgress = student.progress
  const realSurah = student.currentSurah
  const hasReal = (realProgress ?? 0) > 0 && !!realSurah && realSurah !== '—'

  const mockProgress = h % 100
  const progress = hasReal && realProgress !== null ? realProgress : mockProgress
  const currentSurah = hasReal && realSurah ? realSurah : SAMPLE_SURAHS[(h >> 3) % SAMPLE_SURAHS.length]!

  let statusVariant: StudentStatusVariant
  if (student.status === 'inactive') {
    statusVariant = 'stopped'
  } else {
    const choices: StudentStatusVariant[] = ['active', 'active', 'active', 'frequentAbsent', 'new']
    statusVariant = choices[(h >> 5) % choices.length]!
  }

  const newStudent = statusVariant === 'new'
  const hasAnyAchievement = newStudent ? (h >> 9) % 3 !== 0 : progress > 0

  let lastSessionDays: number | null
  if (!hasAnyAchievement) {
    lastSessionDays = null
  } else if (statusVariant === 'stopped') {
    lastSessionDays = 14 + ((h >> 7) % 14)
  } else if (statusVariant === 'frequentAbsent') {
    lastSessionDays = 3 + ((h >> 7) % 4)
  } else {
    lastSessionDays = (h >> 7) % 3
  }

  const ayahCount = hasAnyAchievement ? Math.round(progress * 6 + (h % 30)) : 0

  let attendanceRate: number
  if (statusVariant === 'stopped') attendanceRate = 20 + ((h >> 11) % 20)
  else if (statusVariant === 'frequentAbsent') attendanceRate = 50 + ((h >> 11) % 20)
  else if (statusVariant === 'new') attendanceRate = 70 + ((h >> 11) % 20)
  else attendanceRate = 80 + ((h >> 11) % 20)

  return {
    statusVariant,
    lastSessionDays,
    ayahCount,
    attendanceRate,
    progress: hasAnyAchievement ? progress : 0,
    currentSurah,
    hasAnyAchievement
  }
}

export interface ProgressColorClasses { bg: string, text: string }

export function progressColorClasses(progress: number): ProgressColorClasses {
  if (progress <= 30) return { bg: 'bg-red-500', text: 'text-red-500' }
  if (progress <= 60) return { bg: 'bg-orange-500', text: 'text-orange-500' }
  if (progress <= 85) return { bg: 'bg-yellow-500', text: 'text-yellow-500' }
  return { bg: 'bg-green-500', text: 'text-green-500' }
}

export function attendanceDotClass(rate: number): string {
  if (rate < 50) return 'bg-red-500'
  if (rate < 75) return 'bg-yellow-500'
  return 'bg-green-500'
}

export interface StatusBadgeClasses { container: string, dot: string }

export const STATUS_BADGE_CLASSES: Record<StudentStatusVariant, StatusBadgeClasses> = {
  active: { container: 'bg-track-hifz-bg text-track-hifz', dot: 'bg-green-500' },
  frequentAbsent: { container: 'bg-status-warning-bg text-status-warning', dot: 'bg-yellow-500' },
  stopped: { container: 'bg-status-conflict-bg text-status-conflict', dot: 'bg-red-500' },
  new: { container: 'bg-status-info-bg text-status-info', dot: 'bg-blue-500' }
}
