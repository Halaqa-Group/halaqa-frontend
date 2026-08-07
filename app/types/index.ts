import type { FetchOptions } from 'ofetch'
import type { Ref } from 'vue'
import type { StudentCapacityUnit } from '~/data/constants'

export type { StudentCapacityUnit }

export type ApiClient = {
  <T = unknown>(url: string, opts?: FetchOptions): Promise<T>
  lastWarnings: Ref<string[]>
  // Spends the HttpOnly refresh cookie for a fresh access token. Resolves
  // false instead of throwing when there is no live session to restore.
  refresh: () => Promise<boolean>
  // Like the plain GET, but pins the response in the read-cache so the
  // eviction cap never drops it — used by the "make available offline" prefetch.
  warm: <T = unknown>(url: string, opts?: FetchOptions) => Promise<T>
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

// ─── Person names ─────────────────────────────────────────────────────────────
// Students and users carry the four-part Arabic name (الاسم الأول / اسم الأب /
// اسم الجد / اسم العائلة). `name` is a read-only display value the database
// derives from the parts — reads keep using it, writes must send the parts.
export interface ApiPersonName {
  first_name: string
  second_name: string
  third_name: string
  family_name: string
  /** Derived server-side from the four parts; rejected in a write payload. */
  name: string
}

/** The four parts as a write payload: all required on create, all optional on patch. */
export interface PersonNameInput {
  first_name: string
  second_name: string
  third_name: string
  family_name: string
}

export interface Student {
  id: string
  name: string
  firstName: string
  secondName: string
  thirdName: string
  familyName: string
  gender: 'male' | 'female'
  status: 'active' | 'inactive' | 'graduated'
  idNumber: string | null
  /** WhatsApp dial code, e.g. `+970`. Null together with `phone`. */
  phoneCountryCode: string | null
  /** WhatsApp number without the dial code. */
  phone: string | null
  /** Both halves joined — ready for a wa.me link, null when the number is unset. */
  phoneE164: string | null
  dob: string | null
  joinDate: string
  deletedAt: string | null
  notes: string | null
  dailyHifzPagesCapacity: number
  dailyHifzCapacityUnit: StudentCapacityUnit
  dailyNearPagesCapacity: number
  dailyNearCapacityUnit: StudentCapacityUnit
  dailyFarPagesCapacity: number
  dailyFarCapacityUnit: StudentCapacityUnit
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

/**
 * How the student walks the mushaf while memorizing: `descending` (the API
 * default) starts at An-Nas and works backwards, `ascending` starts at Al-Fatihah.
 */
export type MemorizationDirection = 'ascending' | 'descending'

export interface ApiStudent extends ApiPersonName {
  id: number
  gender: 'male' | 'female'
  id_number: string | null
  phone_country_code: string | null
  phone: string | null
  /** Derived server-side from the two fields above; null unless both are set. */
  phone_e164: string | null
  dob: string | null
  join_date: string
  status: 'active' | 'inactive' | 'graduated'
  deleted_at?: string | null
  daily_hifz_pages_capacity: number | string
  daily_hifz_capacity_unit: StudentCapacityUnit
  daily_near_pages_capacity: number | string
  daily_near_capacity_unit: StudentCapacityUnit
  daily_far_pages_capacity: number | string
  daily_far_capacity_unit: StudentCapacityUnit
  memorization_direction: MemorizationDirection
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
  user: ApiPersonName & {
    id: number
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
  address: string | null
  phone: string | null
  status: 'active' | 'inactive'
  timezone: string
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
  /** Daily-report track weights (sum = 100). Defaults to 40/25/30/5. */
  report_weights: ReportWeights
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
  report_weights: ReportWeights
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
  /** تقييم الأخلاق — behaviour score 1..5. Seeded rows carry 5. Students only. */
  ethics_rating: number
  excuse_note: string | null
  /**
   * ملاحظة المحفّظ اليومية — the teacher's daily note, surfaced as `teacher_note`
   * in the daily report. Currently write-only: the attendance list/detail
   * endpoints do NOT return it yet, so it arrives undefined on reads. Kept
   * optional so a later backend change that serializes it works without edits.
   */
  daily_note?: string | null
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
  /** Omitted → a new row defaults to 5 and an existing row keeps its rating. */
  ethics_rating?: number
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

// PATCH /attendance/students/:id — single-row correction. `status` and
// `ethics_rating` are both optional, but at least one must actually differ from
// the stored row or the backend answers 400.
export interface AttendanceCorrectionPayload {
  status?: AttendanceStatus
  ethics_rating?: number
  excuse_note?: string
  /** ملاحظة المحفّظ اليومية — surfaced as `teacher_note` in the daily report. */
  daily_note?: string
  modification_reason?: string
}

// PATCH /attendance/teachers/:id — staff rows have no ethics rating.
export interface TeacherAttendanceCorrectionPayload {
  status: AttendanceStatus
  excuse_note?: string
  modification_reason?: string
}

// ─── Staff (teacher/admin) attendance — /attendance/teachers ──────────────────

export interface ApiTeacherAttendance {
  id: number
  user_id: number
  user_name?: string | null
  user_photo_url?: string | null
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

export type AchievementErrorType = 'mistake' | 'warning' | 'harakat'
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
  // صفحات الموضع — mushaf pages this position covers, fractional. Computed on the
  // frontend and stored as-is; the backend sums them into `positions_pages`.
  // Omit (undefined) when the range can't be resolved — NULL means "not supplied".
  pages?: number | null
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
  // الصفحات الكلية — mushaf pages the whole [start,end] range covers, fractional.
  // The backend never derives this; whatever the client sends is what the
  // dashboard (`total_pages`) and the daily report read back. For `full` it also
  // becomes the single position's pages; for `test` the per-position `pages`
  // inside `test_positions` roll up into `positions_pages` separately.
  total_pages?: number | null
  teacher_notes?: string
  approve?: boolean
}

export interface StudentTrackCapacity {
  /** The raw capacity number, counted in `unit`. */
  amount: number
  unit: StudentCapacityUnit
}

/**
 * مقاييس الطالب — the student's daily capacity per plan track: how much (amount)
 * and in which unit. Seeds the "create weekly plan" wizard so a generated week
 * starts from the student's own capacity instead of a hardcoded page/day.
 */
export interface StudentCapacities {
  Hifz: StudentTrackCapacity
  Near: StudentTrackCapacity
  Far: StudentTrackCapacity
}

export interface StudentWithAttendance {
  id: number
  name: string
  avatar: string
  attendanceStatus: AttendanceStatus | null
  // Carried through so plan defaults (wizard anchor, new-session range) follow the
  // student's own memorization direction instead of a hardcoded guess.
  memorizationDirection?: MemorizationDirection
  // The student's daily capacity per track (مقاييس) — seeds the plan wizard's
  // amount + unit so it reflects this student, not a fixed default.
  capacities?: StudentCapacities
}

// ─── Daily evaluation report ──────────────────────────────────────────────────
// Contracts for the daily report feature (backend module `daily-reports`).
// Endpoints, all under GET/POST /halaqat/:id/...:
//   GET  :id/daily-report?date=YYYY-MM-DD              → ApiDailyReport
//   GET  :id/daily-report/:date/students/:studentId    → ApiStudentReportDetail
//   POST :id/daily-reports/:date/recalculate           → { message }
// Response fields are snake_case (like halaqat/students/achievements); the only
// exception is the internal `reconciliation` audit blob, whose keys stay
// camelCase because the backend stores it verbatim. All rates/scores are already
// rounded to 2 decimals (ROUND_HALF_UP) server-side — the frontend only formats.

export type DailyReportSource = 'live' | 'snapshot'
export type DailyReportDayStatus = 'working_day' | 'non_working_day'
export type DailyReportStatus = 'complete' | 'partial' | 'failed'
/** Attendance as seen by the report: the four real states plus a synthetic one. */
export type EvaluationAttendanceStatus = AttendanceStatus | 'missing_attendance'

export type SystemAlertSeverity = 'info' | 'warning' | 'error'
/** Known codes; typed loosely so a new backend code still renders. */
export type SystemAlertCode =
  | 'NO_APPROVED_PLAN'
  | 'MISSING_ATTENDANCE'
  | 'OUTSIDE_PLAN'
  | 'PLAN_GAPS'
  | 'WEIGHTS_REDISTRIBUTED'
  | 'RECALCULATED'
  | (string & {})

export interface SystemAlert {
  code: SystemAlertCode
  severity: SystemAlertSeverity
  message: string
}

/** The four effective (snapshot) weights returned with a report; sum to 100. */
export interface ReportWeightsSummary {
  hifz: number
  near: number
  far: number
  ethics: number
}

/** One student row in the summary report. `null` scores mean "not computed". */
export interface StudentReportRow {
  student_id: number
  student_name: string
  attendance_status: EvaluationAttendanceStatus
  hifz_score: number
  near_score: number
  far_score: number
  /** null when attendance is missing. */
  ethics_score: number | null
  /** Quantity-of-plan achieved, independent of quality. null when missing. */
  plan_completion_rate: number | null
  /** null when attendance is missing — render as "—", never as zero. */
  total_score: number | null
  teacher_note: string | null
  system_alerts: SystemAlert[]
}

/** GET /halaqat/:id/daily-report?date=… */
export interface ApiDailyReport {
  halaqa_id: number
  date: string
  source: DailyReportSource
  day_status: DailyReportDayStatus
  report_status: DailyReportStatus
  weights: ReportWeightsSummary
  /** Empty on a non_working_day (no zero-filled rows). */
  students: StudentReportRow[]
}

// Reconciliation audit blob (§12) — camelCase, stored verbatim by the backend.
export interface ReconciliationSegment {
  startSurah: number
  startVerse: number
  endSurah: number
  endVerse: number
  startGlobalAyah?: number
  endGlobalAyah?: number
  pageCoverage: number
}

export interface ReconciliationPlannedRange extends ReconciliationSegment {
  planItemId: number
}

export interface ReconciliationApprovedSegment extends ReconciliationSegment {
  percentageScore: number
  selectedAchievementId: number
  candidateAchievementIds: number[]
}

export interface ReconciliationOutsideSegment {
  achievementId: number
  startSurah: number
  startVerse: number
  endSurah: number
  endVerse: number
  pageCoverage: number
}

export interface TrackReconciliation {
  version: number
  trackType: string
  plannedPages: number
  achievedPages: number
  completionRate: number
  qualityRate: number
  plannedRanges: ReconciliationPlannedRange[]
  approvedSegments: ReconciliationApprovedSegment[]
  gaps: ReconciliationSegment[]
  outsidePlanSegments: ReconciliationOutsideSegment[]
}

/** Per-track breakdown for one student. */
export interface StudentTrackDetail {
  base_weight: number
  /** May exceed base_weight when another track's weight is redistributed here. */
  effective_weight: number
  planned_pages: number
  achieved_pages: number
  completion_rate: number
  quality_rate: number
  score: number
  reconciliation: TrackReconciliation | null
}

/** GET /halaqat/:id/daily-report/:date/students/:studentId */
export interface ApiStudentReportDetail {
  halaqa_id: number
  date: string
  student_id: number
  student_name: string
  source: DailyReportSource
  attendance_status: EvaluationAttendanceStatus
  hifz: StudentTrackDetail
  near: StudentTrackDetail
  far: StudentTrackDetail
  ethics_rating: number | null
  ethics_score: number | null
  plan_completion_rate: number | null
  total_score: number | null
  teacher_note: string | null
  system_alerts: SystemAlert[]
}

/** Per-halaqa track weights for the report. Persisted on the halaqa; sum = 100. */
export interface ReportWeights {
  hifz_weight: number
  near_weight: number
  far_weight: number
  ethics_weight: number
}

export const REPORT_WEIGHTS_DEFAULTS: ReportWeights = {
  hifz_weight: 40,
  near_weight: 25,
  far_weight: 30,
  ethics_weight: 5
}

// ─── Dashboard KPIs (GET /dashboard/*) ────────────────────────────────────────
// A read-only aggregation layer over attendance, achievements, weekly plans,
// halaqat and students. It owns no table and exposes no mutations.
//
// Scope is resolved SERVER-side from the caller's role — principal/VP see the
// whole school, a supervisor their supervised halaqat, a teacher the halaqat
// they currently teach. A caller with nothing in scope gets zeros/empty arrays
// rather than a 403, so the frontend never pre-checks scope; it only hides the
// two staff-facing surfaces the API refuses outright (see `canViewTeacherCommitment`).
//
// Units are uniform across every endpoint and are NOT interchangeable:
//   • rates  → fractions 0..1   (`0.92` = 92%)
//   • scores → 0..100           (averages of `percentage_score`)
//   • ethics → 1..5
//   • volume → mushaf PAGES, fractional — never verses
// Every response echoes the resolved `range`, so the UI always knows which
// window it is showing even when it sent none.

export type DashboardPeriod = 'week' | 'month'

/** Same three tracks as `AchievementTrack` in `~/utils/achievement`. */
export type DashboardTrack = 'Hifz' | 'Near' | 'Far'

/** The resolved reporting window, inclusive on both ends. */
export interface DashboardRange {
  from: string
  to: string
}

/**
 * The window query every dashboard endpoint accepts. `from`+`to` win when both
 * are present; otherwise `period` decides ('month' → 1st of this month, default
 * 'week' → the most recent Saturday), always ending today.
 */
export interface DashboardWindowQuery {
  period?: DashboardPeriod
  from?: string
  to?: string
  /** Narrow every figure to one halaqa; intersected with the caller's scope. */
  halaqa_id?: number
}

/** The headline KPIs over the immediately-preceding window, for trend deltas. */
export interface ApiDashboardOverviewPrevious {
  range: DashboardRange
  student_attendance_rate: number
  teacher_attendance_rate: number | null
  ethics_average: number
  new_memorization_pages: number
  plan_completion_rate: number
  average_score: number
}

/** GET /dashboard/overview */
export interface ApiDashboardOverview {
  range: DashboardRange
  /** (present + late) / obligated rows, 0..1. */
  student_attendance_rate: number
  /** `null` for the teacher role — staff commitment is above their level. */
  teacher_attendance_rate: number | null
  /** Average ethics rating (تقييم الأخلاق), 1..5. */
  ethics_average: number
  /** SUM(total_pages) of approved Hifz achievements — fractional pages. */
  new_memorization_pages: number
  plan_completion_rate: number
  /** Average percentage_score, 0..100. */
  average_score: number
  active_students: number
  active_halaqat: number
  /** Only populated when the request asked for `compare=true`; else null. */
  previous: ApiDashboardOverviewPrevious | null
}

export interface ApiTopStudent {
  student_id: number
  student_name: string
  /** الصفحات الكلية — what the leaderboard ranks by. */
  total_pages: number
  /** صفحات المواضع — the amount actually recited; equals total_pages when full. */
  positions_pages: number
  achievements_count: number
  average_score: number
}

/** GET /dashboard/top-students */
export interface ApiTopStudents {
  range: DashboardRange
  track: DashboardTrack
  items: ApiTopStudent[]
}

export interface ApiHalaqaPerformance {
  halaqa_id: number
  halaqa_name: string
  students: number
  attendance_rate: number
  /** New-memorization pages (Hifz) in the window. */
  pages: number
  average_score: number
  plan_completion_rate: number
}

/** GET /dashboard/halaqat */
export interface ApiHalaqatPerformance {
  range: DashboardRange
  items: ApiHalaqaPerformance[]
}

export interface ApiTeacherCommitment {
  teacher_id: number
  teacher_name: string
  /** The teacher's OWN attendance rate; `null` when they have no rows at all. */
  attendance_rate: number | null
  halaqat: number
  students: number
  /** Their students' attendance rate — a different metric from the one above. */
  student_attendance_rate: number
  student_pages: number
}

/** GET /dashboard/teachers — principal, VP and supervisor only (403 otherwise). */
export interface ApiTeachersCommitment {
  range: DashboardRange
  items: ApiTeacherCommitment[]
}

export interface ApiStalledStudent {
  student_id: number
  student_name: string
  /** Date of their last approved achievement; `null` when they have never had one. */
  last_achievement_date: string | null
  /** Days since that achievement; `null` when there has never been one. */
  days_since: number | null
}

export interface ApiHalaqaWithoutTeacher {
  halaqa_id: number
  halaqa_name: string
}

export interface ApiHighAbsenceTeacher {
  teacher_id: number
  teacher_name: string
  absent_days: number
  attendance_rate: number
}

/** GET /dashboard/alerts */
export interface ApiDashboardAlerts {
  range: DashboardRange
  /** The staleness window the server actually applied (it clamps to 1..90). */
  stalled_days: number
  stalled_students: ApiStalledStudent[]
  halaqat_without_teacher: ApiHalaqaWithoutTeacher[]
  /** Always empty for the teacher role — the endpoint itself withholds it. */
  high_absence_teachers: ApiHighAbsenceTeacher[]
}

/** Extra knobs `GET /dashboard/alerts` accepts on top of the window query. */
export interface DashboardAlertsQuery extends DashboardWindowQuery {
  /** No approved achievement in this many days = "stalled". Default 7, clamped 1..90. */
  stalled_days?: number
  /** Absent days that flag a teacher. Default 2, clamped 1..90. */
  absence_threshold?: number
}

/**
 * The window as the UI models it. `mode: 'custom'` is the only case that carries
 * `from`/`to`; the other two let the server derive the window from `period`, so
 * the client never has to know that the school week starts on Saturday.
 */
export interface DashboardWindowSelection {
  mode: DashboardPeriod | 'custom'
  from?: string
  to?: string
}

/** Extra knobs `GET /dashboard/top-students` accepts. */
export interface DashboardTopStudentsQuery extends DashboardWindowQuery {
  /** Defaults to `Hifz`; `Near`/`Far` rank by review volume instead. */
  track?: DashboardTrack
  /** Default 10, capped at 50 server-side. */
  limit?: number
}
