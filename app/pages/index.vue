<script setup lang="ts">
import type { DashboardTrack, DashboardWindowSelection } from '~/types'
import {
  formatKpiEthics,
  formatKpiPages,
  formatKpiRate,
  formatKpiScore,
  trendOf
} from '~/utils/dashboard'

/**
 * The role-scoped KPI dashboard — the home screen.
 *
 * Every figure comes from `GET /dashboard/*`, which resolves the caller's scope
 * server-side: principal/VP see the whole school, a supervisor their supervised
 * halaqat, a teacher the halaqat they currently teach. So this page needs no
 * role branches around the data calls — a teacher hitting the same endpoints
 * simply receives a narrower answer.
 *
 * The navbar halaqa picker IS wired, but only for a scoped role (a teacher):
 * their selected halaqa is passed as `halaqa_id`, narrowing every figure to it.
 * The backend intersects that id with the caller's scope, so it can only ever
 * narrow — never reach a halaqa they cannot see. Unscoped roles (principal/VP/
 * supervisor) send no `halaqa_id` and keep the full-scope view.
 *
 * Teacher commitment is deliberately NOT shown for the teacher role: that
 * endpoint reports on staff and 403s below supervisor; `canViewTeacherCommitment`
 * gates both the request and the section.
 */

definePageMeta({
  breadcrumb: [
    { label: 'home' }
  ]
})

const { t, locale } = useI18n()
const { user, activeRole } = useAuth()
const { canViewTeacherCommitment } = usePermissions()
const { selectedHalaqaId, isHalaqaScoped } = useGlobalHalaqa()

const {
  overview, topStudents, halaqat, teachers, alerts,
  overviewError, topStudentsError, halaqatError, teachersError, alertsError,
  isLoading,
  fetchTopStudents, fetchAlerts, loadAll
} = useDashboardStats()

// ── Window / filters ─────────────────────────────────────────────────────────
const selection = ref<DashboardWindowSelection>({ mode: 'week' })
const track = ref<DashboardTrack>('Hifz')
const stalledDays = ref(7)

const windowQuery = computed(() => ({
  period: selection.value.mode === 'custom' ? undefined : selection.value.mode,
  from: selection.value.from,
  to: selection.value.to,
  // Only a scoped role (teacher) narrows the dashboard to its navbar-selected
  // halaqa; unscoped roles omit it and keep the full-scope view.
  halaqa_id: isHalaqaScoped.value ? (selectedHalaqaId.value ?? undefined) : undefined
}))

function reload() {
  return loadAll({ ...windowQuery.value, track: track.value, limit: 5, stalledDays: stalledDays.value })
}

// Changing one filter refetches only the section it affects — reloading the
// whole page for a track switch would flash five sections to reload one.
watch(selection, reload, { deep: true })

watch(track, newTrack =>
  fetchTopStudents({ ...windowQuery.value, track: newTrack, limit: 5 })
)

watch(stalledDays, days =>
  fetchAlerts({ ...windowQuery.value, stalled_days: days })
)

// A scoped role picks its halaqa from the navbar; every section follows it.
// (Resolves after the layout's initializeHalaqa, so this also covers the first
// selection landing just after the initial mount.)
watch(selectedHalaqaId, () => {
  if (isHalaqaScoped.value) reload()
})

onMounted(reload)

// ── Header ───────────────────────────────────────────────────────────────────
const dateLocale = computed(() => (locale.value === 'ar' ? 'ar-SA' : 'en-US'))

const formattedToday = computed(() =>
  new Date().toLocaleDateString(dateLocale.value, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', numberingSystem: 'latn'
  })
)

const userRoleLabel = computed(() => activeRole.value ?? 'parent')

// ── KPI cards ────────────────────────────────────────────────────────────────
const previous = computed(() => overview.value?.previous ?? null)

/** The window the deltas compare against, named so the badge means something. */
const comparisonLabel = computed(() => {
  if (!previous.value) return ''
  return selection.value.mode === 'month'
    ? t('pages.home.period.vsPreviousMonth')
    : t('pages.home.period.vsPreviousPeriod')
})

