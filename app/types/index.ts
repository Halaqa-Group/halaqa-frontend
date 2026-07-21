import type { FetchOptions } from 'ofetch'
import type { Ref } from 'vue'

export type ApiClient = {
  <T = unknown>(url: string, opts?: FetchOptions): Promise<T>
  lastWarnings: Ref<string[]>
}

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
  guardians?: ApiGuardian[]
}

export interface ApiStudentListResult {
  items: ApiStudent[]
  total: number
  page: number
  limit: number
}

// ─── Memorization — /students/:id/memorization ────────────────────────────────
export interface ApiMemorization {
  memorized_ayah_count: number
  bitmap_base64: string
}

/** A verse range in the snake_case shape the memorization edit endpoint expects. */
export interface MemorizationRangeInput {
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
}

export interface EditMemorizationInput {
  set?: MemorizationRangeInput[]
  clear?: MemorizationRangeInput[]
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

export interface ApiSchool {
  id: number
  name: string
  address: string
  phone: string | null
  status: 'active' | 'inactive'
}

export type HalaqaType = 'Memorization' | 'Tajweed' | 'Aqeedah'
export type HalaqaStatus = 'active' | 'archived' | 'completed'
export type TeacherRole = 'main' | 'assistant' | 'substitute'
export type EndReason = 'reassigned' | 'left_school' | 'vacation' | 'retired' | 'other'
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

export type ApiHalaqa = ApiHalaqaListItem

export interface ApiTeacherOption {
  id: number
  name: string
  email: string
}

export interface ApiTeacher extends ApiTeacherOption {
  identity_number: string
  phone: string | null
  status: 'active' | 'inactive'
  assigned_halaqat: string
}

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
  date: string
  status: AttendanceStatus
  excuse_note: string | null
  recorded_by?: number | null
  modified_by?: number | null
  modification_reason?: string | null
  original_status?: string | null
  created_at?: string
  student?: ApiStudent
}

export interface ApiAttendanceListResult {
  items: ApiAttendance[]
  total: number
  page: number
  limit: number
}

// POST /attendance/students/sync — idempotent bulk write (create + correct).
export interface AttendanceSyncEntry {
  student_id: number
  date: string
  status: AttendanceStatus
  excuse_note?: string
  client_uuid?: string
  client_recorded_at?: string
  device_id?: string
}

export interface AttendanceSyncResultRow {
  student_id: number
  date: string
  client_uuid: string | null
  outcome: 'created' | 'updated' | 'duplicate' | 'forbidden'
  attendance_id: number | null
}

export interface AttendanceSyncResult {
  created: number
  updated: number
  duplicate: number
  forbidden: number
  results: AttendanceSyncResultRow[]
}

// PATCH /attendance/students/:id and /attendance/teachers/:id — single-row correction.
export interface AttendanceCorrectionPayload {
  status: AttendanceStatus
  excuse_note?: string
  modification_reason?: string
}

// ─── Staff (teacher/admin) attendance — /attendance/teachers ──────────────────

export interface ApiTeacherAttendance {
  id: number
  user_id: number
  date: string
  status: AttendanceStatus
  excuse_note: string | null
  recorded_by?: number | null
  modified_by?: number | null
  modification_reason?: string | null
  original_status?: string | null
  created_at?: string
}

export interface ApiTeacherAttendanceListResult {
  items: ApiTeacherAttendance[]
  total: number
  page: number
  limit: number
}

export interface TeacherAttendanceSyncEntry {
  user_id: number
  date: string
  status: AttendanceStatus
  excuse_note?: string
  client_uuid?: string
  client_recorded_at?: string
  device_id?: string
}

export interface TeacherAttendanceSyncResultRow {
  user_id: number
  date: string
  client_uuid: string | null
  outcome: 'created' | 'updated' | 'duplicate' | 'forbidden'
  attendance_id: number | null
}

