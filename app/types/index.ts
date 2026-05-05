import type { FetchOptions } from 'ofetch'

// ── API client ──────────────────────────────────────────────────────────────

export type ApiClient = <T = unknown>(url: string, opts?: FetchOptions) => Promise<T>

// ── UI types (used by existing components) ──────────────────────────────────

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
  gender: 'male' | 'female'
  status: 'active' | 'inactive' | 'graduated'
  dob: string | null
  joinDate: string
  notes: string | null
  currentSurah: string
  progress: number
  halaqa: string
  attendance: number
  dailyHifzPagesCapacity: number
  dailyNearPagesCapacity: number
  dailyFarPagesCapacity: number
  guardians: ApiGuardian[]
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

// ── API types (backend entity shapes) ───────────────────────────────────────

export interface ApiStudent {
  id: number
  school_id?: number
  father_id?: number | null
  mother_id?: number | null
  email?: string | null
  name: string
  gender?: 'male' | 'female'
  dob: string | null
  join_date: string
  status: 'active' | 'inactive' | 'graduated'
  daily_hifz_pages_capacity: number | string
  daily_near_pages_capacity: number | string
  daily_far_pages_capacity: number | string
  notes: string | null
  photo_url: string | null
  progress_percent?: number
  current_surah?: string
  halaqa_name?: string
  attendance_rate?: number
  guardians?: ApiGuardian[]
}

export interface ApiStudentListResult {
  items: ApiStudent[]
  total: number
  page: number
  limit: number
}

export interface ApiGuardian {
  user: {
    id: number
    name: string
    email: string
    phone: string | null
  }
  relation: string
  is_primary: boolean
  can_pickup: boolean
}

/** Current school profile (principal dashboard / settings). */
export interface ApiSchool {
  id: number
  name: string
  address: string
  phone: string | null
  status: 'active' | 'inactive'
}

export interface ApiHalaqa {
  id: number
  name: string
  type: 'Memorization' | 'Tajweed' | 'Aqeedah'
  school_id: number
  teacher_id: number
  schedules: { id: number, day_of_week: number }[]
  /** Present on list responses when the API joins teacher info */
  teacher_name?: string
}

export interface ApiTeacherOption {
  id: number
  name: string
  email: string
}

/** Full teacher row for school management (list + forms). */
export interface ApiTeacher extends ApiTeacherOption {
  identity_number: string
  phone: string | null
  status: 'active' | 'inactive'
  assigned_halaqat: string
}

/** Parent/guardian record for school management (list + forms). */
export interface ApiParent {
  id: number
  school_id: number
  name: string
  email: string
  phone: string | null
  identity_number: string
  children_count: number
  children_names: string
  status: 'active' | 'inactive'
}

export interface ApiAttendance {
  id: number
  student_id: number
  halaqa_id: number
  date: string
  status: 'Present' | 'Late' | 'Excused' | 'Absent'
  notes: string | null
  student?: ApiStudent
}

export interface ApiAchievement {
  id: number
  student_id: number
  halaqa_id: number
  date: string
  track_type: 'Hifz' | 'Near' | 'Far'
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
  mistakes_count: number
  warnings_count: number
  tajweed_errors_count: number
  percentage_score: number
  status: 'approved' | 'unapproved'
  teacher_notes: string | null
  is_unplanned: boolean
  is_flagged_conflict: boolean
  student?: ApiStudent
}

export interface ApiWeeklyPlan {
  id: number
  student_id: number
  halaqa_id: number
  week_start_date: string
  status: 'draft' | 'approved'
  items: ApiWeeklyPlanItem[]
}

export interface ApiWeeklyPlanItem {
  id: number
  weekly_plan_id: number
  day_of_week: number
  track_type: 'Hifz' | 'Near' | 'Far'
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
  total_verses: number
  achieved_verses: number
  status: 'due' | 'completed' | 'partial' | 'overdue'
  is_manual_override: boolean
}

export interface ApiWarnings {
  halaqaId: number
  weekStartDate: string
  unplannedAchievements: ApiAchievement[]
  flaggedConflicts: ApiAchievement[]
  overdueItems: ApiWeeklyPlanItem[]
}

export interface ApiProgress {
  studentId: number
  studentName: string
  weekStartDate: string
  totalPlanned: number
  totalAchieved: number
  coveragePercent: number
  items: {
    dayOfWeek: number
    trackType: string
    status: string
    planned: number
    achieved: number
  }[]
}

// ── Achievement creation DTO ───────────────────────────────────────────────
export interface CreateAchievementDto {
  student_id: number
  halaqa_id: number
  date: string
  track_type: 'Hifz' | 'Near' | 'Far'
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
  mistakes_count?: number
  warnings_count?: number
  tajweed_errors_count?: number
  teacher_notes?: string
}

// ── Student with attendance status (for achievements page) ──────────────────
export interface StudentWithAttendance {
  id: number
  name: string
  avatar: string
  attendanceStatus: 'Present' | 'Late' | 'Excused' | 'Absent' | null
}
