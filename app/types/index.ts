import type { FetchOptions } from 'ofetch'
import type { Ref } from 'vue'

// ── API client ──────────────────────────────────────────────────────────────

export type ApiClient = {
  <T = unknown>(url: string, opts?: FetchOptions): Promise<T>
  /**
   * Warnings array from the most recent envelope (e.g. `id_number.checksum_invalid`).
   *  Reset to [] on every request that returns no warnings. Single-flight only —
   *  for concurrent calls, only the latest is observable.
   */
  lastWarnings: Ref<string[]>
}

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
  idNumber: string | null
  dob: string | null
  joinDate: string
  deletedAt: string | null
  notes: string | null
  dailyHifzPagesCapacity: number
  dailyNearPagesCapacity: number
  dailyFarPagesCapacity: number
  photoUrl: string | null
  guardians: ApiGuardian[]
  avatar: string
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused'

export interface AttendanceEntry {
  studentId: string
  status: AttendanceStatus
  mistakes: number
  rating: number
  surah: string
  notes: string
}

// ── API types (backend entity shapes) ───────────────────────────────────────

/**
 * Backend StudentResponse shape — fields the API actually returns.
 *  Note: progress/attendance/current_surah/halaqat etc. live in other
 *  modules (attendance, achievements, weekly-plans) and are NOT on this
 *  endpoint.
 */
