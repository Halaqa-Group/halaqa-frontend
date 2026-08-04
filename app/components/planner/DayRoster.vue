<script setup lang="ts">
import type { DayRosterRow } from '~/composables/useWeeklyPlan'
import type { ApiWeeklyPlanItem } from '~/types'
import { SURAH_NAMES } from '~/data/constants'
import { formatVerseRange } from '~/utils/quran'
import { TRACK_BADGE_COLOR, achievementStatusColor, type AchievementTrack } from '~/utils/achievement'
import { planItemStatusColor } from '~/utils/plan'

const { t, locale } = useI18n()
const { selectedHalaqaId } = useGlobalHalaqa()
const {
  students, selectedDate, dayRoster, dayLoading, isTodaySelected,
  selectedStudentId, viewMode, loadDayRoster, prevDay, nextDay, goToday
} = useWeeklyPlan()

// Self-loading: rebuild whenever the halaqa, the roster date, or the student list
// changes (students land asynchronously after a halaqa switch).
watch(
  [selectedHalaqaId, selectedDate, () => students.value.length],
  () => { void loadDayRoster() },
  { immediate: true }
)

const dateLabel = computed(() => {
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  if (!y || !m || !d) return selectedDate.value
  try {
    return new Date(y, m - 1, d).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : locale.value, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
  } catch {
    return selectedDate.value
  }
})

function range(it: ApiWeeklyPlanItem) {
  return formatVerseRange(it.start_surah, it.start_verse, it.end_surah, it.end_verse, SURAH_NAMES)
}

// Jump straight into a student's full week in the matrix editor.
function openStudent(row: DayRosterRow) {
  selectedStudentId.value = row.student.id
  viewMode.value = 'matrix'
}

// Roster-level rollup across all students for the day.
const totals = computed(() => {
  let planned = 0
  let achieved = 0
  let withPlan = 0
  for (const row of dayRoster.value) {
    planned += row.totalPlanned
    achieved += row.totalAchieved
    if (row.items.length) withPlan++
  }
  return {
    planned,
    achieved,
    withPlan,
    coverage: planned > 0 ? Math.round((achieved / planned) * 100) : 0
  }
})
</script>

<template>
  <div class="flex flex-col gap-4 p-4 sm:p-6">
    <!-- Date navigator + day rollup -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-1">
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-chevron-right"
          square
          :aria-label="t('pages.planner.day.prevDay')"
          @click="prevDay"
        />
        <div class="flex flex-col items-center min-w-44 px-2">
          <span class="text-sm font-semibold">{{ dateLabel }}</span>
          <UButton
            v-if="!isTodaySelected"
            variant="link"
            color="primary"
            size="xs"
            class="p-0 h-auto"
            @click="goToday"
          >
            {{ t('pages.planner.day.backToToday') }}
          </UButton>
          <span v-else class="text-xs text-muted">{{ t('pages.planner.day.today') }}</span>
        </div>
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-chevron-left"
          square
          :aria-label="t('pages.planner.day.nextDay')"
          @click="nextDay"
        />
      </div>

      <div class="flex items-center gap-2">
        <UBadge color="neutral" variant="subtle">
          {{ t('pages.planner.day.studentsWithPlan', { withPlan: totals.withPlan, total: dayRoster.length }) }}
        </UBadge>
        <UBadge v-if="totals.planned > 0" color="primary" variant="subtle">
          {{ t('pages.planner.coverage', { achieved: totals.achieved, total: totals.planned, percent: totals.coverage }) }}
        </UBadge>
      </div>
    </div>

    <div v-if="dayLoading && dayRoster.length === 0" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div v-else-if="dayRoster.length === 0" class="flex flex-col items-center justify-center gap-3 py-14">
      <UIcon name="i-lucide-users" class="w-10 h-10 text-muted" />
      <p class="text-sm text-muted">
        {{ t('pages.planner.day.noStudents') }}
      </p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <button
        v-for="row in dayRoster"
        :key="row.student.id"
        type="button"
        class="text-start rounded-xl border border-default bg-default p-4 flex flex-col gap-3 transition-colors hover:border-primary hover:bg-elevated/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @click="openStudent(row)"
      >
        <!-- Student header -->
        <div class="flex items-center gap-3">
          <UAvatar :src="row.student.avatar" :alt="row.student.name" size="md" />
          <span class="font-semibold flex-1 truncate">{{ row.student.name }}</span>
          <UBadge
            v-if="row.hasPlan"
            variant="subtle"
            size="sm"
            :color="achievementStatusColor(row.planStatus === 'approved' ? 'approved' : 'unapproved')"
          >
            {{ row.planStatus === 'approved' ? t('pages.planner.approved') : t('pages.planner.draft') }}
          </UBadge>
        </div>

        <!-- No plan / rest day -->
        <div
          v-if="row.items.length === 0"
          class="flex items-center gap-2 text-sm text-muted border-t border-default pt-3"
        >
          <UIcon
            :name="row.hasPlan ? 'i-lucide-moon' : 'i-lucide-calendar-off'"
            class="w-4 h-4 shrink-0"
          />
          <span>{{ row.hasPlan ? t('pages.planner.day.restDay') : t('pages.planner.day.noPlan') }}</span>
        </div>

        <!-- Today's sessions -->
        <template v-else>
          <div class="flex flex-col gap-2 border-t border-default pt-3">
            <div
              v-for="it in row.items"
              :key="it.id"
              class="flex items-center gap-2"
            >
              <UBadge variant="subtle" size="sm" :color="TRACK_BADGE_COLOR[it.track_type as AchievementTrack]">
                {{ t(`pages.achievements.tracks.${it.track_type}`) }}
              </UBadge>
              <span class="text-sm truncate flex-1">{{ range(it) }}</span>
              <UBadge variant="subtle" size="sm" :color="planItemStatusColor(it.status)" class="tabular-nums shrink-0">
                {{ it.achieved_verses }}/{{ it.total_verses }}
              </UBadge>
            </div>
          </div>

          <!-- Per-student day progress -->
          <div class="flex items-center gap-2">
            <div class="flex-1 h-1.5 rounded-full bg-elevated overflow-hidden">
              <div class="h-full rounded-full bg-primary" :style="{ width: `${row.coverage}%` }" />
            </div>
            <span class="text-xs text-muted tabular-nums shrink-0">{{ row.coverage }}%</span>
          </div>
        </template>
      </button>
    </div>
  </div>
</template>
