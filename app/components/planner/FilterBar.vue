<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'

const { t, locale } = useI18n()
const {
  students, selectedStudentId, selectedWeekStart, filters, viewMode,
  summary, hasActiveFilters, clearFilters, prevWeek, nextWeek, setWeekFromDate
} = useWeeklyPlan()

const calendarOpen = ref(false)

const studentItems = computed(() => students.value.map(s => ({ label: s.name, value: s.id })))

const trackItems = computed(() => [
  { label: t('pages.planner.filters.allTracks'), value: null as string | null },
  { label: t('pages.achievements.tracks.Hifz'), value: 'Hifz' },
  { label: t('pages.achievements.tracks.Near'), value: 'Near' },
  { label: t('pages.achievements.tracks.Far'), value: 'Far' }
])

const statusItems = computed(() => [
  { label: t('pages.planner.filters.allStatuses'), value: null as string | null },
  { label: t('pages.planner.itemStatus.due'), value: 'due' },
  { label: t('pages.planner.itemStatus.partial'), value: 'partial' },
  { label: t('pages.planner.itemStatus.completed'), value: 'completed' },
  { label: t('pages.planner.itemStatus.overdue'), value: 'overdue' }
])

const calendarValue = computed(() => {
  const [y, m, d] = selectedWeekStart.value.split('-').map(Number)
  return new CalendarDate(y!, m!, d!)
})
const maxCalendarValue = today(getLocalTimeZone())

const weekLabel = computed(() => {
  const [y, m, d] = selectedWeekStart.value.split('-').map(Number)
  if (!y || !m || !d) return selectedWeekStart.value
  try {
    return new Date(y, m - 1, d).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : locale.value, {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  } catch {
    return selectedWeekStart.value
  }
})

function onCalendarPick(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('year' in value)) return
  const v = value as { year: number, month: number, day: number }
  setWeekFromDate(new Date(v.year, v.month - 1, v.day))
  calendarOpen.value = false
}
</script>

<template>
  <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
    <USelectMenu
      v-model="selectedStudentId"
      :items="studentItems"
      value-key="value"
      :placeholder="t('pages.planner.selectStudent')"
      searchable
      class="w-full sm:w-52"
    />

    <!-- Week control -->
    <div class="flex items-center gap-1">
      <UButton
        variant="outline"
        color="neutral"
        icon="i-lucide-chevron-right"
        square
        :aria-label="t('pages.planner.weekList.past')"
        @click="prevWeek"
      />
      <UPopover v-model:open="calendarOpen">
        <UButton variant="outline" color="neutral" icon="i-lucide-calendar-days" class="justify-between min-w-44">
          {{ t('pages.planner.weekOf', { date: weekLabel }) }}
        </UButton>
        <template #content>
          <UCalendar
            :model-value="calendarValue"
            :max-value="maxCalendarValue"
            color="primary"
            class="p-2"
            @update:model-value="onCalendarPick"
          />
        </template>
      </UPopover>
      <UButton
        variant="outline"
        color="neutral"
        icon="i-lucide-chevron-left"
        square
        :aria-label="t('pages.planner.weekList.currentWeek')"
        @click="nextWeek"
      />
    </div>

    <USelect v-model="filters.trackType" :items="trackItems" value-key="value" class="w-full sm:w-36" />
    <USelect v-model="filters.status" :items="statusItems" value-key="value" class="w-full sm:w-40" />

    <UButton
      v-if="hasActiveFilters"
      variant="link"
      color="neutral"
      icon="i-lucide-x"
      size="sm"
      class="px-0"
      @click="clearFilters"
    >
      {{ t('pages.planner.filters.clear') }}
    </UButton>

    <div class="lg:ms-auto flex items-center gap-2">
      <UBadge color="primary" variant="subtle">
        {{ t('pages.planner.coverage', { achieved: summary.totalAchieved, total: summary.totalPlanned, percent: summary.coverage }) }}
      </UBadge>
      <div class="flex items-center gap-1 rounded-md border border-default p-0.5">
        <UButton
          :variant="viewMode === 'matrix' ? 'soft' : 'ghost'"
          color="primary"
          icon="i-lucide-calendar-range"
          size="sm"
          square
          :aria-label="t('pages.planner.view.matrix')"
          @click="viewMode = 'matrix'"
        />
        <UButton
          :variant="viewMode === 'table' ? 'soft' : 'ghost'"
          color="primary"
          icon="i-lucide-table-2"
          size="sm"
          square
          :aria-label="t('pages.planner.view.table')"
          @click="viewMode = 'table'"
        />
        <UButton
          :variant="viewMode === 'grid' ? 'soft' : 'ghost'"
          color="primary"
          icon="i-lucide-layout-grid"
          size="sm"
          square
          :aria-label="t('pages.planner.view.grid')"
          @click="viewMode = 'grid'"
        />
      </div>
    </div>
  </div>
</template>
