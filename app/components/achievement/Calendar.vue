<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDate, getLocalTimeZone, today, type DateValue } from '@internationalized/date'

const props = defineProps<{
  modelValue: string
  streakDays?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const calendarValue = computed({
  get: () => {
    const [y, m, d] = props.modelValue.split('-').map(Number)
    return new CalendarDate(y!, m!, d!)
  },
  set: (v: DateValue | null) => {
    if (!v) return
    emit('update:modelValue', `${v.year}-${String(v.month).padStart(2, '0')}-${String(v.day).padStart(2, '0')}`)
  }
})

const maxCalendarValue = today(getLocalTimeZone())

function dateKey(d: { year: number, month: number, day: number }) {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

const _now = new Date()
const _y = _now.getFullYear()
const _m = _now.getMonth() + 1
const mockSessionByDay: Record<string, number> = {
  [dateKey({ year: _y, month: _m, day: Math.max(1, _now.getDate() - 1) })]: 1,
  [dateKey({ year: _y, month: _m, day: Math.max(1, _now.getDate() - 2) })]: 4,
  [dateKey({ year: _y, month: _m, day: Math.max(1, _now.getDate() - 3) })]: 7,
  [dateKey({ year: _y, month: _m, day: Math.max(1, _now.getDate() - 4) })]: 2,
  [dateKey({ year: _y, month: _m, day: Math.max(1, _now.getDate() - 5) })]: 3,
  [dateKey({ year: _y, month: _m, day: Math.max(1, _now.getDate() - 7) })]: 5,
  [dateKey({ year: _y, month: _m, day: Math.max(1, _now.getDate() - 8) })]: 1
}

function dayDotClass(d: { year: number, month: number, day: number }): string | null {
  const k = dateKey(d)
  const errors = mockSessionByDay[k]
  if (errors === undefined) return null
  if (errors <= 2) return 'bg-status-ok'
  if (errors <= 5) return 'bg-status-warning'
  return 'bg-error'
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- UCalendar with day-dot indicators -->
    <div class="rounded-2xl p-4 ring ring-card-border bg-surface-container-lowest">
      <UCalendar
        v-model="calendarValue"
        :max-value="maxCalendarValue"
        color="primary"
        class="w-full">
        <template #day="{ day }">
          <div class="relative w-full h-full flex items-center justify-center">
            <span>{{ day.day }}</span>
            <span
              v-if="dayDotClass(day)"
              class="absolute bottom-0.5 w-1.5 h-1.5 rounded-full"
              :class="dayDotClass(day)" />
          </div>
        </template>
      </UCalendar>

      <!-- Legend -->
      <div class="mt-3 pt-3 flex items-center justify-around gap-2 text-[10px] border-t border-card-border">
        <div class="flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-status-ok" />
          <span class="text-on-surface-variant">ممتاز</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-status-warning" />
          <span class="text-on-surface-variant">جيد</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-error" />
          <span class="text-on-surface-variant">مراجعة</span>
        </div>
      </div>
    </div>
  </div>
</template>
