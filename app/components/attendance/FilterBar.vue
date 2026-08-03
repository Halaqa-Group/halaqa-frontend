<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'

// The halaqa scope and the roster-wide "mark all present" action now share the
// single toolbar row with the filters, so every attendance control sits on one
// line under the tabs.
defineProps<{
  canMark: boolean
  hasHalaqa: boolean
  hasRows: boolean
}>()

defineEmits<{
  'mark-all': []
}>()

const { t, locale } = useI18n()
const {
  search, selectedDate, statusFilter, viewMode,
  presentCount, lateCount, absentCount, excusedCount, hasActiveFilters, clearFilters
} = useAttendance()

const calendarOpen = ref(false)
const filtersOpen = ref(false)
const filterCount = computed(() => (statusFilter.value && statusFilter.value !== 'all' ? 1 : 0))

const statusItems = computed(() => [
  { label: t('pages.attendance.filters.all'), value: 'all' },
  { label: t('pages.attendance.filters.present'), value: 'present' },
  { label: t('pages.attendance.filters.late'), value: 'late' },
  { label: t('pages.attendance.filters.absent'), value: 'absent' },
  { label: t('pages.attendance.filters.excused'), value: 'excused' }
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

function onCalendarPick(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('year' in value)) return
  const v = value as { year: number, month: number, day: number }
  selectedDate.value = `${v.year}-${String(v.month).padStart(2, '0')}-${String(v.day).padStart(2, '0')}`
  calendarOpen.value = false
}
</script>

<template>
  <CommonToolbar>
    <HalaqaFilter class="flex-1 min-w-40 sm:flex-none sm:w-48" />

    <UInput
      v-model="search"
      icon="i-lucide-search"
      :placeholder="t('pages.attendance.searchPlaceholder')"
      class="flex-1 min-w-40 sm:flex-none sm:w-56"
    />

    <UPopover v-model:open="filtersOpen">
      <UButton
        variant="outline"
        color="neutral"
        icon="i-lucide-list-filter"
        :aria-label="t('common.filters')"
      >
        <span class="hidden sm:inline">{{ t('common.filters') }}</span>
        <UBadge v-if="filterCount" color="primary" variant="solid" size="sm" class="tabular-nums">
          {{ filterCount }}
        </UBadge>
      </UButton>
      <template #content>
        <div class="p-3 w-64 space-y-3">
          <UFormField :label="t('common.status')">
            <USelect v-model="statusFilter" :items="statusItems" value-key="value" class="w-full" />
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
            {{ t('pages.attendance.filters.clear') }}
          </UButton>
        </div>
      </template>
    </UPopover>

    <UPopover v-model:open="calendarOpen">
      <UButton
        variant="outline"
        color="neutral"
        icon="i-lucide-calendar-days"
        trailing-icon="i-lucide-chevron-down"
        class="min-w-36 justify-between"
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

    <template #actions>
      <div class="flex items-center gap-1.5 text-xs flex-wrap">
        <UBadge color="success" variant="subtle">
          {{ presentCount }} {{ t('pages.attendance.filters.present') }}
        </UBadge>
        <UBadge color="warning" variant="subtle">
          {{ lateCount }} {{ t('pages.attendance.filters.late') }}
        </UBadge>
        <UBadge color="error" variant="subtle">
          {{ absentCount }} {{ t('pages.attendance.filters.absent') }}
        </UBadge>
        <UBadge color="info" variant="subtle">
          {{ excusedCount }} {{ t('pages.attendance.filters.excused') }}
        </UBadge>
      </div>
      <div class="hidden md:flex items-center gap-1 rounded-md border border-default p-0.5">
        <UButton
          :variant="viewMode === 'table' ? 'soft' : 'ghost'"
          color="primary"
          icon="i-lucide-table-2"
          size="sm"
          square
          :aria-label="t('pages.attendance.view.table')"
          @click="viewMode = 'table'"
        />
        <UButton
          :variant="viewMode === 'grid' ? 'soft' : 'ghost'"
          color="primary"
          icon="i-lucide-layout-grid"
          size="sm"
          square
          :aria-label="t('pages.attendance.gridView')"
          @click="viewMode = 'grid'"
        />
      </div>

      <UButton
        v-if="canMark && hasHalaqa && hasRows"
        icon="i-lucide-check-check"
        color="primary"
        variant="soft"
        class="shrink-0"
        @click="$emit('mark-all')"
      >
        {{ t('pages.attendance.markAllPresent') }}
      </UButton>
    </template>
  </CommonToolbar>
</template>
