<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'

const { t, locale } = useI18n()
const {
  search, selectedDate, statusFilter, viewMode,
  presentCount, lateCount, absentCount, excusedCount, hasActiveFilters, clearFilters
} = useAttendance()

const calendarOpen = ref(false)

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
  <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
    <UInput
      v-model="search"
      icon="i-lucide-search"
      :placeholder="t('pages.attendance.searchPlaceholder')"
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
      v-model="statusFilter"
      :items="statusItems"
      value-key="value"
      class="w-full sm:w-40"
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
      {{ t('pages.attendance.filters.clear') }}
    </UButton>

    <!-- Slim count summary + view toggle -->
    <div class="lg:ms-auto flex items-center gap-2 flex-wrap">
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
      <!-- View toggle is desktop-only; mobile always uses the card list -->
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
    </div>
  </div>
</template>
