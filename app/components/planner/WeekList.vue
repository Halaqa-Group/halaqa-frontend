<script setup lang="ts">
import { DateFormatter, getLocalTimeZone, today as todayFn, type DateValue } from '@internationalized/date'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

const { selectedWeekStart, changeWeek } = useSchedule()
const { t, locale } = useI18n()

const tz = getLocalTimeZone()
const breakpoints = useBreakpoints(breakpointsTailwind)
const isDesktop = breakpoints.greaterOrEqual('sm')

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]

const today = new Date()
today.setHours(0, 0, 0, 0)

function toAr(n: number) {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]!)
}

function lastSaturdayOnOrBefore(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  r.setDate(r.getDate() - ((r.getDay() + 1) % 7))
  return r
}

const currentWeekStart = computed(() => lastSaturdayOnOrBefore(today))

// ── Range picker ────────────────────────────────────────────────────────
type RangePreset = {
  labelKey: string
  days?: number
  months?: number
  years?: number
  direction: 'past' | 'future'
}

const pastPresets: RangePreset[] = [
  { labelKey: 'pages.planner.weekList.presets.pastMonth1', months: 1, direction: 'past' },
  { labelKey: 'pages.planner.weekList.presets.pastMonths3', months: 3, direction: 'past' },
  { labelKey: 'pages.planner.weekList.presets.pastMonths6', months: 6, direction: 'past' },
  { labelKey: 'pages.planner.weekList.presets.pastYear', years: 1, direction: 'past' }
]

const futurePresets: RangePreset[] = [
  { labelKey: 'pages.planner.weekList.presets.month1', months: 1, direction: 'future' },
  { labelKey: 'pages.planner.weekList.presets.months3', months: 3, direction: 'future' },
  { labelKey: 'pages.planner.weekList.presets.months6', months: 6, direction: 'future' },
  { labelKey: 'pages.planner.weekList.presets.year', years: 1, direction: 'future' }
]

function computeRange(p: RangePreset) {
  const delta = { days: p.days ?? 0, months: p.months ?? 0, years: p.years ?? 0 }
  if (p.direction === 'past') {
    const end = todayFn(tz)
    return { start: end.subtract(delta), end }
  }
  const start = todayFn(tz)
  return { start, end: start.add(delta) }
}

// Default: today → +1 month
const range = shallowRef<{ start: DateValue, end: DateValue }>(computeRange(futurePresets[0]!))

function isPresetSelected(p: RangePreset) {
  if (!range.value?.start || !range.value?.end) return false
  const c = computeRange(p)
  return range.value.start.compare(c.start) === 0 && range.value.end.compare(c.end) === 0
}

function selectPreset(p: RangePreset) {
  range.value = computeRange(p)
}

const df = computed(() => new DateFormatter(locale.value === 'ar' ? 'ar' : 'en-US', { dateStyle: 'medium' }))

const rangeLabel = computed(() => {
  const { start, end } = range.value
  if (!start) return t('pages.planner.weekList.rangeButton')
  if (!end) return df.value.format(start.toDate(tz))
  return `${df.value.format(start.toDate(tz))} – ${df.value.format(end.toDate(tz))}`
})

// ── Weeks within range ──────────────────────────────────────────────────
const weeks = computed(() => {
  const startJs = range.value.start.toDate(tz)
  const endJs = range.value.end.toDate(tz)
  const cur = lastSaturdayOnOrBefore(startJs)
  const limit = new Date(endJs)
  limit.setHours(0, 0, 0, 0)

  const list: {
    key: string
    start: Date
    range: string
    year: string
    isCurrent: boolean
    isSelected: boolean
    isPast: boolean
  }[] = []

  while (cur.getTime() <= limit.getTime()) {
    const start = new Date(cur)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)

    const sd = toAr(start.getDate())
    const sm = ARABIC_MONTHS[start.getMonth()]
    const ed = toAr(end.getDate())
    const em = ARABIC_MONTHS[end.getMonth()]
    const ey = toAr(end.getFullYear())
    const rangeLabel = start.getMonth() === end.getMonth()
      ? `${sd} – ${ed} ${sm}`
      : `${sd} ${sm} – ${ed} ${em}`

    list.push({
      key: start.toISOString(),
      start,
      range: rangeLabel,
      year: ey,
      isCurrent: start.getTime() === currentWeekStart.value.getTime(),
      isSelected: start.getTime() === selectedWeekStart.value.getTime(),
      isPast: start.getTime() < currentWeekStart.value.getTime()
    })

    cur.setDate(cur.getDate() + 7)
  }
  return list
})

