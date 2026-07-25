import type { ApiHalaqaDetail, ApiHalaqaListItem } from '~/types'

/**
 * Single source of truth for "what may the current user do", mirroring the
 * backend guards and service checks one-for-one. Every capability below maps to
 * a concrete endpoint rule — when the backend changes, change it here too and
 * nowhere else.
 *
 * Gating reads `activeRole`, not the union of `user.roles`. The backend
 * authorizes on the union, so acting as a lesser role only ever narrows the UI —
 * never widens it past what the server allows. That is what makes the role
 * switcher honest.
 *
 * The achievements module (achievements, weekly plans, plan items) authorizes
 * every mutation on ONE check — `hasHalaqaScope`: principal, VP, a supervisor of
 * the halaqa, or ANY teacher with an active assignment to it. There is no
 * primary/acting-teacher tier and no admin-only carve-out; approve, unapprove
 * and delete all sit behind that same check. Since the API only ever returns
 * achievements and plans the caller is already in scope for, the frontend can
 * answer those with the role alone.
 */

// Every halaqa id we have seen in a list response. The API scopes /halaqat to
// what the caller may see, so for a teacher or supervisor "seen" == "mine".
const knownHalaqaIds = ref(new Set<number>())

/** Feed the permission cache from any halaqa list response. */
export function rememberHalaqaAccess(items: ApiHalaqaListItem[]) {
  const known = new Set(knownHalaqaIds.value)
  for (const h of items) known.add(h.id)
  knownHalaqaIds.value = known
}

/** Same, from a halaqa detail response. */
export function rememberHalaqaDetailAccess(halaqa: ApiHalaqaDetail) {
  knownHalaqaIds.value = new Set(knownHalaqaIds.value).add(halaqa.id)
}

export function usePermissions() {
  const { activeRole } = useAuth()

  const role = computed(() => activeRole.value ?? '')
  const isPrincipal = computed(() => role.value === 'principal')
  const isAdmin = computed(() => role.value === 'principal' || role.value === 'vice_principal')
  const isSupervisor = computed(() => role.value === 'supervisor')
  const isTeacher = computed(() => role.value === 'teacher')
  const isParent = computed(() => role.value === 'parent')
  const isStaff = computed(() => !!role.value && role.value !== 'parent')

  /** Is the halaqa one the server lets this user see at all? */
  function isMemberOf(halaqaId?: number | null): boolean {
    return halaqaId != null && knownHalaqaIds.value.has(halaqaId)
  }

  /** Backend `hasHalaqaScope`: admin, a supervisor of it, or any of its teachers. */
  function hasHalaqaScope(halaqaId?: number | null): boolean {
    if (isAdmin.value) return true
    return isStaff.value && isMemberOf(halaqaId)
  }

  return {
    role,
    isPrincipal,
    isAdmin,
    isSupervisor,
    isTeacher,
    isParent,
    isStaff,

    isMemberOf,
    hasHalaqaScope,

    // ── Achievements ───────────────────────────────────────────────────────
    // Record, edit, approve, unapprove and delete are one and the same check:
    // hasHalaqaScope on the achievement's halaqa. Any staff row the list shows
    // is already in scope, so the role alone answers it.
    canRecordAchievement: isStaff,
    canEditAchievement: isStaff,
    canDeleteAchievement: isStaff,
    canApproveAchievement: isStaff,
    canUnapproveAchievement: isStaff,

    // ── Weekly plans & plan items ──────────────────────────────────────────
    // Same single tier: create, approve, unapprove, hard-delete, and every
    // plan-item mutation all gate on hasHalaqaScope.
    canCreatePlan: isStaff,
    canApprovePlan: isStaff,
    canEditPlanItems: isStaff,
    canDeletePlan: isStaff,
    canUnapprovePlan: isStaff,

    // ── Attendance ─────────────────────────────────────────────────────────
    // POST /attendance/sync and PATCH /attendance/:id — p, vp, teacher.
    // Supervisors may read but not record.
    canMarkStudentAttendance: computed(() => isAdmin.value || isTeacher.value),
    // POST /attendance/teachers/sync and PATCH — p, vp only.
    canManageStaffAttendance: isAdmin,
    // GET /attendance/teachers — p, vp, supervisor, teacher.
    canViewStaffAttendance: isStaff,

    // ── Students ───────────────────────────────────────────────────────────
    canCreateStudent: isAdmin,
    canDeleteStudent: isAdmin,
    canRestoreStudent: isAdmin,
    canGraduateStudent: isAdmin,
    // PATCH /students/:id — p, vp, teacher. Supervisors cannot edit students.
    canEditStudent: computed(() => isAdmin.value || isTeacher.value),
    // A teacher's PATCH body is limited to capacities + notes; bio fields 400.
    lockStudentBio: isTeacher,
    // Guardian mutations are p/vp; everyone in scope may read them.
    canManageGuardians: isAdmin,
    // PUT /students/:id/memorization — p, vp, supervisor, teacher.
    canEditMemorization: isStaff,

    // ── Halaqat ────────────────────────────────────────────────────────────
    canViewHalaqat: isStaff,
    canCreateHalaqa: isAdmin,
    // Archive / complete / restore / change `type` — p, vp only.
    canManageHalaqaLifecycle: isAdmin,
    // PATCH /halaqat/:id name + evaluation_settings — also supervisors of the
    // halaqa and any of its active teachers.
    canEditHalaqaMeta: (halaqaId?: number | null) => hasHalaqaScope(halaqaId),
    // Teacher / supervisor assignment, enrollment, transfers, acting — p, vp.
    canManageHalaqaMembership: isAdmin,
    canManageActing: isAdmin,
    // GET /halaqat/:id/activity — p, vp, supervisor, teacher.
    canViewActivityLog: isStaff,

    // ── School calendar ────────────────────────────────────────────────────
    canViewCalendar: isStaff,
    canManageCalendar: isAdmin,

    // ── Users ──────────────────────────────────────────────────────────────
    canViewUsers: isAdmin,
    canManageUsers: isPrincipal,

    // ── Dashboard KPIs ─────────────────────────────────────────────────────
    // /dashboard/{overview,top-students,halaqat,alerts} are open to all staff
    // and scope themselves server-side, so no flag is needed for them.
    // GET /dashboard/teachers is the exception: it reports ON teachers, so it
    // is p/vp/supervisor only and 403s for the teacher role.
    canViewTeacherCommitment: computed(() => isAdmin.value || isSupervisor.value)
  }
}
