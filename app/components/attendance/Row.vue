<script setup lang="ts">
import type { AttendanceStatus } from '~/types'

const props = defineProps<{
  studentId: string
  name: string
  avatar: string
  currentSurah: string
  status: AttendanceStatus
}>()

const { setStatus } = useAttendance()

const statusButtons: { key: AttendanceStatus; label: string; color: string; activeColor: string }[] = [
  { key: 'present', label: 'حاضر', color: 'bg-[#E0F0EE] text-[#4A8E85]', activeColor: 'bg-[#4A8E85] text-white' },
  { key: 'late', label: 'متأخر', color: 'bg-[#FFF3E0] text-[#F57C00]', activeColor: 'bg-[#F57C00] text-white' },
  { key: 'absent', label: 'غائب', color: 'bg-[#FCE4EC] text-[#D81B60]', activeColor: 'bg-[#D81B60] text-white' }
]
</script>

<template>
  <div
    class="rounded-2xl p-4 flex items-center gap-4"
    style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);"
  >
    <!-- Avatar + status dot -->
    <div class="relative shrink-0">
      <img :src="avatar" class="w-10 h-10 rounded-full" :alt="name">
      <span
        class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
        :class="status === 'present' ? 'bg-[#4A8E85]' : status === 'late' ? 'bg-[#F57C00]' : 'bg-[#D81B60]'"
      />
    </div>

    <!-- Name + surah -->
    <div class="flex-1">
      <p class="body-lg font-arabic font-semibold" style="color: var(--color-on-surface);">{{ name }}</p>
      <p class="label-md font-arabic" style="color: var(--color-on-surface-variant);">{{ currentSurah }}</p>
    </div>

    <!-- Status buttons -->
    <div class="flex items-center gap-2">
      <button
        v-for="btn in statusButtons"
        :key="btn.key"
        class="px-3 py-1 rounded-full text-xs font-arabic transition-colors"
        :class="status === btn.key ? btn.activeColor : btn.color"
        @click="setStatus(studentId, btn.key)"
      >
        {{ btn.label }}
      </button>
    </div>
  </div>
</template>
