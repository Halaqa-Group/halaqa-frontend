import type { ApiHalaqaDetail, ApiHalaqaListItem } from '~/types'

/**
 * Single source of truth for "what may the current user do", mirroring the
 * backend guards and service checks one-for-one. Every capability below maps to
 * a concrete endpoint rule — when the backend changes, change it here too and
 * nowhere else.
 *
 * Two things are deliberate:
 *
 * 1. Gating reads `activeRole`, not the union of `user.roles`. The backend
 *    authorizes on the union, so acting as a lesser role only ever narrows the
 *    UI — never widens it past what the server allows. That is what makes the
 *    role switcher honest.
 *
 * 2. Several teacher capabilities need the *primary/acting* teacher of a
 *    specific halaqa, not just any teacher assigned to it. The backend
 *    predicate is `role = 'main' OR acting_as_primary = 1`; `GET /halaqat`
 *    already resolves exactly that into `primary_teacher`, so we cache it as
 *    halaqa lists load and answer from there.
 */

// halaqa id → user id of its effective primary (main, or the acting substitute).
const primaryTeacherByHalaqa = ref(new Map<number, number | null>())

// Every halaqa id we have seen in a list response. The API scopes /halaqat to
// what the caller may see, so for a teacher or supervisor "seen" == "mine".
const knownHalaqaIds = ref(new Set<number>())

/** Feed the permission cache from any halaqa list response. */
export function rememberHalaqaAccess(items: ApiHalaqaListItem[]) {
  const primary = new Map(primaryTeacherByHalaqa.value)
  const known = new Set(knownHalaqaIds.value)
  for (const h of items) {
    primary.set(h.id, h.primary_teacher?.user_id ?? null)
    known.add(h.id)
  }
  primaryTeacherByHalaqa.value = primary
  knownHalaqaIds.value = known
}

/** Same, from a halaqa detail response, whose teacher rows carry the acting flag. */
export function rememberHalaqaDetailAccess(halaqa: ApiHalaqaDetail) {
  const effective = halaqa.teachers.find(
    t => !t.end_date && (t.role === 'main' || t.acting_as_primary)
  )
  const primary = new Map(primaryTeacherByHalaqa.value)
  primary.set(halaqa.id, effective?.teacher_user_id ?? null)
  primaryTeacherByHalaqa.value = primary
  knownHalaqaIds.value = new Set(knownHalaqaIds.value).add(halaqa.id)
}

export function usePermissions() {
  const { user, activeRole } = useAuth()

  const role = computed(() => activeRole.value ?? '')
  const isPrincipal = computed(() => role.value === 'principal')
  const isAdmin = computed(() => role.value === 'principal' || role.value === 'vice_principal')
  const isSupervisor = computed(() => role.value === 'supervisor')
  const isTeacher = computed(() => role.value === 'teacher')
  const isParent = computed(() => role.value === 'parent')
  const isStaff = computed(() => !!role.value && role.value !== 'parent')

  /** Is the current user the halaqa's main — or acting — teacher? */
  function isPrimaryTeacherOf(halaqaId?: number | null): boolean {
    const uid = user.value?.id
    if (uid == null || halaqaId == null) return false
    return primaryTeacherByHalaqa.value.get(halaqaId) === uid
  }

  /** Is the halaqa one the server lets this user see at all? */
  function isMemberOf(halaqaId?: number | null): boolean {
    return halaqaId != null && knownHalaqaIds.value.has(halaqaId)
  }

  /**
   * Backend `hasApprovalAuthority`: principal/VP, a supervisor of the halaqa, or
   * its primary/acting teacher. An assistant or non-acting substitute is NOT
   * included — this is what keeps them from seeing buttons that 403.
   * Supervisor scope is enforced server-side; we only know it is one of theirs.
   */
  function hasApprovalAuthority(halaqaId?: number | null): boolean {
    if (isAdmin.value) return true
    if (isSupervisor.value) return isMemberOf(halaqaId)
    if (isTeacher.value) return isPrimaryTeacherOf(halaqaId)
    return false
  }

  /** Backend `hasHalaqaScope`: any in-scope role, including assistant teachers. */
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

    isPrimaryTeacherOf,
    isMemberOf,
    hasApprovalAuthority,
    hasHalaqaScope,

    // ── Achievements ───────────────────────────────────────────────────────
    // POST/PATCH/DELETE /achievements — p, vp, supervisor, any active teacher.
    canRecordAchievement: isStaff,
    canEditAchievement: isStaff,
    // Approved rows are principal-only to delete; VP cannot.
    canDeleteAchievement: (approved: boolean) => (approved ? isPrincipal.value : isStaff.value),
    // POST /achievements/:id/approve — needs approval authority on its halaqa.
    canApproveAchievement: (halaqaId?: number | null) => hasApprovalAuthority(halaqaId),
    // POST /achievements/:id/unapprove — p, vp only.
    canUnapproveAchievement: isAdmin,

    // ── Weekly plans & plan items ──────────────────────────────────────────
    // POST /weekly-plans and POST /weekly-plans/:id/approve, plus every
    // weekly-plan-items mutation, all go through hasApprovalAuthority.
    canCreatePlan: (halaqaId?: number | null) => hasApprovalAuthority(halaqaId),
    canApprovePlan: (halaqaId?: number | null) => hasApprovalAuthority(halaqaId),
    canEditPlanItems: (halaqaId?: number | null) => hasApprovalAuthority(halaqaId),
    // DELETE /weekly-plans/:id and unapprove — p, vp only.
    canDeletePlan: isAdmin,
    canUnapprovePlan: isAdmin,

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
    canManageUsers: isPrincipal
  }
}
