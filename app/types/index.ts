export interface LessonItem {
  id: string
  startSurah: string
  startAyah: number
  endSurah: string
  endAyah: number
}

export type LessonCategory = 'mem' | 'near' | 'far'

export interface DayData {
  id: string
  day: string
  date: string
  lessons: Record<LessonCategory, LessonItem[]>
  statusColors: Record<LessonCategory, string>
}

export interface Student {
  id: string
  name: string
  status: 'active' | 'inactive'
  currentSurah: string
  progress: number
  halaqa: string
  attendance: number
  avatar: string
}

export type AttendanceStatus = 'present' | 'late' | 'absent'

export interface AttendanceEntry {
  studentId: string
  status: AttendanceStatus
  mistakes: number
  rating: number
  surah: string
  notes: string
}
