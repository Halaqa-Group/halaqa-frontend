<script setup lang="ts">
import type { ApiDashboardAlerts } from '~/types'

/**
 * Actionable oversight cards (`GET /dashboard/alerts`).
 *
 * Three independent lists, each rendered only when it has rows:
 *  • stalled_students        — no approved achievement in `stalled_days` days
 *  • halaqat_without_teacher — active halaqa with no active main teacher
 *  • high_absence_teachers   — staff commitment; the API returns this EMPTY for
 *                              the teacher role, so no client-side gate is
 *                              needed, and adding one would be a second source
 *                              of truth for the same rule.
 *
 * `stalled_days` is read back off the response rather than from the request:
 * the server clamps it to 1..90, so the label always states the window that was
 * actually applied.
 */

const props = defineProps<{
  data: ApiDashboardAlerts | null
  loading?: boolean
  error?: string | null
}>()

/** The requested staleness window; the applied one is read back off `data`. */
const stalledDays = defineModel<number>('stalledDays', { default: 7 })

const { t } = useI18n()

const STALE_WINDOWS = [7, 14, 30]

const staleItems = computed(() =>
  STALE_WINDOWS.map(days => ({ label: t('pages.home.alerts.staleWindow', { days }), value: days }))
)

const totalAlerts = computed(() => {
  const d = props.data
  if (!d) return 0
  return d.stalled_students.length + d.halaqat_without_teacher.length + d.high_absence_teachers.length
})

/** "12 days ago", or "never" when the student has no approved achievement at all. */
function staleLabel(daysSince: number | null): string {
  return daysSince === null
    ? t('pages.home.alerts.never')
    : t('pages.home.alerts.daysSince', { days: daysSince })
}
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-bell-ring" class="size-5 text-status-warning" />
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('pages.home.alerts.title') }}
          </h3>
          <UBadge
            v-if="totalAlerts > 0"
            color="warning"
            variant="subtle"
            size="sm"
            :label="String(totalAlerts)"
          />
        </div>

        <USelect
          v-model="stalledDays"
          :items="staleItems"
          value-key="value"
          size="sm"
          class="w-44"
          :aria-label="t('pages.home.alerts.staleWindowLabel')"
        />
      </div>
    </template>

    <div v-if="loading" class="flex items-center justify-center py-14">
      <UIcon name="i-lucide-loader-circle" class="size-7 animate-spin text-primary" />
    </div>

    <div v-else-if="error" class="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <UIcon name="i-lucide-triangle-alert" class="size-7 text-error" />
      <p class="text-sm text-error">
        {{ error }}
      </p>
    </div>

    <div v-else-if="totalAlerts === 0" class="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <UIcon name="i-lucide-circle-check" class="size-8 text-status-ok" />
      <p class="text-sm text-on-surface-variant">
        {{ t('pages.home.alerts.empty') }}
      </p>
    </div>

    <div v-else class="flex flex-col divide-y divide-card-border">
      <!-- Stalled students -->
      <section v-if="data && data.stalled_students.length > 0" class="p-4">
        <div class="mb-3 flex items-center gap-2">
          <UIcon name="i-lucide-user-x" class="size-4 text-status-warning" />
          <h4 class="text-sm font-semibold text-on-surface">
            {{ t('pages.home.alerts.stalled.title', { days: data.stalled_days }) }}
          </h4>
          <UBadge color="warning" variant="subtle" size="sm" :label="String(data.stalled_students.length)" />
        </div>
        <ul class="flex flex-col gap-2">
          <li
            v-for="student in data.stalled_students"
            :key="student.student_id"
            class="flex items-center gap-3 rounded-xl bg-status-warning-bg px-3 py-2.5"
          >
            <div class="min-w-0 flex-1">
              <NuxtLink
                :to="`/students/${student.student_id}`"
                class="block truncate text-sm font-medium text-on-surface hover:text-primary"
              >
                {{ student.student_name }}
              </NuxtLink>
              <p class="mt-0.5 text-xs text-on-surface-variant">
                {{ staleLabel(student.days_since) }}
              </p>
            </div>
            <UButton
              :to="`/achievements?studentId=${student.student_id}`"
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-book-open"
              :aria-label="t('pages.home.alerts.stalled.action')"
              class="shrink-0"
            />
          </li>
        </ul>
      </section>

      <!-- Halaqat with no active main teacher -->
      <section v-if="data && data.halaqat_without_teacher.length > 0" class="p-4">
        <div class="mb-3 flex items-center gap-2">
          <UIcon name="i-lucide-user-round-x" class="size-4 text-status-conflict" />
          <h4 class="text-sm font-semibold text-on-surface">
            {{ t('pages.home.alerts.noTeacher.title') }}
          </h4>
          <UBadge color="error" variant="subtle" size="sm" :label="String(data.halaqat_without_teacher.length)" />
        </div>
        <ul class="flex flex-wrap gap-2">
          <li v-for="halaqa in data.halaqat_without_teacher" :key="halaqa.halaqa_id">
            <NuxtLink
              :to="`/halaqat/${halaqa.halaqa_id}`"
              class="inline-flex items-center gap-2 rounded-xl bg-status-conflict-bg px-3 py-2 text-sm font-medium text-on-surface hover:text-primary"
            >
              <UIcon name="i-lucide-building-2" class="size-4 text-status-conflict" />
              {{ halaqa.halaqa_name }}
            </NuxtLink>
          </li>
        </ul>
      </section>

      <!-- Staff commitment — absent for the teacher role by design -->
      <section v-if="data && data.high_absence_teachers.length > 0" class="p-4">
        <div class="mb-3 flex items-center gap-2">
          <UIcon name="i-lucide-calendar-x" class="size-4 text-status-overdue" />
          <h4 class="text-sm font-semibold text-on-surface">
            {{ t('pages.home.alerts.highAbsence.title') }}
          </h4>
          <UBadge color="neutral" variant="subtle" size="sm" :label="String(data.high_absence_teachers.length)" />
        </div>
        <ul class="flex flex-col gap-2">
          <li
            v-for="teacher in data.high_absence_teachers"
            :key="teacher.teacher_id"
            class="flex items-center gap-3 rounded-xl bg-status-overdue-bg px-3 py-2.5"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-on-surface">
                {{ teacher.teacher_name }}
              </p>
              <p class="mt-0.5 text-xs text-on-surface-variant">
                {{ t('pages.home.alerts.highAbsence.detail', {
                  days: teacher.absent_days,
                  rate: Math.round(teacher.attendance_rate * 100)
                }) }}
              </p>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </UCard>
</template>
