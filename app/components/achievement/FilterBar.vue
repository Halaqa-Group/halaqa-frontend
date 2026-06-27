<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'

const { t, locale } = useI18n()
const { selectedDate, filters, viewMode, hasActiveFilters, clearFilters } = useAchievements()

const calendarOpen = ref(false)

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
const maxCalendarValue = today(getLocalTimeZone())

const formattedDate = computed(() => {
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  if (!y || !m || !d) return selectedDate.value
  try {
    return new Date(y, m - 1, d).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : locale.value, {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  } catch {
    return selectedDate.value
  }
})

// UCalendar's model can be a single date, a range, or an array; we only use the
// single-date mode here. Typed as unknown to satisfy the broad handler signature.
function onCalendarPick(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('year' in value)) return
  const v = value as { year: number, month: number, day: number }
  selectedDate.value = `${v.year}-${String(v.month).padStart(2, '0')}-${String(v.day).padStart(2, '0')}`
  calendarOpen.value = false
}
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <UInput
      v-model="filters.search"
      icon="i-lucide-search"
      :placeholder="t('pages.achievements.filters.searchPlaceholder')"
      class="w-full sm:w-56"
    />

    <UPopover v-model:open="calendarOpen">
      <UButton
        variant="outline"
        color="neutral"
        icon="i-lucide-calendar-days"
        trailing-icon="i-lucide-chevron-down"
        class="w-full sm:w-auto justify-between"
      >
        {{ formattedDate }}
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

    <USelect
      v-model="filters.trackType"
      :items="trackItems"
      value-key="value"
      class="w-full sm:w-40"
    />

    <USelect
      v-model="filters.status"
      :items="statusItems"
      value-key="value"
      class="w-full sm:w-44"
    />

    <UButton
      v-if="hasActiveFilters"
      variant="link"
      color="neutral"
      icon="i-lucide-x"
      size="sm"
      class="px-0"
      @click="clearFilters"
    >
      {{ t('pages.achievements.filters.clear') }}
    </UButton>

    <div class="sm:ms-auto flex items-center gap-1 rounded-md border border-default p-0.5">
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
  </div>
</template>