export interface ApiStudent {
  id: number
  name: string
  gender: 'male' | 'female'
  id_number: string | null
  dob: string | null
  join_date: string
  status: 'active' | 'inactive' | 'graduated'
  deleted_at?: string | null
  daily_hifz_pages_capacity: number | string
  daily_near_pages_capacity: number | string
  daily_far_pages_capacity: number | string
  notes: string | null
  photo_url: string | null
  /** Present on detail (GET /students/:id) and as eager-loaded on create response. */
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

// ── Halaqat domain types (mirror halaqa-backend dto/halaqa.responses.ts) ────

export type HalaqaType = 'Memorization' | 'Tajweed' | 'Aqeedah'
export type HalaqaStatus = 'active' | 'archived' | 'completed'
export type TeacherRole = 'main' | 'assistant' | 'substitute'
export type EndReason = 'reassigned' | 'left_school' | 'vacation' | 'retired' | 'other'
export type PrayerSlot = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
export type StudentHalaqaStatus = 'active' | 'transferred' | 'completed' | 'archived'

export type HalaqaActivityAction
  = | 'halaqa_created' | 'halaqa_updated' | 'halaqa_archived'
    | 'halaqa_completed' | 'halaqa_restored'
    | 'teacher_assigned' | 'teacher_unassigned' | 'teacher_role_changed'
    | 'acting_started' | 'acting_extended' | 'acting_ended'
    | 'student_enrolled' | 'student_re_enrolled' | 'student_unenrolled'
    | 'student_transferred_in' | 'student_transferred_out' | 'student_completed'
    | 'supervisor_assigned' | 'supervisor_unassigned'
    | 'schedule_updated'

export interface ApiPrimaryTeacher {
  user_id: number
  name: string
  is_acting: boolean
}

export interface ApiScheduleEntry {
  id: number
  day_of_week: number
  prayer_slot: PrayerSlot | null
  start_time: string | null
  end_time: string | null
}

export interface ApiTeacherAssignment {
  id: number
  teacher_user_id: number
  teacher_name: string
  role: TeacherRole
  acting_as_primary: boolean
  acting_starts_at: string | null
  acting_ends_at: string | null
  start_date: string
  end_date: string | null
  end_reason: EndReason | null
}

export interface ApiSupervisorSummary {
  user_id: number
  name: string
  assigned_at: string
}

export interface ApiHalaqaListItem {
  id: number
  school_id: number
  name: string
  type: HalaqaType
  status: HalaqaStatus
  primary_teacher: ApiPrimaryTeacher | null
  students_count: number
  created_at: string
}

export interface ApiHalaqaListResult {
  items: ApiHalaqaListItem[]
  total: number
  page: number
  limit: number
}

export interface ApiHalaqaDetail {
  id: number
  school_id: number
  name: string
  type: HalaqaType
  evaluation_settings: Record<string, unknown> | null
  status: HalaqaStatus
  schedule: ApiScheduleEntry[]
  teachers: ApiTeacherAssignment[]
  supervisors: ApiSupervisorSummary[]
  students_count: number
  created_at: string
  updated_at: string
}

export interface ApiHalaqaCreated {
  id: number
  school_id: number
  name: string
  type: HalaqaType
  evaluation_settings: Record<string, unknown> | null
  status: HalaqaStatus
  created_at: string
}

export interface ApiStudentEnrollment {
  student_id: number
  student_name: string
  enrollment_date: string
  status: StudentHalaqaStatus
}

export interface ApiSetScheduleResult {
  schedule: ApiScheduleEntry[]
  warnings: string[]
}

export interface ApiActivityLogItem {
  id: string
  action: HalaqaActivityAction
  actor_user_id: number | null
  actor_name: string | null
  target_user_id: number | null
  target_user_name: string | null
  target_student_id: number | null
  target_student_name: string | null
  from_halaqa_id: number | null
  to_halaqa_id: number | null
  metadata: Record<string, unknown> | null
  notes: string | null
  created_at: string
}

export interface ApiActivityLogResult {
  items: ApiActivityLogItem[]
  total: number
  page: number
  limit: number
}

export interface ApiTeacherHalaqaItem {
  halaqa_id: number
  halaqa_name: string
  halaqa_status: HalaqaStatus
  halaqa_type: HalaqaType
  role: TeacherRole
  start_date: string
}

export interface ApiSupervisorHalaqaItem {
  halaqa_id: number
  halaqa_name: string
  halaqa_status: HalaqaStatus
  halaqa_type: HalaqaType
  assigned_at: string
}

export interface ApiStudentHalaqaItem {
  halaqa_id: number
  halaqa_name: string
  halaqa_status: HalaqaStatus
  halaqa_type: HalaqaType
  enrollment_date: string
  enrollment_status: StudentHalaqaStatus
}

// Backwards-compatible alias used by existing code paths (selector, etc.).
// New code should import ApiHalaqaListItem or ApiHalaqaDetail directly.
export type ApiHalaqa = ApiHalaqaListItem

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
  /** Omitted from the response for the parent role (side-channel prevention). */
  mistakes_count?: number
  warnings_count?: number
  tajweed_errors_count?: number
  percentage_score: number | string
  status: 'approved' | 'unapproved'
  /** Resolved actor names; omitted for the parent role. */
  recorded_by_name?: string | null
  approved_by_name?: string | null
  approved_at?: string | null
  teacher_notes: string | null
  created_at?: string
  student?: ApiStudent
}

export interface ApiAchievementListResult {
  items: ApiAchievement[]
  total: number
  page: number
  limit: number
}

export interface ApiWeeklyPlan {
  id: number
  student_id: number
  halaqa_id: number
  week_start_date: string
  status: 'draft' | 'approved'
  approved_by?: number | null
  items: ApiWeeklyPlanItem[]
  created_at?: string
}

export interface ApiWeeklyPlanListResult {
  items: ApiWeeklyPlan[]
  total: number
  page: number
  limit: number
}

export interface ApiWeeklyPlanItem {
  id: number
  /** Not returned by the backend item mapper; present only in mock/local shapes. */
  weekly_plan_id?: number
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
  created_at?: string
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
  /** Required by the backend; computed client-side from the halaqa's evaluation_settings. */
  percentage_score: number
  teacher_notes?: string
  approve?: boolean
}

// ── Student with attendance status (for achievements page) ──────────────────
export interface StudentWithAttendance {
  id: number
  name: string
  avatar: string
  attendanceStatus: 'Present' | 'Late' | 'Excused' | 'Absent' | null
}