function pick(start: Date) {
  changeWeek(new Date(start))
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <span class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
        {{ $t('pages.planner.weekList.title') }}
      </span>

      <UPopover :content="{ align: 'end' }">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-calendar"
          size="sm"
          class="rounded-full px-3"
        >
          {{ rangeLabel }}
        </UButton>

        <template #content>
          <div class="flex items-stretch divide-x divide-default">
            <div class="hidden sm:flex flex-col py-2 min-w-[160px]">
              <UButton
                v-for="(p, i) in pastPresets"
                :key="`past-${i}`"
                :label="$t(p.labelKey)"
                color="neutral"
                variant="ghost"
                class="rounded-none px-4 justify-start"
                :class="[isPresetSelected(p) ? 'bg-elevated font-semibold' : 'hover:bg-elevated/50']"
                truncate
                @click="selectPreset(p)"
              />
              <div class="my-1 border-t border-default" />
              <UButton
                v-for="(p, i) in futurePresets"
                :key="`future-${i}`"
                :label="$t(p.labelKey)"
                color="neutral"
                variant="ghost"
                class="rounded-none px-4 justify-start"
                :class="[isPresetSelected(p) ? 'bg-elevated font-semibold' : 'hover:bg-elevated/50']"
                truncate
                @click="selectPreset(p)"
              />
            </div>
            <UCalendar v-model="range" class="p-2" :number-of-months="isDesktop ? 2 : 1" range />
          </div>
        </template>
      </UPopover>
    </div>

    <div
      v-if="weeks.length === 0"
      class="rounded-2xl border border-dashed border-outline-variant px-4 py-6 text-center text-sm text-on-surface-variant"
    >
      {{ $t('pages.planner.weekList.noWeeks') }}
    </div>

    <div v-else class="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
      <button
        v-for="w in weeks"
        :key="w.key"
        type="button"
        class="rounded-2xl px-4 py-3 flex flex-col items-start gap-1 min-w-[160px] shrink-0 transition-all border text-start"
        :class="w.isSelected
          ? 'bg-primary text-on-primary border-primary shadow-md shadow-primary/20'
          : (w.isPast
            ? 'bg-elevated border-default text-on-surface opacity-70 hover:opacity-100 hover:border-primary/30'
            : 'bg-white border-default text-on-surface hover:border-primary/30')"
        @click="pick(w.start)"
      >
        <span
          class="text-[10px] font-semibold uppercase tracking-wide"
          :class="w.isSelected
            ? 'text-on-primary/80'
            : (w.isCurrent
              ? 'text-primary'
              : 'text-on-surface-variant')"
        >
          <template v-if="w.isCurrent">{{ $t('pages.planner.weekList.currentWeek') }}</template>
          <template v-else-if="w.isPast">{{ $t('pages.planner.weekList.past') }}</template>
          <template v-else>{{ $t('pages.planner.weekList.upcoming') }}</template>
        </span>
        <span class="text-sm font-bold leading-tight">
          {{ w.range }}
        </span>
        <span
          class="text-[11px]"
          :class="w.isSelected ? 'text-on-primary/70' : 'text-on-surface-variant'"
        >
          {{ w.year }}
        </span>
      </button>
    </div>
  </div>
</template>