const attendanceTrend = computed(() =>
  trendOf(overview.value?.student_attendance_rate, previous.value?.student_attendance_rate))
const teacherAttendanceTrend = computed(() =>
  trendOf(overview.value?.teacher_attendance_rate, previous.value?.teacher_attendance_rate))
const pagesTrend = computed(() =>
  trendOf(overview.value?.new_memorization_pages, previous.value?.new_memorization_pages))
const planTrend = computed(() =>
  trendOf(overview.value?.plan_completion_rate, previous.value?.plan_completion_rate))
const scoreTrend = computed(() =>
  trendOf(overview.value?.average_score, previous.value?.average_score))
const ethicsTrend = computed(() =>
  trendOf(overview.value?.ethics_average, previous.value?.ethics_average))

/**
 * Staff-commitment figures are hidden on TWO conditions, and both are needed.
 *
 * The API withholds `teacher_attendance_rate` (sends `null`) for a caller whose
 * roles contain no supervisor/admin — but it authorizes on the UNION of a user's
 * roles, so a principal who also teaches still receives it while acting as a
 * teacher. `canViewTeacherCommitment` reads `activeRole`, so adding it keeps the
 * role switcher honest: acting as a lesser role only ever narrows the UI.
 */
const showStaffCommitment = computed(() =>
  canViewTeacherCommitment.value && overview.value?.teacher_attendance_rate !== null)

