<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'

const { t, locale } = useI18n()
const {
  students, selectedStudentId, selectedWeekStart, filters, viewMode,
  summary, hasActiveFilters, clearFilters, prevWeek, nextWeek, setWeekFromDate
} = useWeeklyPlan()

const calendarOpen = ref(false)
const filtersOpen = ref(false)

const studentItems = computed(() => students.value.map(s => ({ label: s.name, value: s.id })))

const activeFilterCount = computed(() =>
  (filters.trackType ? 1 : 0) + (filters.status ? 1 : 0)
)

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
  <CommonToolbar>
    <HalaqaFilter required class="flex-1 min-w-36 sm:flex-none sm:!w-44" />

    <USelectMenu
      v-if="viewMode !== 'day'"
      v-model="selectedStudentId"
      :items="studentItems"
      value-key="value"
      :placeholder="t('pages.planner.selectStudent')"
      searchable
      class="flex-1 min-w-40 sm:flex-none sm:w-52"
    />

    <!-- Filters (track + status) sit beside the student selector -->
    <UPopover v-if="viewMode === 'table' || viewMode === 'grid'" v-model:open="filtersOpen">
      <UButton
        variant="outline"
        color="neutral"
        icon="i-lucide-list-filter"
        :aria-label="t('pages.planner.filters.label')"
      >
        <span class="hidden sm:inline">{{ t('pages.planner.filters.label') }}</span>
        <UBadge v-if="activeFilterCount" color="primary" variant="solid" size="sm" class="tabular-nums">
          {{ activeFilterCount }}
        </UBadge>
      </UButton>
      <template #content>
        <div class="p-3 w-64 space-y-3">
          <UFormField :label="t('pages.planner.table.track')">
            <USelect v-model="filters.trackType" :items="trackItems" value-key="value" class="w-full" />
          </UFormField>
          <UFormField :label="t('pages.planner.filters.statusLabel')">
            <USelect v-model="filters.status" :items="statusItems" value-key="value" class="w-full" />
          </UFormField>
          <UButton
            v-if="hasActiveFilters"
            block
            variant="soft"
            color="neutral"
            icon="i-lucide-x"
            size="sm"
            @click="clearFilters"
          >
            {{ t('pages.planner.filters.clear') }}
          </UButton>
        </div>
      </template>
    </UPopover>

    <div v-if="viewMode !== 'day'" class="flex items-center gap-1">
      <UButton
        variant="outline"
        color="neutral"
        icon="i-lucide-chevron-right"
        square
        :aria-label="t('pages.planner.weekList.past')"
        @click="prevWeek"
      />
      <UPopover v-model:open="calendarOpen">
        <UButton variant="outline" color="neutral" icon="i-lucide-calendar-days" class="justify-between min-w-36">
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

    <template #actions>
      <UBadge v-if="viewMode !== 'day'" color="primary" variant="subtle" class="hidden sm:inline-flex">
        {{ t('pages.planner.coverage', { achieved: summary.totalAchieved, total: summary.totalPlanned, percent: summary.coverage }) }}
      </UBadge>

      <div class="flex items-center gap-1 rounded-md border border-default p-0.5">
        <UButton
          :variant="viewMode === 'day' ? 'soft' : 'ghost'"
          color="primary"
          icon="i-lucide-calendar-check"
          size="sm"
          square
          :aria-label="t('pages.planner.view.day')"
          @click="viewMode = 'day'"
        />
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
    </template>
  </CommonToolbar>
</template>
