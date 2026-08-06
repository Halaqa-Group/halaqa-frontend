<script setup lang="ts">
import type { ApiWeeklyPlan, ApiWeeklyPlanItem } from '~/types'

const props = defineProps<{
  plans: ApiWeeklyPlan[]
  loading?: boolean
}>()

const { t, locale } = useI18n()

const weekFormatter = computed(() =>
  new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'latn' })
)

function weekLabel(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : weekFormatter.value.format(d)
}

// day_of_week is 0-based from the plan's week_start_date (0 = Saturday).
function dayLabel(weekStart: string, dayOfWeek: number): string {
  const d = new Date(weekStart)
  if (Number.isNaN(d.getTime())) return String(dayOfWeek)
  d.setDate(d.getDate() + dayOfWeek)
  try {
    return d.toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : locale.value, {
      weekday: 'long', day: 'numeric', month: 'short', numberingSystem: 'latn'
    })
  } catch {
    return String(dayOfWeek)
  }
}

function sortedItems(plan: ApiWeeklyPlan): ApiWeeklyPlanItem[] {
  return [...(plan.items ?? [])].sort((a, b) => a.day_of_week - b.day_of_week)
}

// Newest week first.
const sortedPlans = computed(() =>
  [...props.plans].sort((a, b) =>
    (b.week_start_date > a.week_start_date ? 1 : b.week_start_date < a.week_start_date ? -1 : 0)
  )
)

const noActions: [] = []
</script>

<template>
  <div class="pt-4">
    <div v-if="loading" class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-circle" class="w-6 h-6 animate-spin text-primary" />
    </div>

    <div v-else-if="sortedPlans.length === 0" class="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <UIcon name="i-lucide-calendar-range" class="w-9 h-9 text-muted" />
      <p class="text-sm text-muted">
        {{ t('pages.parent.child.weeklyPlan.empty') }}
      </p>
    </div>

    <div v-else class="flex flex-col gap-6">
      <section v-for="plan in sortedPlans" :key="plan.id" class="space-y-3">
        <div class="flex items-center gap-2">
          <h3 class="font-semibold text-sm">
            {{ t('pages.parent.child.weeklyPlan.weekOf', { date: weekLabel(plan.week_start_date) }) }}
          </h3>
          <UBadge
            variant="subtle"
            size="sm"
            :color="plan.status === 'approved' ? 'success' : 'neutral'"
          >
            {{ plan.status === 'approved'
              ? t('pages.parent.child.weeklyPlan.approved')
              : t('pages.parent.child.weeklyPlan.draft') }}
          </UBadge>
        </div>

        <p v-if="sortedItems(plan).length === 0" class="text-xs text-muted">
          {{ t('pages.parent.child.weeklyPlan.noItems') }}
        </p>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <PlannerCard
            v-for="it in sortedItems(plan)"
            :key="it.id"
            :item="it"
            :day-label="dayLabel(plan.week_start_date, it.day_of_week)"
            :actions="noActions"
          />
        </div>
      </section>
    </div>
  </div>
</template>
