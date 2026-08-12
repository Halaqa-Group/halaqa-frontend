import type { FetchOptions } from 'ofetch'
import type { Ref } from 'vue'
import type { StudentCapacityUnit } from '~/data/constants'

export type { StudentCapacityUnit }

export type ApiClient = {
  <T = unknown>(url: string, opts?: FetchOptions): Promise<T>
  lastWarnings: Ref<string[]>
  refresh: () => Promise<boolean>
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

export interface ApiPersonName {
  first_name: string
  second_name: string
  third_name: string
  family_name: string
  name: string
}

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
  phoneCountryCode: string | null
  phone: string | null
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

export type MemorizationDirection = 'ascending' | 'descending'

export interface ApiStudent extends ApiPersonName {
  id: number
  gender: 'male' | 'female'
  id_number: string | null
  phone_country_code: string | null
  phone: string | null
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

export interface ApiMemorization {
  memorized_ayah_count: number
  bitmap_base64: string
}

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
  ethics_rating: number
  excuse_note: string | null
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

export interface AttendanceSyncEntry {
  student_id: number
  date: string
  status: AttendanceStatus
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

export interface AttendanceCorrectionPayload {
  status?: AttendanceStatus
  ethics_rating?: number
  excuse_note?: string
  daily_note?: string
  modification_reason?: string
}

export interface TeacherAttendanceCorrectionPayload {
  status: AttendanceStatus
  excuse_note?: string
  modification_reason?: string
}

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
export type RecitationMethod = 'full' | 'test' | 'untracked'

export interface AchievementErrorCounts {
  mistakes?: number
  warnings?: number
  tajweed?: number
  harakat?: number
}

export interface PositionError {
  error_type: AchievementErrorType
  start_word_id: number
  end_word_id: number
  surah: number
  ayah: number
  juz: number
  hizb: number
}

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

export interface AchievementTestPosition {
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
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

export interface HeatmapHotspot {
  surah: number
  ayah: number
  mistakes_count: number
  warnings_count: number
  harakat_errors_count: number
  total: number
}

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
  // Only present with `?include=links`. `undefined` means "not asked for"; `[]`
  // means "asked, and there are none" — the two must not be conflated, or a plan
  // fetched without the include reads as a week with nothing recited.
  links?: ApiPlanLink[]
  outside_plan?: ApiPlanLink[]
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

/**
 * The achievement that credited a settlement row, carrying its **own** recorded
 * range — usually wider than the credited span, since only the part falling inside
 * the plan item is counted.
 */
export interface ApiPlanLinkAchievement {
  id: number
  date: string
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
  percentage_score: number
}

/**
 * One materialized settlement row: "this achievement credited this verse span of
 * this plan item". Written solely by the backend's reconciliation, so the verse
 * fields describe the **credited span** — the intersection actually counted — not
 * the achievement's full range.
 *
 * Never re-derive this linkage in the client by comparing an achievement's range
 * to an item's: reconciliation is week-scoped and consumption-ordered, so overlap
 * alone does not imply a link.
 */
export interface ApiPlanLink {
  id: number
  weekly_plan_id: number
  // `null` means the span was recited but planned by no item of that track that
  // week ("outside plan"). Such a row belongs to the week — never render it
  // under an item.
  weekly_plan_item_id: number | null
  track_type: 'Hifz' | 'Near' | 'Far'
  plan_day_of_week: number | null
  achievement_id: number
  // The achievement's own date, which may differ from the credited item's day.
  achievement_date: string
  start_surah: number
  start_verse: number
  end_surah: number
  end_verse: number
  start_global_ayah: number
  end_global_ayah: number
  credited_verses: number
  credited_pages: number
  percentage_score: number
  // `null` only if the achievement row has since vanished.
  achievement: ApiPlanLinkAchievement | null
}

/** `GET /weekly-plans/:id/links` — a whole week's settlement, already split. */
export interface ApiPlanLinks {
  weekly_plan_id: number
  links: ApiPlanLink[]
  outside_plan: ApiPlanLink[]
}

/** `GET /weekly-plan-items/:id/links` — one item's settlement. */
export interface ApiPlanItemLinks {
  weekly_plan_item_id: number
  weekly_plan_id: number
  total_verses: number
  // Always equals the sum of `links[].credited_verses`.
  achieved_verses: number
  status: 'due' | 'completed' | 'partial' | 'overdue'
  links: ApiPlanLink[]
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
  errors?: PositionError[]
  test_positions?: AchievementTestPosition[]
  error_counts?: AchievementErrorCounts
  percentage_score: number
  total_pages?: number | null
  teacher_notes?: string
  approve?: boolean
  client_request_id?: string
}

export interface StudentTrackCapacity {
  amount: number
  unit: StudentCapacityUnit
}

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
  memorizationDirection?: MemorizationDirection
  capacities?: StudentCapacities
}

export type DailyReportSource = 'live' | 'snapshot'
export type DailyReportDayStatus = 'working_day' | 'non_working_day'
export type DailyReportStatus = 'complete' | 'partial' | 'failed'
export type EvaluationAttendanceStatus = AttendanceStatus | 'missing_attendance'

export type SystemAlertSeverity = 'info' | 'warning' | 'error'
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

export interface ReportWeightsSummary {
  hifz: number
  near: number
  far: number
  ethics: number
}

export interface StudentReportRow {
  student_id: number
  student_name: string
  attendance_status: EvaluationAttendanceStatus
  hifz_score: number
  near_score: number
  far_score: number
  ethics_score: number | null
  plan_completion_rate: number | null
  total_score: number | null
  teacher_note: string | null
  system_alerts: SystemAlert[]
}

export interface ApiDailyReport {
  halaqa_id: number
  date: string
  source: DailyReportSource
  day_status: DailyReportDayStatus
  report_status: DailyReportStatus
  weights: ReportWeightsSummary
  students: StudentReportRow[]
}

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

export interface StudentTrackDetail {
  base_weight: number
  effective_weight: number
  planned_pages: number
  achieved_pages: number
  completion_rate: number
  quality_rate: number
  score: number
  reconciliation: TrackReconciliation | null
}

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

export type DashboardPeriod = 'week' | 'month'

export type DashboardTrack = 'Hifz' | 'Near' | 'Far'

export interface DashboardRange {
  from: string
  to: string
}

export interface DashboardWindowQuery {
  period?: DashboardPeriod
  from?: string
  to?: string
  halaqa_id?: number
}

export interface ApiDashboardOverviewPrevious {
  range: DashboardRange
  student_attendance_rate: number
  teacher_attendance_rate: number | null
  ethics_average: number
  new_memorization_pages: number
  plan_completion_rate: number
  average_score: number
}

export interface ApiDashboardOverview {
  range: DashboardRange
  student_attendance_rate: number
  teacher_attendance_rate: number | null
  ethics_average: number
  new_memorization_pages: number
  plan_completion_rate: number
  average_score: number
  active_students: number
  active_halaqat: number
  previous: ApiDashboardOverviewPrevious | null
}

export interface ApiTopStudent {
  student_id: number
  student_name: string
  total_pages: number
  positions_pages: number
  achievements_count: number
  average_score: number
}

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
  pages: number
  average_score: number
  plan_completion_rate: number
}

export interface ApiHalaqatPerformance {
  range: DashboardRange
  items: ApiHalaqaPerformance[]
}

export interface ApiTeacherCommitment {
  teacher_id: number
  teacher_name: string
  attendance_rate: number | null
  halaqat: number
  students: number
  student_attendance_rate: number
  student_pages: number
}

export interface ApiTeachersCommitment {
  range: DashboardRange
  items: ApiTeacherCommitment[]
}

export interface ApiStalledStudent {
  student_id: number
  student_name: string
  last_achievement_date: string | null
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

export interface ApiDashboardAlerts {
  range: DashboardRange
  stalled_days: number
  stalled_students: ApiStalledStudent[]
  halaqat_without_teacher: ApiHalaqaWithoutTeacher[]
  high_absence_teachers: ApiHighAbsenceTeacher[]
}

export interface DashboardAlertsQuery extends DashboardWindowQuery {
  stalled_days?: number
  absence_threshold?: number
}

export interface DashboardWindowSelection {
  mode: DashboardPeriod | 'custom'
  from?: string
  to?: string
}

export interface DashboardTopStudentsQuery extends DashboardWindowQuery {
  track?: DashboardTrack
  limit?: number
}
