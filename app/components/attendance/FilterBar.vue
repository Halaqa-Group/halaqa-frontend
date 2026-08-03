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
  attendanceRows, search, selectedDate, statusFilter, viewMode,
  presentCount, lateCount, absentCount, excusedCount
} = useAttendance()

const calendarOpen = ref(false)

// The status counts double as the filter: each chip both shows its tally and
// selects that status; "all" clears the filter. Replaces the old dropdown.
const statusChips = computed(() => [
  { value: 'all', label: t('pages.attendance.filters.all'), count: attendanceRows.value.length, color: 'neutral' as const },
  { value: 'present', label: t('pages.attendance.filters.present'), count: presentCount.value, color: 'success' as const },
  { value: 'late', label: t('pages.attendance.filters.late'), count: lateCount.value, color: 'warning' as const },
  { value: 'absent', label: t('pages.attendance.filters.absent'), count: absentCount.value, color: 'error' as const },
  { value: 'excused', label: t('pages.attendance.filters.excused'), count: excusedCount.value, color: 'info' as const }
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
    <div class="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <UButton
        v-for="chip in statusChips"
        :key="chip.value"
        size="sm"
        :color="chip.color"
        :variant="statusFilter === chip.value ? 'solid' : 'soft'"
        class="rounded-full shrink-0"
        @click="statusFilter = chip.value"
      >
        {{ chip.label }}
        <span class="tabular-nums font-semibold ms-1">{{ chip.count }}</span>
      </UButton>
    </div>

    <HalaqaFilter class="flex-1 min-w-40 sm:flex-none sm:w-48" />

    <UInput
      v-model="search"
      icon="i-lucide-search"
      :placeholder="t('pages.attendance.searchPlaceholder')"
      class="flex-1 min-w-40 sm:flex-none sm:w-56"
    />

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