// ── Quick actions ────────────────────────────────────────────────────────────
const quickActions = computed(() => [
  {
    label: t('nav.attendance'),
    description: t('pages.home.quickActions.attendance'),
    icon: 'i-lucide-clipboard-check',
    href: '/attendance',
    chip: 'bg-track-hifz-bg text-track-hifz'
  },
  {
    label: t('nav.students'),
    description: t('pages.home.quickActions.students'),
    icon: 'i-lucide-users',
    href: '/students',
    chip: 'bg-status-info-bg text-status-info'
  },
  {
    label: t('nav.achievements'),
    description: t('pages.home.quickActions.achievements'),
    icon: 'i-lucide-star',
    href: '/achievements',
    chip: 'bg-status-warning-bg text-status-warning'
  },
  {
    label: t('nav.dailyReport'),
    description: t('pages.home.quickActions.dailyReport'),
    icon: 'i-lucide-file-chart-column',
    href: '/daily-report',
    chip: 'bg-status-ok-bg text-status-ok'
  }
])
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Greeting -->
    <div class="flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div class="space-y-1">
        <span class="text-xs font-bold uppercase tracking-widest text-primary">
          {{ formattedToday }}
        </span>
        <h1 class="text-3xl font-bold leading-tight text-on-surface">
          {{ t('pages.home.greeting', { name: user?.name || t('pages.home.greetingFallback') }) }}
        </h1>
        <p class="text-sm text-on-surface-variant">
          {{ t('pages.home.subtitle') }}
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-2 rounded-xl bg-track-hifz-bg px-4 py-2">
        <UIcon name="i-lucide-shield-check" class="size-4 text-track-hifz" />
        <span class="text-sm font-semibold text-track-hifz">
          {{ t(`roles.${userRoleLabel}`) }}
        </span>
      </div>
    </div>

    <!-- Reporting window -->
    <DashboardPeriodFilter
      v-model="selection"
      :range="overview?.range ?? null"
      :loading="isLoading"
      @refresh="reload"
    />

    <!-- Headline KPIs -->
    <section>
      <div v-if="overviewError" class="flex items-center gap-3 rounded-2xl bg-status-conflict-bg px-4 py-3">
        <UIcon name="i-lucide-triangle-alert" class="size-5 shrink-0 text-error" />
        <p class="flex-1 text-sm text-on-surface">
          {{ overviewError }}
        </p>
        <UButton size="xs" variant="soft" :label="t('common.tryAgain')" @click="reload" />
      </div>

      <div v-else-if="isLoading && !overview" class="flex items-center justify-center py-16">
        <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-primary" />
      </div>

      <template v-else-if="overview">
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <DashboardKpiCard
            :label="t('pages.home.kpi.studentAttendance')"
            :value="formatKpiRate(overview.student_attendance_rate)"
            icon="i-lucide-user-check"
            tone="hifz"
            :meter="overview.student_attendance_rate"
            :trend="attendanceTrend"
          />

          <DashboardKpiCard
            v-if="showStaffCommitment"
            :label="t('pages.home.kpi.teacherAttendance')"
            :value="formatKpiRate(overview.teacher_attendance_rate)"
            icon="i-lucide-briefcase"
            tone="ok"
            :meter="overview.teacher_attendance_rate"
            :trend="teacherAttendanceTrend"
          />

          <DashboardKpiCard
            :label="t('pages.home.kpi.newMemorization')"
            :value="formatKpiPages(overview.new_memorization_pages)"
            :hint="t('pages.home.kpi.pagesHint')"
            icon="i-lucide-book-open-check"
            tone="gold"
            :trend="pagesTrend"
          />

          <DashboardKpiCard
            :label="t('pages.home.kpi.planCompletion')"
            :value="formatKpiRate(overview.plan_completion_rate)"
            icon="i-lucide-calendar-check"
            tone="info"
            :meter="overview.plan_completion_rate"
            :trend="planTrend"
          />

          <DashboardKpiCard
            :label="t('pages.home.kpi.averageScore')"
            :value="formatKpiScore(overview.average_score)"
            :hint="t('pages.home.kpi.scoreHint')"
            icon="i-lucide-target"
            tone="overdue"
            :trend="scoreTrend"
          />

          <DashboardKpiCard
            :label="t('pages.home.kpi.ethics')"
            :value="formatKpiEthics(overview.ethics_average)"
            :hint="t('pages.home.kpi.ethicsHint')"
            icon="i-lucide-heart-handshake"
            tone="near"
            :trend="ethicsTrend"
          />

          <DashboardKpiCard
            :label="t('pages.home.kpi.activeStudents')"
            :value="String(overview.active_students)"
            icon="i-lucide-users"
            tone="far"
          />

          <DashboardKpiCard
            :label="t('pages.home.kpi.activeHalaqat')"
            :value="String(overview.active_halaqat)"
            icon="i-lucide-layout-grid"
            tone="conflict"
          />
        </div>

        <p v-if="comparisonLabel" class="mt-3 text-xs text-on-surface-variant">
          {{ comparisonLabel }}
        </p>
      </template>
    </section>

    <!-- Alerts + leaderboard -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <DashboardAlertsPanel
        v-model:stalled-days="stalledDays"
        :data="alerts"
        :loading="isLoading && !alerts"
        :error="alertsError"
        :show-staff-commitment="showStaffCommitment"
      />

      <DashboardTopStudents
        v-model:track="track"
        :data="topStudents"
        :loading="isLoading && !topStudents"
        :error="topStudentsError"
      />
    </div>

    <!-- Per-halaqa performance -->
    <DashboardHalaqatTable
      :data="halaqat"
      :loading="isLoading && !halaqat"
      :error="halaqatError"
    />

    <!-- Teacher commitment — principal / VP / supervisor only -->
    <DashboardTeachersTable
      v-if="canViewTeacherCommitment"
      :data="teachers"
      :loading="isLoading && !teachers"
      :error="teachersError"
    />

    <!-- Quick access -->
    <section>
      <h2 class="mb-4 text-base font-semibold text-on-surface">
        {{ t('pages.home.quickAccess') }}
      </h2>
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <UButton
          v-for="action in quickActions"
          :key="action.href"
          variant="ghost"
          color="neutral"
          class="flex flex-col items-start gap-3 rounded-2xl bg-surface-container-lowest p-5 text-start ring-1 ring-card-border"
          @click="navigateTo(action.href)"
        >
          <div class="flex size-10 items-center justify-center rounded-xl" :class="action.chip">
            <UIcon :name="action.icon" class="size-5" />
          </div>
          <div>
            <p class="text-sm font-semibold text-on-surface">
              {{ action.label }}
            </p>
            <p class="mt-0.5 text-xs text-on-surface-variant">
              {{ action.description }}
            </p>
          </div>
        </UButton>
      </div>
    </section>
  </div>
</template>
