<script setup lang="ts">
import type { Student, StudentAttendanceEntry } from '~/types'

const props = defineProps<{ student: Student }>()
const { t, locale } = useI18n()
const { studentAchievements, studentAttendance, studentWeeklyPlan } = useStudents()

const dateFormatter = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' })
)

const recentAchievements = computed(() => studentAchievements.value[props.student.id] ?? [])
const recentAttendance = computed(() => studentAttendance.value[props.student.id] ?? [])
const weeklyPlan = computed(() => studentWeeklyPlan.value[props.student.id] ?? null)

const trackLabels = computed(() => ({
  Hifz: t('pages.students.viewModal.activity.trackHifz'),
  Near: t('pages.students.viewModal.activity.trackNear'),
  Far: t('pages.students.viewModal.activity.trackFar')
}))

const attendanceLabels = computed(() => ({
  Present: t('pages.students.viewModal.activity.attendancePresent'),
  Late: t('pages.students.viewModal.activity.attendanceLate'),
  Absent: t('pages.students.viewModal.activity.attendanceAbsent'),
  Excused: t('pages.students.viewModal.activity.attendanceExcused')
}))

function attendanceTileClass(status: StudentAttendanceEntry['status']) {
  if (status === 'Present') return 'bg-status-ok text-white'
  if (status === 'Late') return 'bg-status-warning text-white'
  if (status === 'Absent') return 'bg-status-conflict text-white'
  return 'bg-status-info text-white'
}

function formatDateOnly(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateFormatter.value.format(d)
}

function formatAttendanceTitle(entry: StudentAttendanceEntry) {
  return `${formatDateOnly(entry.date)} — ${attendanceLabels.value[entry.status]}`
}

function dayNumber(iso: string) {
  return new Date(iso).getDate()
}

function clampPercent(n: number) {
  return Math.min(Math.max(n, 0), 100)
}
</script>

<template>
  <div class="flex flex-col gap-6 pt-6">
    <!-- Recent achievements -->
    <div class="rounded-xl p-5 border border-outline-variant">
      <h4 class="body-lg font-bold mb-4 flex items-center gap-2 text-on-surface">
        <LucideAward class="w-5 h-5 text-secondary" />
        {{ $t('pages.students.viewModal.activity.recentAchievementsTitle') }}
      </h4>
      <div
        v-if="recentAchievements.length === 0"
        class="text-center py-6 body-md text-on-surface-variant"
      >
        {{ $t('pages.students.viewModal.activity.noAchievements') }}
      </div>
      <ul v-else class="space-y-3">
        <li
          v-for="ach in recentAchievements"
          :key="ach.id"
          class="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low"
        >
          <UBadge
            :color="ach.trackType === 'Hifz' ? 'primary' : ach.trackType === 'Near' ? 'info' : 'warning'"
            variant="subtle"
            size="sm"
            :label="trackLabels[ach.trackType]"
          />
          <div class="flex-1 min-w-0">
            <div class="body-md font-medium text-on-surface truncate">
              {{ ach.startSurah }} {{ ach.startVerse }}–{{ ach.endVerse }}
            </div>
            <div class="label-md text-muted">
              {{ formatDateOnly(ach.date) }}
            </div>
          </div>
          <div class="flex flex-col items-end shrink-0 gap-1">
            <span class="text-lg font-bold text-on-surface">{{ ach.score }}%</span>
            <UBadge
              :color="ach.status === 'approved' ? 'success' : 'neutral'"
              variant="subtle"
              size="xs"
              :label="ach.status === 'approved'
                ? $t('pages.students.viewModal.activity.approved')
                : $t('pages.students.viewModal.activity.unapproved')"
            />
          </div>
        </li>
      </ul>
    </div>

    <!-- Recent attendance strip -->
    <div class="rounded-xl p-5 border border-outline-variant">
      <h4 class="body-lg font-bold mb-4 flex items-center gap-2 text-on-surface">
        <LucideCalendarCheck class="w-5 h-5 text-secondary" />
        {{ $t('pages.students.viewModal.activity.recentAttendanceTitle') }}
      </h4>
      <div
        v-if="recentAttendance.length === 0"
        class="text-center py-6 body-md text-on-surface-variant"
      >
        {{ $t('pages.students.viewModal.activity.noAttendance') }}
      </div>
      <div v-else class="flex flex-wrap gap-1.5">
        <div
          v-for="entry in recentAttendance"
          :key="entry.id"
          :title="formatAttendanceTitle(entry)"
          class="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
          :class="attendanceTileClass(entry.status)"
        >
          {{ dayNumber(entry.date) }}
        </div>
      </div>
      <div v-if="recentAttendance.length > 0" class="flex flex-wrap gap-x-4 gap-y-1 mt-4 label-md text-on-surface-variant">
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded bg-status-ok" />
          {{ $t('pages.students.viewModal.activity.attendancePresent') }}
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded bg-status-warning" />
          {{ $t('pages.students.viewModal.activity.attendanceLate') }}
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded bg-status-conflict" />
          {{ $t('pages.students.viewModal.activity.attendanceAbsent') }}
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded bg-status-info" />
          {{ $t('pages.students.viewModal.activity.attendanceExcused') }}
        </div>
      </div>
    </div>

    <!-- Weekly plan progress -->
    <div class="rounded-xl p-5 border border-outline-variant">
      <h4 class="body-lg font-bold mb-4 flex items-center gap-2 text-on-surface">
        <LucideListChecks class="w-5 h-5 text-secondary" />
        {{ $t('pages.students.viewModal.activity.weeklyPlanTitle') }}
      </h4>
      <div
        v-if="!weeklyPlan"
        class="text-center py-6 body-md text-on-surface-variant"
      >
        {{ $t('pages.students.viewModal.activity.noWeeklyPlan') }}
      </div>
      <template v-else>
        <p class="label-md text-on-surface-variant mb-4">
          {{ $t('pages.students.viewModal.activity.weekStarting', { date: formatDateOnly(weeklyPlan.weekStartDate) }) }}
        </p>
        <div class="flex justify-between items-center mb-2">
          <span class="body-md text-on-surface">
            {{ $t('pages.students.viewModal.activity.weeklyPlanCoverage', {
              achieved: weeklyPlan.totalAchieved,
              planned: weeklyPlan.totalPlanned,
              percent: weeklyPlan.coveragePercent
            }) }}
          </span>
          <span class="text-2xl font-bold text-primary">{{ weeklyPlan.coveragePercent }}%</span>
        </div>
        <div class="w-full h-2.5 rounded-full overflow-hidden bg-primary-container">
          <div
            class="h-full bg-primary transition-all duration-300"
            :style="{ width: `${clampPercent(weeklyPlan.coveragePercent)}%` }"
          />
        </div>
      </template>
    </div>
  </div>
</template>
