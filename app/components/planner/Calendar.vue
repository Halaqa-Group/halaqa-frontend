<script setup lang="ts">
const today = new Date()
today.setHours(0, 0, 0, 0)

const { selectedWeekStart, changeWeek } = useSchedule()

const selectedWeekEnd = computed(() => {
  const d = new Date(selectedWeekStart.value)
  d.setDate(d.getDate() + 6)
  return d
})

// The month shown in the calendar view — follows selected week automatically
const viewYear = ref(selectedWeekStart.value.getFullYear())
const viewMonth = ref(selectedWeekStart.value.getMonth())

watch(selectedWeekStart, (s) => {
  viewYear.value = s.getFullYear()
  viewMonth.value = s.getMonth()
})

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]
// Saturday-first columns: س ح ن ث ر خ ج
const WEEKDAYS = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج']

function toAr(n: number) {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])
}

const monthLabel = computed(() =>
  `${ARABIC_MONTHS[viewMonth.value]} ${toAr(viewYear.value)}`
)

const weekRangeLabel = computed(() => {
  const s = selectedWeekStart.value
  const e = selectedWeekEnd.value
  const sd = toAr(s.getDate()), sm = ARABIC_MONTHS[s.getMonth()]
  const ed = toAr(e.getDate()), em = ARABIC_MONTHS[e.getMonth()]
  return s.getMonth() === e.getMonth()
    ? `${sd} - ${ed} ${sm}`
    : `${sd} ${sm} - ${ed} ${em}`
})

function prevMonthView() {
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- }
  else viewMonth.value--
}
function nextMonthView() {
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ }
  else viewMonth.value++
}

function prevWeek() {
  const d = new Date(selectedWeekStart.value)
  d.setDate(d.getDate() - 7)
  changeWeek(d)
}
function nextWeek() {
  const d = new Date(selectedWeekStart.value)
  d.setDate(d.getDate() + 7)
  changeWeek(d)
}

type CalDay = {
  day: number
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isInSelectedWeek: boolean
  isWeekStart: boolean // this Saturday
  isWeekEnd: boolean   // the Friday 6 days later
  isSaturday: boolean
}

const calendarDays = computed<CalDay[]>(() => {
  const year = viewYear.value
  const month = viewMonth.value
  // Saturday-start offset: (getDay() + 1) % 7
  const offset = (new Date(year, month, 1).getDay() + 1) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevTotal = new Date(year, month, 0).getDate()
  const ws = selectedWeekStart.value
  const we = selectedWeekEnd.value
  const days: CalDay[] = []

  const push = (date: Date, isCurrentMonth: boolean) => {
    days.push({
      day: date.getDate(),
      date,
      isCurrentMonth,
      isToday: date.toDateString() === today.toDateString(),
      isInSelectedWeek: date >= ws && date <= we,
      isWeekStart: date.toDateString() === ws.toDateString(),
      isWeekEnd: date.toDateString() === we.toDateString(),
      isSaturday: date.getDay() === 6
    })
  }

  for (let i = offset - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevTotal - i)
    d.setHours(0, 0, 0, 0)
    push(d, false)
  }
  for (let n = 1; n <= daysInMonth; n++) {
    const d = new Date(year, month, n)
    d.setHours(0, 0, 0, 0)
    push(d, true)
  }
  const remaining = 42 - days.length
  for (let n = 1; n <= remaining; n++) {
    const d = new Date(year, month + 1, n)
    d.setHours(0, 0, 0, 0)
    push(d, false)
  }

  return days
})

function onDayClick(cell: CalDay) {
  if (!cell.isSaturday) return
  changeWeek(new Date(cell.date))
}
</script>

