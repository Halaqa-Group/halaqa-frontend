<script setup lang="ts">
import type { Student } from '~/types'

const props = defineProps<{ student: Student }>()
const { t } = useI18n()

const dailyTracks = computed(() => [
  { label: t('pages.students.card.dailyHifz'), value: props.student.dailyHifzPagesCapacity },
  { label: t('pages.students.card.dailyNear'), value: props.student.dailyNearPagesCapacity },
  { label: t('pages.students.card.dailyFar'), value: props.student.dailyFarPagesCapacity }
])

function clampPercent(n: number) {
  return Math.min(Math.max(n, 0), 100)
}

const hasPerformance = computed(() =>
  props.student.attendance !== null || props.student.progress !== null
)
</script>

<template>
  <div class="flex flex-col gap-6 pt-6">
    <!-- Current surah headline -->
    <div class="rounded-xl p-6 bg-surface-container-low">
      <span class="label-md block mb-1 text-on-surface-variant">
        {{ $t('pages.students.card.currentSurah') }}
      </span>
      <span class="display-md text-on-surface">{{ student.currentSurah ?? '—' }}</span>
    </div>

    <!-- Performance stat tiles -->
    <div v-if="hasPerformance" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div v-if="student.attendance !== null" class="rounded-xl p-5 border border-outline-variant">
        <div class="flex items-center justify-between gap-3 mb-3">
          <span class="label-md text-on-surface-variant flex items-center gap-2">
            <LucideCalendarCheck class="w-4 h-4 text-secondary" />
            {{ $t('pages.students.viewModal.attendanceRate') }}
          </span>
          <span class="text-2xl font-bold text-on-surface">{{ student.attendance }}%</span>
        </div>
        <div class="w-full h-2 rounded-full overflow-hidden bg-primary-container">
          <div
            class="h-full bg-primary transition-all duration-300"
            :style="{ width: `${clampPercent(student.attendance)}%` }"
          />
        </div>
      </div>
      <div v-if="student.progress !== null" class="rounded-xl p-5 border border-outline-variant">
        <div class="flex items-center justify-between gap-3 mb-3">
          <span class="label-md text-on-surface-variant flex items-center gap-2">
            <LucideTarget class="w-4 h-4 text-secondary" />
            {{ $t('pages.students.viewModal.progress') }}
          </span>
          <span class="text-2xl font-bold text-on-surface">{{ student.progress }}%</span>
        </div>
        <div class="w-full h-2 rounded-full overflow-hidden bg-primary-container">
          <div
            class="h-full bg-secondary transition-all duration-300"
            :style="{ width: `${clampPercent(student.progress)}%` }"
          />
        </div>
      </div>
    </div>

    <!-- General notes -->
    <div
      v-if="student.notes"
      class="rounded-xl p-5 border border-outline-variant bg-surface-container-low"
    >
      <h4 class="body-lg font-bold mb-3 flex items-center gap-2 text-on-surface">
        <LucideStickyNote class="w-5 h-5 text-secondary" />
        {{ $t('pages.students.viewModal.generalNotesTitle') }}
      </h4>
      <p class="body-md text-on-surface whitespace-pre-line">
        {{ student.notes }}
      </p>
    </div>

    <!-- Daily capacity -->
    <div class="rounded-xl p-5 border border-outline-variant">
      <h4 class="body-lg font-bold mb-4 flex items-center gap-2 text-on-surface">
        <LucideBarChart2 class="w-5 h-5 text-secondary" />
        {{ $t('pages.students.viewModal.dailyCapacityTitle') }}
      </h4>
      <div class="grid grid-cols-3 gap-3">
        <div
          v-for="(track, i) in dailyTracks"
          :key="i"
          class="rounded-lg p-4 bg-surface-container-low text-center"
        >
          <span class="label-md text-on-surface-variant block mb-2">{{ track.label }}</span>
          <span class="text-2xl font-bold text-primary block">{{ track.value }}</span>
          <span class="label-md text-on-surface-variant">
            {{ $t('pages.students.card.pagesUnit') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
