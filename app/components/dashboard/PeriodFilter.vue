<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import type { DashboardPeriod, DashboardRange, DashboardWindowSelection } from '~/types'
import { formatKpiRange } from '~/utils/dashboard'

/**
 * The reporting-window control shared by every dashboard section.
 *
 * `week` and `month` send only `period` and let the server resolve the dates —
 * the school week starts on Saturday, and duplicating that rule on the client is
 * how the two drift apart. `custom` is the only mode that sends `from`/`to`, and
 * it emits nothing until BOTH ends are picked, because the API ignores a lone
 * `from` and would silently answer for the default window instead.
 *
 * `range` is what the server actually resolved; it is displayed rather than
 * recomputed so the label can never disagree with the numbers beside it.
 */

const selection = defineModel<DashboardWindowSelection>({ required: true })

const props = defineProps<{
  /** The window the API echoed back for the current data. */
  range?: DashboardRange | null
  loading?: boolean
}>()

const emit = defineEmits<{ refresh: [] }>()

const { t, locale } = useI18n()

/** `custom` is rendered separately — it needs a popover, not a plain button. */
const SIMPLE_MODES = [
  { value: 'week' as const, labelKey: 'pages.home.period.week' },
  { value: 'month' as const, labelKey: 'pages.home.period.month' }
]

const calendarOpen = ref(false)

/**
 * Switches to a server-derived window. `custom` never comes through here — its
 * button only opens the calendar, and nothing is committed until both ends are
 * picked, so a half-made range can't trigger a fetch.
 */
function selectMode(mode: DashboardPeriod) {
  if (selection.value.mode === mode) return
  selection.value = { mode }
}

function toCalendarDate(iso: string): CalendarDate | undefined {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new CalendarDate(y, m, d)
}

const calendarValue = computed(() => {
  const { from, to } = selection.value
  if (!from || !to) return null
  const start = toCalendarDate(from)
  const end = toCalendarDate(to)
  return start && end ? { start, end } : null
})

const maxCalendarValue = computed(() => today(getLocalTimeZone()))

function iso(value: { year: number, month: number, day: number }): string {
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
}

function onRangePick(value: unknown) {
  const picked = value as { start?: { year: number, month: number, day: number }, end?: { year: number, month: number, day: number } } | null
  // The calendar reports the half-open selection after the first click; wait.
  if (!picked?.start || !picked?.end) return
  selection.value = { mode: 'custom', from: iso(picked.start), to: iso(picked.end) }
  calendarOpen.value = false
}

const rangeLabel = computed(() => formatKpiRange(props.range, locale.value))
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <!-- A plain flex row, not a UButtonGroup: the custom-range trigger is
         wrapped by UPopover, and a group cannot see through that wrapper to
         join and align its edges. Explicit gaps keep all three identical. -->
    <div class="flex flex-wrap items-center gap-2">
      <UButton
        v-for="mode in SIMPLE_MODES"
        :key="mode.value"
        size="sm"
        :variant="selection.mode === mode.value ? 'solid' : 'outline'"
        :color="selection.mode === mode.value ? 'primary' : 'neutral'"
        :label="t(mode.labelKey)"
        @click="selectMode(mode.value)"
      />

      <UPopover v-model:open="calendarOpen">
        <UButton
          size="sm"
          :variant="selection.mode === 'custom' ? 'solid' : 'outline'"
          :color="selection.mode === 'custom' ? 'primary' : 'neutral'"
          icon="i-lucide-calendar-range"
          :label="t('pages.home.period.custom')"
        />
        <template #content>
          <UCalendar
            range
            :model-value="calendarValue"
            :max-value="maxCalendarValue"
            color="primary"
            class="p-2"
            @update:model-value="onRangePick"
          />
        </template>
      </UPopover>
    </div>

    <span v-if="rangeLabel" class="text-sm text-on-surface-variant" dir="ltr">
      {{ rangeLabel }}
    </span>

    <UButton
      color="neutral"
      variant="ghost"
      size="sm"
      icon="i-lucide-refresh-cw"
      :loading="loading"
      :aria-label="t('pages.home.period.refresh')"
      class="ms-auto"
      @click="emit('refresh')"
    />
  </div>
</template>
