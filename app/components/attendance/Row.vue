<script setup lang="ts">
import type { AttendanceStatus } from '~/types'

const props = defineProps<{
  studentId: string
  name: string
  avatar: string
  currentSurah: string
  status: AttendanceStatus
  notes: string
}>()

const { setStatus, setNote } = useAttendance()

const statusButtons: {
  key: AttendanceStatus
  label: string
  activeClass: string
  hoverClass: string
}[] = [
  {
    key: 'present',
    label: 'حاضر',
    activeClass: 'bg-[#E0F0EE] text-[#2A6B64] font-semibold',
    hoverClass: 'text-muted hover:bg-[#E0F0EE] hover:text-[#2A6B64]'
  },
  {
    key: 'late',
    label: 'متأخر',
    activeClass: 'bg-[#FFF3E0] text-[#C76400] font-semibold',
    hoverClass: 'text-muted hover:bg-[#FFF3E0] hover:text-[#C76400]'
  },
  {
    key: 'absent',
    label: 'غائب',
    activeClass: 'bg-[#FCE4EC] text-[#B5174E] font-semibold',
    hoverClass: 'text-muted hover:bg-[#FCE4EC] hover:text-[#B5174E]'
  }
]

const statusDotClass = computed(() => {
  if (props.status === 'present') return 'bg-[#2A6B64]'
  if (props.status === 'late') return 'bg-[#C76400]'
  return 'bg-[#B5174E]'
})
</script>

<template>
  <div
    class="bg-white border border-outline-variant rounded-[40px] p-5 flex flex-col xl:flex-row xl:items-center gap-4 group hover:border-primary/20 hover:shadow-sm transition-all duration-300"
    dir="rtl"
  >
    <!-- Col 1 (rightmost in RTL): Student profile -->
    <div class="flex items-center gap-4 xl:flex-1">
      <div class="relative shrink-0">
        <div class="w-14 h-14 rounded-full overflow-hidden border-2 border-default">
          <img :src="avatar" :alt="name" class="w-full h-full object-cover">
        </div>
        <span
          class="absolute bottom-0 end-0 w-3.5 h-3.5 rounded-full border-2 border-white"
          :class="statusDotClass"
        />
      </div>
      <div class="min-w-0">
        <h4 class="font-bold font-arabic text-on-surface leading-tight truncate text-xl">{{ name }}</h4>
      </div>
    </div>

    <!-- Col 2 (center): Status pill -->
    <div class="flex justify-center xl:flex-1 xl:pe-12">
      <div class="flex items-center bg-elevated p-1 rounded-full border border-default">
        <button
          v-for="btn in statusButtons"
          :key="btn.key"
          class="px-5 py-1.5 text-base font-arabic rounded-full transition-all cursor-pointer"
          :class="status === btn.key ? btn.activeClass : `text-muted ${btn.hoverClass}`"
          @click="setStatus(studentId, btn.key)"
        >
          {{ btn.label }}
        </button>
      </div>
    </div>

    <!-- Col 3 (leftmost in RTL): Note textarea -->
    <textarea
      :value="notes"
      rows="2"
      :placeholder="`ملاحظة خاصة بـ ${name}...`"
      class="xl:flex-1 w-full resize-none rounded-xl px-4 py-2.5 text-base font-arabic outline-none transition-all focus:ring-1 focus:ring-primary"
      style="background-color: var(--color-surface-container-low); color: var(--color-on-surface);"
      @input="setNote(studentId, ($event.target as HTMLTextAreaElement).value)"
    />
  </div>
</template>
