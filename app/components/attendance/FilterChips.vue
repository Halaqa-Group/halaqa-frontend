<script setup lang="ts">
import type { StatusFilter } from '~/composables/useAttendance'

const {
  statusFilter,
  setFilter,
  attendanceRows,
  presentCount,
  absentCount,
  lateCount
} = useAttendance()

const chips = computed<{ key: StatusFilter, label: string, count: number, accent: string }[]>(() => [
  { key: 'all', label: 'pages.attendance.filters.all', count: attendanceRows.value.length, accent: 'var(--color-track-all)' },
  { key: 'present', label: 'pages.attendance.filters.present', count: presentCount.value, accent: 'var(--color-track-hifz)' },
  { key: 'absent', label: 'pages.attendance.filters.absent', count: absentCount.value, accent: 'var(--color-track-near)' },
  { key: 'late', label: 'pages.attendance.filters.late', count: lateCount.value, accent: 'var(--color-track-far)' }
])
</script>

<template>
  <div class="flex items-center gap-2 flex-wrap">
    <button
      v-for="chip in chips"
      :key="chip.key"
      type="button"
      :aria-pressed="statusFilter === chip.key"
      class="inline-flex items-center gap-2 rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold cursor-pointer transition-all duration-150 ease-out border"
      :class="[
        statusFilter === chip.key
          ? 'text-white shadow-sm'
          : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low border-outline-variant'
      ]"
      :style="statusFilter === chip.key ? { backgroundColor: chip.accent, borderColor: chip.accent } : undefined"
      @click="setFilter(chip.key)"
    >
      <span>{{ $t(chip.label) }}</span>
      <span
        class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-bold"
        :class="statusFilter === chip.key ? 'bg-white/25 text-white' : 'bg-surface-container-low text-on-surface-variant'"
      >
        {{ chip.count }}
      </span>
    </button>
  </div>
</template>
