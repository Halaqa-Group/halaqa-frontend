<script setup lang="ts">
import { computed } from 'vue'
import type { ApiAchievement } from '~/types'

const props = defineProps<{
  achievements: ApiAchievement[]
}>()

const stats = computed(() => {
  const list = props.achievements
  const totalAchievements = list.length
  const totalErrors = list.reduce((s, a) => s + a.mistakes_count + a.warnings_count, 0)
  const tajweedAvg = list.length
    ? Math.round((list.reduce((s, a) => s + a.tajweed_errors_count, 0) / list.length) * 10) / 10
    : 0

  let quality: { label: string, textClass: string, bgClass: string }
  if (totalErrors <= 2) {
    quality = { label: 'ممتاز', textClass: 'text-status-ok', bgClass: 'bg-status-ok-bg' }
  } else if (totalErrors <= 5) {
    quality = { label: 'جيد', textClass: 'text-status-warning', bgClass: 'bg-status-warning-bg' }
  } else {
    quality = { label: 'يحتاج مراجعة', textClass: 'text-error', bgClass: 'bg-track-near-bg' }
  }

  return { totalAchievements, totalErrors, tajweedAvg, quality }
})
</script>

<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <div class="rounded-2xl p-3 sm:p-4 flex items-center gap-3 ring ring-card-border bg-surface-container-lowest">
      <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary-container">
        <LucideAward class="w-5 h-5 text-primary" />
      </div>
      <div class="min-w-0">
        <p class="text-xl font-bold leading-tight tabular-nums text-on-surface truncate">
          {{ stats.totalAchievements }}
        </p>
        <p class="text-xs font-semibold mt-0.5 text-on-surface-variant truncate">
          إنجازات اليوم
        </p>
      </div>
    </div>

    <div class="rounded-2xl p-3 sm:p-4 flex items-center gap-3 ring ring-card-border bg-surface-container-lowest">
      <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-track-near-bg">
        <LucideAlertCircle class="w-5 h-5 text-track-near" />
      </div>
      <div class="min-w-0">
        <p class="text-xl font-bold leading-tight tabular-nums text-on-surface truncate">
          {{ stats.totalErrors }}
        </p>
        <p class="text-xs font-semibold mt-0.5 text-on-surface-variant truncate">
          مجموع الأخطاء
        </p>
      </div>
    </div>

    <div class="rounded-2xl p-3 sm:p-4 flex items-center gap-3 ring ring-card-border bg-surface-container-lowest">
      <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-status-ok-bg">
        <LucideSparkles class="w-5 h-5 text-status-ok" />
      </div>
      <div class="min-w-0">
        <p class="text-xl font-bold leading-tight tabular-nums text-on-surface truncate">
          {{ stats.tajweedAvg }}<span class="text-xs font-normal opacity-70">/10</span>
        </p>
        <p class="text-xs font-semibold mt-0.5 text-on-surface-variant truncate">
          متوسط التجويد
        </p>
      </div>
    </div>

    <div class="rounded-2xl p-3 sm:p-4 flex items-center gap-3 ring ring-card-border bg-surface-container-lowest">
      <div
        class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        :class="stats.quality.bgClass"
      >
        <LucideActivity class="w-5 h-5" :class="stats.quality.textClass" />
      </div>
      <div class="min-w-0">
        <span
          class="inline-block text-xs font-bold px-2.5 py-1 rounded-full"
          :class="[stats.quality.textClass, stats.quality.bgClass]"
        >
          {{ stats.quality.label }}
        </span>
        <p class="text-xs font-semibold mt-1 text-on-surface-variant">
          مؤشر الجلسة
        </p>
      </div>
    </div>
  </div>
</template>