export interface TeacherAttendanceSyncResult {
  created: number
  updated: number
  duplicate: number
  forbidden: number
  results: TeacherAttendanceSyncResultRow[]
}

// ─── School calendar — /attendance/schedules and /attendance/holidays ─────────

export interface ApiSchoolSchedule {
  id: number
  day_of_week: number // 0=Saturday … 6=Friday
  effective_from: string
  effective_to: string | null
  notes: string | null
}

export interface CreateSchoolSchedulePayload {
  day_of_week: number
  effective_from: string
  effective_to?: string
  notes?: string
}

export interface ApiHoliday {
  id: number
  holiday_date: string
  description: string
}

export interface CreateHolidayPayload {
  holiday_date: string
  description: string
}

export type AchievementErrorType = 'mistake' | 'warning' | 'tajweed' | 'harakat'
export type CompletionMethod = 'quick' | 'mushaf'
export type RecitationMethod = 'full' | 'test'

// A single itemized error occurrence at a QUL word span. surah/ayah/juz/hizb are
// supplied by the client from QUL at capture time; the backend denormalizes the
// rest from the parent achievement.
export interface PositionError {
  error_type: AchievementErrorType
  start_word_id: number
  end_word_id: number
  surah: number
  ayah: number
  juz: number
  hizb: number
}

// A recited/tested position on an achievement (response shape). Derived counts +
// errors are hidden for the parent role.
// Response shape. Every field is served to every role that can read the
// achievement — the API stopped stripping the breakdown for parents.
export interface RecitationPosition {
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
  mistakes_count: number
  warnings_count: number
  tajweed_errors_count: number
  harakat_errors_count: number
  errors: PositionError[]
}

// A verse-range spot the student was tested on (request shape for
// recitation_method='test'). Each carries its own errors; per-type counts are
// derived by the backend. Used only when submitting a partial test.
export interface AchievementTestPosition {
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
  errors?: PositionError[]
}

export interface ApiAchievement {
  id: number
  student_id: number
  student_name?: string | null
  halaqa_id: number
  date: string
  track_type: 'Hifz' | 'Near' | 'Far'
  completion_method?: CompletionMethod
  recitation_method?: RecitationMethod
  recitation_positions?: RecitationPosition[]
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
  // Top-level totals — derived from errors[] by the backend. Served to every
  // role, parents included; null only when the row carries no breakdown.
  mistakes_count: number | null
  warnings_count: number | null
  tajweed_errors_count: number | null
  harakat_errors_count: number | null
  percentage_score: number | string
  status: 'approved' | 'unapproved'
  recorded_by_name: string | null
  approved_by_name: string | null
  approved_at: string | null
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

// One aggregated error hotspot: a single ayah with the student's error tally there.
export interface HeatmapHotspot {
  surah: number
  ayah: number
  mistakes_count: number
  warnings_count: number
  tajweed_errors_count: number
  harakat_errors_count: number
  total: number
}

// Student error heatmap: worst ayat (most errors first) over a rolling window.
export interface ApiErrorHeatmap {
  student_id: number
  days: number
  total_errors: number
  hotspots: HeatmapHotspot[]
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
  weekly_plan_id?: number
  day_of_week: number
  order?: number
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

export interface CreateAchievementDto {
  student_id: number
  halaqa_id: number
  date: string
  track_type: 'Hifz' | 'Near' | 'Far'
  completion_method?: CompletionMethod
  recitation_method?: RecitationMethod
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
  // Itemized errors (recitation_method='full' → attached to the single position).
  // Replaces the old raw-count inputs; the backend derives all counts from this.
  errors?: PositionError[]
  // Tested spots (recitation_method='test' only, >=1). Mutually exclusive with
  // top-level `errors`, which the backend rejects for a test recitation.
  test_positions?: AchievementTestPosition[]
  percentage_score: number
  teacher_notes?: string
  approve?: boolean
}

export interface StudentWithAttendance {
  id: number
  name: string
  avatar: string
  attendanceStatus: AttendanceStatus | null
}
