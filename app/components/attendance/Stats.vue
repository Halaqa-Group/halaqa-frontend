<script setup lang="ts">
import type { StatusFilter } from '~/composables/useAttendance'

const { t } = useI18n()
const {
  attendanceRate,
  presentCount,
  absentCount,
  lateCount,
  attendanceRows,
  statusFilter,
  toggleFilter
} = useAttendance()

type Tile = {
  key: StatusFilter
  label: string
  icon: string
  primaryValue: string | number
  caption: string
  accent: string
  bg: string
  ringClass: string
  showProgress?: boolean
}

const tiles = computed<Tile[]>(() => [
  {
    key: 'all',
    label: t('pages.attendance.statsLabels.attendanceRate'),
    icon: 'i-lucide-user-check',
    primaryValue: `${attendanceRate.value}%`,
    caption: t('pages.attendance.statsLabels.ofTotal', { present: presentCount.value, total: attendanceRows.value.length }),
    accent: 'var(--color-track-all)',
    bg: 'var(--color-track-all-bg)',
    ringClass: 'ring-track-all',
    showProgress: true
  },
  {
    key: 'present',
    label: t('pages.attendance.statsLabels.present'),
    icon: 'i-lucide-users',
    primaryValue: presentCount.value,
    caption: t('pages.attendance.statsLabels.studentUnit'),
    accent: 'var(--color-track-hifz)',
    bg: 'var(--color-track-hifz-bg)',
    ringClass: 'ring-track-hifz'
  },
  {
    key: 'absent',
    label: t('pages.attendance.statsLabels.absent'),
    icon: 'i-lucide-user-x',
    primaryValue: absentCount.value,
    caption: t('pages.attendance.statsLabels.studentUnit'),
    accent: 'var(--color-track-near)',
    bg: 'var(--color-track-near-bg)',
    ringClass: 'ring-track-near'
  },
  {
    key: 'late',
    label: t('pages.attendance.statsLabels.late'),
    icon: 'i-lucide-clock',
    primaryValue: lateCount.value,
    caption: t('pages.attendance.statsLabels.studentUnit'),
    accent: 'var(--color-track-far)',
    bg: 'var(--color-track-far-bg)',
    ringClass: 'ring-track-far'
  }
])

function isActive(key: StatusFilter) {
  return statusFilter.value === key
}
</script>

<template>
  <div class="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
    <button
      v-for="tile in tiles"
      :key="tile.key"
      type="button"
      :aria-pressed="isActive(tile.key)"
      class="rounded-2xl p-4 sm:p-5 text-start cursor-pointer transition-all duration-200 ease-out shadow-card hover:-translate-y-0.5"
      :class="isActive(tile.key) ? `ring-2 ring-offset-2 ${tile.ringClass} -translate-y-0.5 shadow-lg` : ''"
      :style="{ backgroundColor: tile.bg }"
      @click="toggleFilter(tile.key)"
    >
      <div class="flex items-center justify-between mb-2 gap-2">
        <span class="text-xs sm:text-sm font-bold leading-tight" :style="{ color: tile.accent }">{{ tile.label }}</span>
        <UIcon :name="tile.icon" class="w-7 h-7 sm:w-9 sm:h-9 shrink-0" :style="{ color: tile.accent }" />
      </div>
      <p class="text-2xl sm:text-3xl font-bold leading-tight" :style="{ color: tile.accent }">
        {{ tile.primaryValue }}
      </p>
      <p class="text-xs sm:text-base font-medium leading-relaxed mt-1" :style="{ color: tile.accent }">
        {{ tile.caption }}
      </p>
      <div
        v-if="tile.showProgress"
        class="mt-3 h-2 rounded-full overflow-hidden"
        :style="{ backgroundColor: `color-mix(in srgb, ${tile.accent} 18%, transparent)` }"
      >
        <div
          class="h-full rounded-full transition-all duration-300 ease-out"
          :style="{ width: `${attendanceRate}%`, backgroundColor: tile.accent }"
        />
      </div>
    </button>
  </div>
</template>