<template>
  <div class="bg-white border border-primary/10 rounded-2xl p-7 shadow-xl shadow-primary/[0.03] relative overflow-hidden group">
    <div class="absolute top-0 end-0 w-32 h-32 bg-primary/5 rounded-full -me-16 -mt-16 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />

    <div class="relative z-10">
      <!-- Month header -->
      <div class="flex items-center justify-between mb-6">
        <UButton
          variant="ghost"
          color="primary"
          icon="i-lucide-chevron-right"
          size="lg"
          class="text-primary/40 hover:text-primary rounded-2xl"
          @click="prevMonthView"
        />
        <h4 class="font-bold text-lg" style="color: var(--color-on-surface);">{{ monthLabel }}</h4>
        <UButton
          variant="ghost"
          color="primary"
          icon="i-lucide-chevron-left"
          size="lg"
          class="text-primary/40 hover:text-primary rounded-2xl"
          @click="nextMonthView"
        />
      </div>

      <!-- Weekday headers -->
      <div class="grid grid-cols-7 gap-1 mb-3">
        <div
          v-for="wd in WEEKDAYS" :key="wd"
          class="h-9 flex items-center justify-center text-[11px] font-bold tracking-tighter"
          style="color: color-mix(in srgb, var(--color-on-surface-variant) 35%, transparent);"
        >
          {{ wd }}
        </div>
      </div>

      <!-- Day cells -->
      <div class="grid grid-cols-7 gap-y-1 gap-x-0">
        <div
          v-for="(cell, i) in calendarDays"
          :key="i"
          class="h-10 flex items-center justify-center relative"
          :class="cell.isSaturday ? 'cursor-pointer group/sat' : 'cursor-default'"
          @click="onDayClick(cell)"
        >
          <!-- Week highlight strip -->
          <div
            v-if="cell.isInSelectedWeek"
            class="absolute inset-0 bg-primary/10 border-y border-primary/10"
            :class="[
              cell.isWeekStart && 'rounded-e-2xl border-e',
              cell.isWeekEnd && 'rounded-s-2xl border-s',
            ]"
          />

          <!-- Saturday hover ring (only on non-selected Saturdays) -->
          <div
            v-if="cell.isSaturday && !cell.isInSelectedWeek"
            class="absolute inset-1 rounded-xl bg-primary/0 group-hover/sat:bg-primary/5 transition-colors"
          />

          <!-- Day number -->
          <span
            class="relative z-10 text-sm transition-colors select-none"
            :class="[
              !cell.isCurrentMonth && 'opacity-25',
              cell.isToday ? 'font-extrabold' : 'font-bold',
              cell.isToday || cell.isInSelectedWeek
                ? 'text-primary'
                : (cell.isSaturday
                    ? 'text-on-surface/80 group-hover/sat:text-primary'
                    : 'text-on-surface/60'),
            ]"
          >
            {{ cell.day }}
          </span>

          <!-- Today dot (centered below number) -->
          <div
            v-if="cell.isToday"
            class="absolute bottom-0.5 inset-x-0 mx-auto w-1.5 h-1.5 rounded-full z-20"
            style="background-color: var(--color-primary); width: 6px;"
          />
        </div>
      </div>

      <!-- Week navigation -->
      <div class="mt-6 pt-5 border-t border-primary/10 flex items-center gap-3">
        <!-- Previous week (right in RTL) -->
        <UButton
          variant="outline"
          color="primary"
          icon="i-lucide-chevron-right"
          block
          size="sm"
          class="flex-1 py-2.5 rounded-2xl text-xs ring-primary/10 hover:ring-primary/30 hover:bg-primary/5 text-on-surface-variant hover:text-primary"
          @click="prevWeek"
        >
          الأسبوع السابق
        </UButton>

        <!-- Next week (left in RTL) -->
        <UButton
          variant="outline"
          color="primary"
          trailing-icon="i-lucide-chevron-left"
          block
          size="sm"
          class="flex-1 py-2.5 rounded-2xl text-xs ring-primary/10 hover:ring-primary/30 hover:bg-primary/5 text-on-surface-variant hover:text-primary"
          @click="nextWeek"
        >
          الأسبوع التالي
        </UButton>
      </div>
    </div>
  </div>
</template>
