<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'

const { t, locale } = useI18n()
const { canRecordAchievement: canRecord } = usePermissions()
const { hasHalaqa } = useGlobalHalaqa()
const { selectedDate, filters, viewMode, hasActiveFilters, clearFilters, openRecord } = useAchievements()

const calendarOpen = ref(false)
const filtersOpen = ref(false)

const activeFilterCount = computed(() =>
  (filters.trackType ? 1 : 0) + (filters.status ? 1 : 0)
)

const trackItems = computed(() => [
  { label: t('pages.achievements.filters.allTracks'), value: null as string | null },
  { label: t('pages.achievements.tracks.Hifz'), value: 'Hifz' },
  { label: t('pages.achievements.tracks.Near'), value: 'Near' },
  { label: t('pages.achievements.tracks.Far'), value: 'Far' }
])

const statusItems = computed(() => [
  { label: t('pages.achievements.filters.allStatuses'), value: null as string | null },
  { label: t('pages.achievements.statusApproved'), value: 'approved' },
  { label: t('pages.achievements.statusPending'), value: 'unapproved' }
])

const calendarValue = computed(() => {
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  return new CalendarDate(y!, m!, d!)
})

const formattedDate = computed(() => {
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  if (!y || !m || !d) return selectedDate.value
  try {
    return new Date(y, m - 1, d).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : locale.value, {
      day: 'numeric', month: 'short', year: 'numeric', numberingSystem: 'latn'
    })
  } catch {
    return selectedDate.value
  }
})

function onCalendarPick(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('year' in value)) return
  const v = value as { year: number, month: number, day: number }
  selectedDate.value = `${v.year}-${String(v.month).padStart(2, '0')}-${String(v.day).padStart(2, '0')}`
  calendarOpen.value = false
}

/** Shift the selected date by whole days (−1 = previous, +1 = next). */
function shiftDay(delta: number) {
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  const dt = new Date(y!, m! - 1, d!)
  dt.setDate(dt.getDate() + delta)
  selectedDate.value = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <CommonToolbar>
    <!-- Search (primary) -->
    <UInput
      v-model="filters.search"
      icon="i-lucide-search"
      :placeholder="t('pages.achievements.filters.searchPlaceholder')"
      class="flex-1 min-w-40 sm:flex-none sm:w-56"
    />

    <!-- Filters (track + status) sit beside the search -->
    <UPopover v-model:open="filtersOpen">
      <UButton
        variant="outline"
        color="neutral"
        icon="i-lucide-list-filter"
        :aria-label="t('pages.achievements.filters.label')"
      >
        <span class="hidden sm:inline">{{ t('pages.achievements.filters.label') }}</span>
        <UBadge v-if="activeFilterCount" color="primary" variant="solid" size="sm" class="tabular-nums">
          {{ activeFilterCount }}
        </UBadge>
      </UButton>
      <template #content>
        <div class="p-3 w-64 space-y-3">
          <UFormField :label="t('pages.achievements.table.track')">
            <USelect v-model="filters.trackType" :items="trackItems" value-key="value" class="w-full" />
          </UFormField>
          <UFormField :label="t('pages.achievements.table.status')">
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
            {{ t('pages.achievements.filters.clear') }}
          </UButton>
        </div>
      </template>
    </UPopover>

    <!-- Date (primary) — prev/next day arrows around the calendar picker -->
    <div class="flex items-center gap-1">
      <UButton
        variant="outline"
        color="neutral"
        icon="i-lucide-chevron-right"
        square
        :aria-label="t('pages.achievements.filters.prevDay')"
        @click="shiftDay(-1)"
      />
      <UPopover v-model:open="calendarOpen">
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-calendar-days"
          class="justify-between min-w-36"
        >
          {{ formattedDate }}
        </UButton>
        <template #content>
          <UCalendar
            :model-value="calendarValue"
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
        :aria-label="t('pages.achievements.filters.nextDay')"
        @click="shiftDay(1)"
      />
    </div>

    <!-- Right cluster: view toggle + record -->
    <template #actions>
      <div class="flex items-center gap-1 rounded-md border border-default p-0.5">
        <UButton
          :variant="viewMode === 'table' ? 'soft' : 'ghost'"
          color="primary"
          icon="i-lucide-table-2"
          size="sm"
          square
          :aria-label="t('pages.achievements.view.table')"
          @click="viewMode = 'table'"
        />
        <UButton
          :variant="viewMode === 'grid' ? 'soft' : 'ghost'"
          color="primary"
          icon="i-lucide-layout-grid"
          size="sm"
          square
          :aria-label="t('pages.achievements.view.grid')"
          @click="viewMode = 'grid'"
        />
      </div>

      <UButton
        v-if="canRecord && hasHalaqa"
        icon="i-lucide-plus"
        class="shrink-0"
        @click="openRecord"
      >
        {{ t('pages.achievements.recordButton') }}
      </UButton>
    </template>
  </CommonToolbar>
</template>
