<script setup lang="ts">
definePageMeta({
  breadcrumb: [
    { label: 'home' }
  ]
})

const { t, locale } = useI18n()
const api = useApi()
const { user, activeRole } = useAuth()
const { selectedHalaqaId, halaqat, initializeHalaqa } = useGlobalHalaqa()
const { students, fetchStudents } = useStudents()

const todayAttendance = ref<any[]>([])
const isLoading = ref(true)
const attendanceError = ref(false)

const today = new Date().toISOString().split('T')[0]

const userRoleLabel = computed(() => {
  return activeRole.value ?? 'parent'
})

const presentToday = computed(() =>
  todayAttendance.value.filter(a => a.status === 'Present').length
)

const attendanceRate = computed(() =>
  todayAttendance.value.length > 0
    ? Math.round((presentToday.value / todayAttendance.value.length) * 100)
    : 0
)

const dateLocale = computed(() => locale.value === 'ar' ? 'ar-SA' : 'en-US')

const formattedToday = computed(() =>
  new Date().toLocaleDateString(dateLocale.value, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
)

const currentWeekday = computed(() =>
  new Date().toLocaleDateString(dateLocale.value, { weekday: 'long' })
)

// --- Mock data for new sections ---

const mockStatTrends = {
  students: [8, 8, 9, 9, 10, 10, 12],
  halaqat: [1, 1, 1, 1, 1, 1, 1],
  attendance: [65, 70, 80, 75, 85, 90, 78],
  reviews: [5, 4, 6, 3, 7, 4, 3]
}

const mockStatChanges = {
  students: { value: 20, direction: 'up' as const },
  halaqat: { value: 0, direction: 'same' as const },
  attendance: { value: 12, direction: 'up' as const },
  reviews: { value: -15, direction: 'down' as const }
}

const mockSchedule = [
  { id: 1, name: 'حلقة الفجر', time: '06:00 - 07:00', teacher: 'أ. محمد العلي', studentCount: 8 },
  { id: 2, name: 'حلقة الظهر', time: '13:00 - 14:30', teacher: 'أ. أحمد الحسن', studentCount: 12 },
  { id: 3, name: 'حلقة العصر', time: '16:00 - 17:30', teacher: 'أ. خالد السعيد', studentCount: 6 }
]

const mockWeeklyAttendance = [
  { day: 'sat', present: 10, absent: 2 },
  { day: 'sun', present: 11, absent: 1 },
  { day: 'mon', present: 9, absent: 3 },
  { day: 'tue', present: 12, absent: 0 },
  { day: 'wed', present: 8, absent: 4 },
  { day: 'thu', present: 10, absent: 2 },
  { day: 'fri', present: 0, absent: 0 }
]

const maxAttendanceTotal = computed(() =>
  Math.max(...mockWeeklyAttendance.map(d => d.present + d.absent), 1)
)

const mockTopPerformers = [
  { rank: 1, name: 'عبدالله أحمد', halaqa: 'حلقة الفجر', pages: 14, badge: 'i-lucide-crown' },
  { rank: 2, name: 'يوسف محمد', halaqa: 'حلقة الظهر', pages: 11, badge: 'i-lucide-medal' },
  { rank: 3, name: 'عمر خالد', halaqa: 'حلقة الفجر', pages: 9, badge: 'i-lucide-medal' },
  { rank: 4, name: 'أنس سعيد', halaqa: 'حلقة العصر', pages: 7, badge: 'i-lucide-award' },
  { rank: 5, name: 'حمزة علي', halaqa: 'حلقة الظهر', pages: 6, badge: 'i-lucide-award' }
]

const mockRecentActivity = [
  { icon: 'i-lucide-book-open-check', text: t('pages.home.recentActivity.completedSurah', { student: 'عبدالله أحمد', surah: 'الملك' }), time: t('pages.home.recentActivity.timeAgo.minutes', { count: 30 }), color: 'var(--color-status-ok)' },
  { icon: 'i-lucide-clipboard-check', text: t('pages.home.recentActivity.attendanceRecorded', { halaqa: 'حلقة الفجر' }), time: t('pages.home.recentActivity.timeAgo.hours', { count: 2 }), color: 'var(--color-primary)' },
  { icon: 'i-lucide-star', text: t('pages.home.recentActivity.achievementLogged', { student: 'يوسف محمد' }), time: t('pages.home.recentActivity.timeAgo.hours', { count: 3 }), color: 'var(--color-secondary)' },
  { icon: 'i-lucide-user-plus', text: t('pages.home.recentActivity.newStudent', { student: 'حمزة علي' }), time: t('pages.home.recentActivity.timeAgo.days', { count: 1 }), color: 'var(--color-status-info)' },
  { icon: 'i-lucide-calendar-check', text: t('pages.home.recentActivity.planApproved', { halaqa: 'حلقة الظهر' }), time: t('pages.home.recentActivity.timeAgo.days', { count: 1 }), color: 'var(--color-track-hifz)' }
]

const mockAbsenceAlerts = [
  { name: 'سعد إبراهيم', halaqa: 'حلقة الفجر', missedCount: 3 },
  { name: 'طارق حسين', halaqa: 'حلقة الظهر', missedCount: 2 }
]

// Sparkline helper
function sparklinePath(data: number[], width = 80, height = 24): string {
  if (!data.length) return ''
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  return data.map((v, i) => {
    const x = i * step
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${i === 0 ? 'M' : 'L'}${x},${y}`
  }).join(' ')
}

// Quick actions
const quickActions = computed(() => [
  {
    label: t('nav.attendance'),
    description: t('pages.home.quickActions.attendance'),
    icon: 'i-lucide-clipboard-check',
    href: '/attendance',
    color: 'var(--color-track-hifz)',
    bg: 'var(--color-track-hifz-bg)'
  },
  {
    label: t('nav.students'),
    description: t('pages.home.quickActions.students'),
    icon: 'i-lucide-users',
    href: '/students',
    color: 'var(--color-primary)',
    bg: 'var(--color-primary-container)'
  },
  {
    label: t('nav.achievements'),
    description: t('pages.home.quickActions.achievements'),
    icon: 'i-lucide-star',
    href: '/achievements',
    color: 'var(--color-status-warning)',
    bg: 'var(--color-status-warning-bg)'
  },
  {
    label: t('nav.analytics'),
    description: t('pages.home.quickActions.analytics'),
    icon: 'i-lucide-bar-chart-3',
    href: '/analytics',
    color: 'var(--color-status-overdue)',
    bg: 'var(--color-status-overdue-bg)'
  }
])

async function loadDashboard(halaqaId: number) {
  isLoading.value = true
  attendanceError.value = false
  try {
    await fetchStudents(halaqaId)
    try {
      todayAttendance.value = await api<any[]>(`/attendance?halaqaId=${halaqaId}&date=${today}`)
    } catch {
      attendanceError.value = true
    }
  } finally {
    isLoading.value = false
  }
}

watch(selectedHalaqaId, async (newId) => {
  if (newId) await loadDashboard(newId)
})

onMounted(async () => {
  await initializeHalaqa()
  if (selectedHalaqaId.value) {
    await loadDashboard(selectedHalaqaId.value)
  } else {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Page header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="space-y-1">
        <span class="text-xs font-bold uppercase tracking-widest" style="color: var(--color-primary);">
          {{ formattedToday }}
        </span>
        <h2 class="text-3xl font-bold leading-tight" style="color: var(--color-on-surface);">
          {{ $t('pages.home.greeting', { name: user?.name || $t('pages.home.greetingFallback') }) }}
        </h2>
        <p class="text-sm" style="color: var(--color-on-surface-variant);">
          {{ $t('pages.home.subtitle') }}
        </p>
      </div>
      <div
        class="flex items-center gap-2 px-4 py-2 rounded-xl shrink-0"
        style="background-color: var(--color-primary-container);">
        <LucideShieldCheck class="w-4 h-4" style="color: var(--color-primary);" />
        <span class="text-sm font-semibold" style="color: var(--color-primary);">
          {{ $t(`roles.${userRoleLabel}`) }}
        </span>
      </div>
    </div>

    <SchoolSummaryCard />

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-16">
      <LucideLoaderCircle class="w-10 h-10 animate-spin" style="color: var(--color-primary);" />
    </div>

    <template v-else>
      <!-- Stats row -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Total Students -->
        <div
          class="rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden ring ring-card-border"
          style="background-color: var(--color-surface-container-lowest);">
          <div class="flex items-start justify-between">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background-color: var(--color-primary-container);">
              <LucideUsers class="w-5 h-5" style="color: var(--color-primary);" />
            </div>
            <svg width="80" height="24" class="opacity-60">
              <path
                :d="sparklinePath(mockStatTrends.students)"
                fill="none"
                stroke="var(--color-primary)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </div>
          <div>
            <p class="font-bold" style="font-size: 32px; line-height: 1; color: var(--color-on-surface);">
              {{ students.length }}
            </p>
            <p class="font-semibold mt-1.5" style="font-size: 13px; color: var(--color-on-surface-variant);">
              {{ $t('pages.home.stats.totalStudents') }}
            </p>
          </div>
          <div v-if="mockStatChanges.students.value !== 0" class="flex items-center gap-1">
            <span
              class="text-xs font-bold px-1.5 py-0.5 rounded-md"
              :style="mockStatChanges.students.direction === 'up'
                ? 'color: var(--color-status-ok); background-color: var(--color-status-ok-bg);'
                : 'color: var(--color-error); background-color: var(--color-status-conflict-bg);'">
              {{ mockStatChanges.students.direction === 'up' ? '↑' : '↓' }} {{ Math.abs(mockStatChanges.students.value) }}%
            </span>
            <span class="text-[11px]" style="color: var(--color-on-surface-variant);">
              {{ $t('pages.home.stats.vsLastWeek') }}
            </span>
          </div>
        </div>

        <!-- Active Halaqat -->
        <div
          class="rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden ring ring-card-border"
          style="background-color: var(--color-surface-container-lowest);">
          <div class="flex items-start justify-between">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background-color: var(--color-track-hifz-bg);">
              <LucideLayoutGrid class="w-5 h-5" style="color: var(--color-secondary);" />
            </div>
            <svg width="80" height="24" class="opacity-60">
              <path
                :d="sparklinePath(mockStatTrends.halaqat)"
                fill="none"
                stroke="var(--color-secondary)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </div>
          <div>
            <p class="font-bold" style="font-size: 32px; line-height: 1; color: var(--color-on-surface);">
              {{ halaqat.length }}
            </p>
            <p class="font-semibold mt-1.5" style="font-size: 13px; color: var(--color-on-surface-variant);">
              {{ $t('pages.home.stats.activeHalaqat') }}
            </p>
          </div>
          <div class="h-5" />
        </div>

        <!-- Attendance Today -->
        <div
          class="rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden ring ring-card-border"
          style="background-color: var(--color-surface-container-lowest);">
          <div class="flex items-start justify-between">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background-color: var(--color-status-conflict-bg);">
              <LucideUserCheck class="w-5 h-5" style="color: var(--color-status-conflict);" />
            </div>
            <svg width="80" height="24" class="opacity-60">
              <path
                :d="sparklinePath(mockStatTrends.attendance)"
                fill="none"
                stroke="var(--color-status-conflict)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </div>
          <div>
            <p class="font-bold" style="font-size: 32px; line-height: 1; color: var(--color-on-surface);">
              {{ attendanceError ? '—' : todayAttendance.length > 0 ? `${attendanceRate}%` : '—' }}
            </p>
            <p class="font-semibold mt-1.5" style="font-size: 13px; color: var(--color-on-surface-variant);">
              {{ attendanceError
                ? $t('pages.home.stats.loadFailed')
                : todayAttendance.length > 0
                  ? $t('pages.home.stats.attendanceCount', { present: presentToday, total: todayAttendance.length })
                  : $t('pages.home.stats.attendanceToday') }}
            </p>
          </div>
          <div v-if="mockStatChanges.attendance.value !== 0" class="flex items-center gap-1">
            <span
              class="text-xs font-bold px-1.5 py-0.5 rounded-md"
              :style="mockStatChanges.attendance.direction === 'up'
                ? 'color: var(--color-status-ok); background-color: var(--color-status-ok-bg);'
                : 'color: var(--color-error); background-color: var(--color-status-conflict-bg);'">
              {{ mockStatChanges.attendance.direction === 'up' ? '↑' : '↓' }} {{ Math.abs(mockStatChanges.attendance.value) }}%
            </span>
            <span class="text-[11px]" style="color: var(--color-on-surface-variant);">
              {{ $t('pages.home.stats.vsLastWeek') }}
            </span>
          </div>
        </div>

        <!-- Current Day -->
        <div
          class="rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden ring ring-card-border"
          style="background-color: var(--color-surface-container-lowest);">
          <div class="flex items-start justify-between">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background-color: var(--color-status-ok-bg);">
              <LucideCalendarCheck class="w-5 h-5" style="color: var(--color-status-ok);" />
            </div>
          </div>
          <div>
            <p class="font-bold" style="font-size: 26px; line-height: 1.2; color: var(--color-on-surface);">
              {{ currentWeekday }}
            </p>
            <p class="font-semibold mt-1.5" style="font-size: 13px; color: var(--color-on-surface-variant);">
              {{ $t('pages.home.stats.currentDay') }}
            </p>
          </div>
          <div class="h-5" />
        </div>

        <!-- Pending Reviews (NEW) -->
        <div
          class="rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden ring ring-card-border"
          style="background-color: var(--color-surface-container-lowest);">
          <div class="flex items-start justify-between">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background-color: var(--color-status-warning-bg);">
              <LucideClock4 class="w-5 h-5" style="color: var(--color-status-warning);" />
            </div>
            <svg width="80" height="24" class="opacity-60">
              <path
                :d="sparklinePath(mockStatTrends.reviews)"
                fill="none"
                stroke="var(--color-status-warning)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </div>
          <div>
            <p class="font-bold" style="font-size: 32px; line-height: 1; color: var(--color-on-surface);">
              3
            </p>
            <p class="font-semibold mt-1.5" style="font-size: 13px; color: var(--color-on-surface-variant);">
              {{ $t('pages.home.stats.pendingReviews') }}
            </p>
          </div>
          <div v-if="mockStatChanges.reviews.value !== 0" class="flex items-center gap-1">
            <span
              class="text-xs font-bold px-1.5 py-0.5 rounded-md"
              :style="mockStatChanges.reviews.direction === 'down'
                ? 'color: var(--color-status-ok); background-color: var(--color-status-ok-bg);'
                : 'color: var(--color-error); background-color: var(--color-status-conflict-bg);'">
              {{ mockStatChanges.reviews.direction === 'down' ? '↓' : '↑' }} {{ Math.abs(mockStatChanges.reviews.value) }}%
            </span>
            <span class="text-[11px]" style="color: var(--color-on-surface-variant);">
              {{ $t('pages.home.stats.vsLastWeek') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Two-column layout: Schedule + Attendance Chart -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Today's Schedule -->
        <div
          class="rounded-2xl p-6 ring ring-card-border"
          style="background-color: var(--color-surface-container-lowest);">
          <div class="flex items-center gap-2 mb-5">
            <LucideCalendarClock class="w-5 h-5" style="color: var(--color-primary);" />
            <h3 class="text-base font-semibold" style="color: var(--color-on-surface);">
              {{ $t('pages.home.schedule.title') }}
            </h3>
          </div>
          <div class="flex flex-col gap-3">
            <div
              v-for="session in mockSchedule"
              :key="session.id"
              class="flex items-center gap-4 p-4 rounded-xl"
              style="background-color: var(--color-surface-container-low); border: 1px solid var(--color-card-border);">
              <div
                class="w-1 self-stretch rounded-full shrink-0"
                style="background-color: var(--color-primary);" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold" style="color: var(--color-on-surface);">
                  {{ session.name }}
                </p>
                <p class="text-xs mt-1" style="color: var(--color-on-surface-variant);">
                  {{ session.teacher }}
                </p>
              </div>
              <div class="text-end shrink-0">
                <p class="text-sm font-semibold tabular-nums" style="color: var(--color-primary);">
                  {{ session.time }}
                </p>
                <p class="text-xs mt-1" style="color: var(--color-on-surface-variant);">
                  {{ session.studentCount }} {{ $t('pages.home.schedule.students') }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Weekly Attendance Chart -->
        <div
          class="rounded-2xl p-6 ring ring-card-border"
          style="background-color: var(--color-surface-container-lowest);">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-2">
              <LucideBarChart3 class="w-5 h-5" style="color: var(--color-primary);" />
              <h3 class="text-base font-semibold" style="color: var(--color-on-surface);">
                {{ $t('pages.home.weeklyAttendance.title') }}
              </h3>
            </div>
            <div class="flex items-center gap-4 text-xs">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-sm" style="background-color: var(--color-status-ok);" />
                <span style="color: var(--color-on-surface-variant);">{{ $t('pages.home.weeklyAttendance.present') }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-sm" style="background-color: var(--color-error);" />
                <span style="color: var(--color-on-surface-variant);">{{ $t('pages.home.weeklyAttendance.absent') }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-end justify-between gap-2" style="height: 160px;">
            <div
              v-for="day in mockWeeklyAttendance"
              :key="day.day"
              class="flex flex-col items-center gap-2 flex-1">
              <div class="flex flex-col w-full items-center" style="height: 130px; justify-content: flex-end;">
                <div
                  class="w-full max-w-[32px] rounded-t-md"
                  :style="{
                    height: `${((day.absent) / maxAttendanceTotal) * 120}px`,
                    backgroundColor: 'var(--color-error)',
                    opacity: day.absent > 0 ? 1 : 0.2,
                    minHeight: day.absent > 0 ? '4px' : '0px'
                  }" />
                <div
                  class="w-full max-w-[32px] rounded-b-md"
                  :style="{
                    height: `${((day.present) / maxAttendanceTotal) * 120}px`,
                    backgroundColor: 'var(--color-status-ok)',
                    opacity: day.present > 0 ? 1 : 0.2,
                    minHeight: day.present > 0 ? '4px' : '0px'
                  }" />
              </div>
              <span class="text-[11px] font-semibold" style="color: var(--color-on-surface-variant);">
                {{ $t(`pages.home.days.${day.day}`) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Two-column layout: Top Performers + Absence Alerts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Top Performers -->
        <div
          class="rounded-2xl p-6 ring ring-card-border"
          style="background-color: var(--color-surface-container-lowest);">
          <div class="flex items-center gap-2 mb-5">
            <LucideTrophy class="w-5 h-5" style="color: var(--color-secondary);" />
            <h3 class="text-base font-semibold" style="color: var(--color-on-surface);">
              {{ $t('pages.home.topPerformers.title') }}
            </h3>
          </div>
          <div class="flex flex-col gap-2">
            <div
              v-for="performer in mockTopPerformers"
              :key="performer.rank"
              class="flex items-center gap-3 p-3 rounded-xl"
              :style="performer.rank <= 3
                ? 'background-color: var(--color-surface-container-low); border: 1px solid var(--color-card-border);'
                : ''">
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                :style="performer.rank === 1
                  ? 'background-color: var(--color-rank-gold-bg); color: var(--color-rank-gold);'
                  : performer.rank === 2
                    ? 'background-color: var(--color-rank-silver-bg); color: var(--color-rank-silver);'
                    : performer.rank === 3
                      ? 'background-color: var(--color-rank-bronze-bg); color: var(--color-rank-bronze);'
                      : 'background-color: var(--color-surface-container); color: var(--color-on-surface-variant);'">
                <UIcon v-if="performer.rank <= 3" :name="performer.badge" class="w-4 h-4" />
                <span v-else class="text-xs font-bold">{{ performer.rank }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold truncate" style="color: var(--color-on-surface);">
                  {{ performer.name }}
                </p>
                <p class="text-xs" style="color: var(--color-on-surface-variant);">
                  {{ performer.halaqa }}
                </p>
              </div>
              <div class="shrink-0 text-end">
                <span class="text-sm font-bold tabular-nums" style="color: var(--color-primary);">
                  {{ performer.pages }}
                </span>
                <span class="text-xs ms-0.5" style="color: var(--color-on-surface-variant);">
                  {{ $t('pages.home.topPerformers.pages') }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Absence Alerts -->
        <div
          class="rounded-2xl p-6 ring ring-card-border"
          style="background-color: var(--color-surface-container-lowest);">
          <div class="flex items-center gap-2 mb-5">
            <LucideAlertTriangle class="w-5 h-5" style="color: var(--color-status-warning);" />
            <h3 class="text-base font-semibold" style="color: var(--color-on-surface);">
              {{ $t('pages.home.absenceAlerts.title') }}
            </h3>
          </div>
          <div class="flex flex-col gap-3">
            <div
              v-for="alert in mockAbsenceAlerts"
              :key="alert.name"
              class="flex items-center gap-4 p-4 rounded-xl"
              style="background-color: var(--color-status-warning-bg); border: 1px solid var(--color-status-warning-light);">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style="background-color: var(--color-status-warning-light);">
                <LucideUserX class="w-5 h-5" style="color: var(--color-status-warning);" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold" style="color: var(--color-on-surface);">
                  {{ alert.name }}
                </p>
                <p class="text-xs mt-0.5" style="color: var(--color-on-surface-variant);">
                  {{ alert.halaqa }} · {{ $t('pages.home.absenceAlerts.missedSessions', { count: alert.missedCount }) }}
                </p>
              </div>
              <UButton
                variant="soft"
                size="xs"
                class="shrink-0"
                style="color: var(--color-status-warning);">
                {{ $t('pages.home.absenceAlerts.contactParent') }}
              </UButton>
            </div>
            <div
              v-if="mockAbsenceAlerts.length === 0"
              class="text-center py-8">
              <LucideCheckCircle class="w-8 h-8 mx-auto mb-2" style="color: var(--color-status-ok);" />
              <p class="text-sm" style="color: var(--color-on-surface-variant);">
                {{ $t('pages.home.absenceAlerts.noAlerts') }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity Feed -->
      <div
        class="rounded-2xl p-6 ring ring-card-border"
        style="background-color: var(--color-surface-container-lowest);">
        <div class="flex items-center gap-2 mb-5">
          <LucideActivity class="w-5 h-5" style="color: var(--color-primary);" />
          <h3 class="text-base font-semibold" style="color: var(--color-on-surface);">
            {{ $t('pages.home.recentActivity.title') }}
          </h3>
        </div>
        <div class="flex flex-col">
          <div
            v-for="(activity, idx) in mockRecentActivity"
            :key="idx"
            class="flex items-start gap-4 py-3"
            :style="idx < mockRecentActivity.length - 1 ? 'border-bottom: 1px solid var(--color-card-border);' : ''">
            <div
              class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              :style="`background-color: color-mix(in srgb, ${activity.color} 15%, transparent);`">
              <UIcon :name="activity.icon" class="w-4.5 h-4.5" :style="`color: ${activity.color};`" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm leading-relaxed" style="color: var(--color-on-surface);">
                {{ activity.text }}
              </p>
            </div>
            <span class="text-xs shrink-0 pt-0.5" style="color: var(--color-on-surface-variant);">
              {{ activity.time }}
            </span>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div>
        <div class="flex items-center gap-2 mb-4">
          <h3 class="text-base font-semibold" style="color: var(--color-on-surface);">
            {{ $t('pages.home.quickAccess') }}
          </h3>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <UButton
            v-for="action in quickActions"
            :key="action.href"
            variant="ghost"
            color="neutral"
            class="rounded-2xl p-5 text-start flex flex-col items-start gap-3 bg-surface-container-lowest ring-1 ring-card-border"
            @click="navigateTo(action.href)">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center"
              :style="`background-color: ${action.bg};`">
              <UIcon :name="action.icon" class="w-5 h-5" :style="`color: ${action.color};`" />
            </div>
            <div>
              <p class="text-sm font-semibold" style="color: var(--color-on-surface);">
                {{ action.label }}
              </p>
              <p class="label-sm mt-0.5" style="color: var(--color-on-surface-variant);">
                {{ action.description }}
              </p>
            </div>
          </UButton>
        </div>
      </div>

      <!-- Empty state for new users -->
      <div v-if="students.length === 0 || true" class="flex flex-col items-center gap-4 py-16 rounded-2xl ring-1 ring-card-border">
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary-container">
          <LucideBookOpenText class="w-8 h-8 text-primary" />
        </div>
        <h3 class="text-base font-semibold" style="color: var(--color-on-surface);">
          {{ $t('pages.home.welcome.title') }}
        </h3>
        <p class="body-sm text-center max-w-xs" style="color: var(--color-on-surface-variant);">
          {{ $t('pages.home.welcome.message') }}
        </p>
      </div>
    </template>
  </div>
</template>
