<script setup lang="ts">
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const today = new Date()
today.setHours(0, 0, 0, 0)

const selectedDate = computed({
  get: () => {
    const d = new Date(props.modelValue)
    d.setHours(0, 0, 0, 0)
    return d
  },
  set: (d: Date) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    emit('update:modelValue', `${yyyy}-${mm}-${dd}`)
  }
})

const viewYear = ref(selectedDate.value.getFullYear())
const viewMonth = ref(selectedDate.value.getMonth())

watch(() => props.modelValue, (v) => {
  const d = new Date(v)
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
})

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]
const WEEKDAYS = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج']

function toAr(n: number) {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])
}

const monthLabel = computed(() => `${ARABIC_MONTHS[viewMonth.value]} ${toAr(viewYear.value)}`)

function prevMonth() {
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- }
  else viewMonth.value--
}
function nextMonth() {
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ }
  else viewMonth.value++
}

type CalDay = {
  day: number
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
}

const calendarDays = computed<CalDay[]>(() => {
  const year = viewYear.value
  const month = viewMonth.value
  const offset = (new Date(year, month, 1).getDay() + 1) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevTotal = new Date(year, month, 0).getDate()
  const sel = selectedDate.value
  const days: CalDay[] = []

  const push = (date: Date, isCurrentMonth: boolean) => {
    days.push({
      day: date.getDate(),
      date,
      isCurrentMonth,
      isToday: date.toDateString() === today.toDateString(),
      isSelected: date.toDateString() === sel.toDateString()
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
  selectedDate.value = cell.date
}
</script>

<template>
  <div class="bg-white border border-primary/10 rounded-[40px] p-7 shadow-xl shadow-primary/[0.03] relative overflow-hidden group">
    <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />

    <div class="relative z-10">
      <!-- Month header -->
      <div class="flex items-center justify-between mb-6">
        <button class="p-2.5 hover:bg-primary/5 text-primary/40 hover:text-primary rounded-2xl transition-all cursor-pointer" @click="prevMonth">
          <UIcon name="i-lucide-chevron-right" class="w-5 h-5" />
        </button>
        <h4 class="font-arabic font-bold text-lg" style="color: var(--color-on-surface);">{{ monthLabel }}</h4>
        <button class="p-2.5 hover:bg-primary/5 text-primary/40 hover:text-primary rounded-2xl transition-all cursor-pointer" @click="nextMonth">
          <UIcon name="i-lucide-chevron-left" class="w-5 h-5" />
        </button>
      </div>

      <!-- Weekday headers -->
      <div class="grid grid-cols-7 gap-1 mb-3">
        <div
          v-for="wd in WEEKDAYS" :key="wd"
          class="h-9 flex items-center justify-center text-[11px] font-bold font-arabic tracking-tighter"
          style="color: color-mix(in srgb, var(--color-on-surface-variant) 35%, transparent);"
        >{{ wd }}</div>
      </div>

      <!-- Day cells -->
      <div class="grid grid-cols-7 gap-y-1 gap-x-0">
        <div
          v-for="(cell, i) in calendarDays"
          :key="i"
          class="h-10 flex items-center justify-center relative cursor-pointer group/day"
          @click="onDayClick(cell)"
        >
          <!-- Selected day circle -->
          <div
            v-if="cell.isSelected"
            class="absolute inset-1 rounded-xl"
            style="background-color: var(--color-primary);"
          />

          <!-- Hover ring (non-selected) -->
          <div
            v-else
            class="absolute inset-1 rounded-xl bg-primary/0 group-hover/day:bg-primary/8 transition-colors"
          />

          <!-- Day number -->
          <span
            class="relative z-10 text-sm font-arabic transition-colors select-none font-bold"
            :class="[
              !cell.isCurrentMonth && 'opacity-25',
              cell.isSelected
                ? 'text-white'
                : cell.isToday
                  ? 'text-primary'
                  : 'text-on-surface/70 group-hover/day:text-primary'
            ]"
          >{{ cell.day }}</span>

          <!-- Today dot -->
          <div
            v-if="cell.isToday && !cell.isSelected"
            class="absolute bottom-1 inset-x-0 mx-auto w-1.5 h-1.5 rounded-full z-20"
            style="background-color: var(--color-primary);"
          />
        </div>
      </div>
    </div>
  </div>
</template>
