<script setup lang="ts">
import { SURAH_NAMES, TRACK_TYPES } from '~/data/constants'
import { formatVerseRange } from '~/utils/quran'
import type { ApiAchievement } from '~/types'

const props = defineProps<{
  achievements: ApiAchievement[]
}>()

const emit = defineEmits<{
  delete: [id: number]
}>()

function getTrackTypeConfig(trackType: string) {
  return TRACK_TYPES.find(t => t.value === trackType) || TRACK_TYPES[0]
}

function formatRange(achievement: ApiAchievement): string {
  return formatVerseRange(
    achievement.start_surah,
    achievement.start_verse,
    achievement.end_surah,
    achievement.end_verse,
    SURAH_NAMES
  )
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Empty state -->
    <div
      v-if="achievements.length === 0"
      class="rounded-2xl p-8 flex flex-col items-center gap-3"
      style="background-color: var(--color-surface-container-lowest);"
    >
      <UIcon name="i-lucide-award" class="w-10 h-10" style="color: var(--color-on-surface-variant);" />
      <p class="body-md font-arabic text-center" style="color: var(--color-on-surface-variant);">
        لا توجد إنجازات لهذا الطالب اليوم
      </p>
    </div>

    <!-- Achievement cards -->
    <div
      v-for="achievement in achievements"
      :key="achievement.id"
      class="rounded-2xl p-4"
      style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);"
    >
      <!-- Header: Track type badge + delete button -->
      <div class="flex items-center justify-between mb-3">
        <div
          class="px-3 py-1 rounded-full flex items-center gap-2"
          :style="`background-color: ${getTrackTypeConfig(achievement.track_type).bgColor};`"
        >
          <UIcon name="i-lucide-award" class="w-3 h-3" :style="`color: ${getTrackTypeConfig(achievement.track_type).color};`" />
          <span
            class="label-sm font-arabic font-semibold"
            :style="`color: ${getTrackTypeConfig(achievement.track_type).color};`"
          >
            {{ getTrackTypeConfig(achievement.track_type).label }}
          </span>
        </div>

        <button
          class="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[--color-error-container]"
          @click="emit('delete', achievement.id)"
        >
          <UIcon name="i-lucide-trash-2" class="w-4 h-4" style="color: var(--color-error);" />
        </button>
      </div>

      <!-- Quran range -->
      <div class="flex items-center gap-2 mb-3">
        <UIcon name="i-lucide-book-open" class="w-4 h-4" style="color: var(--color-on-surface-variant);" />
        <p class="body-md font-arabic" style="color: var(--color-on-surface);">
          {{ formatRange(achievement) }}
        </p>
      </div>

      <!-- Error counters -->
      <div class="grid grid-cols-3 gap-2 mb-3">
        <!-- Mistakes -->
        <div
          class="rounded-xl p-2 text-center"
          style="background-color: var(--color-surface-container-low);"
        >
          <p class="label-xs font-arabic" style="color: var(--color-on-surface-variant);">أخطاء</p>
          <p class="body-lg font-semibold" style="color: var(--color-on-surface);">
            {{ achievement.mistakes_count }}
          </p>
        </div>

        <!-- Warnings -->
        <div
          class="rounded-xl p-2 text-center"
          style="background-color: var(--color-surface-container-low);"
        >
          <p class="label-xs font-arabic" style="color: var(--color-on-surface-variant);">تنبيهات</p>
          <p class="body-lg font-semibold" style="color: var(--color-on-surface);">
            {{ achievement.warnings_count }}
          </p>
        </div>

        <!-- Tajweed -->
        <div
          class="rounded-xl p-2 text-center"
          style="background-color: var(--color-surface-container-low);"
        >
          <p class="label-xs font-arabic" style="color: var(--color-on-surface-variant);">تجويد</p>
          <p class="body-lg font-semibold" style="color: var(--color-on-surface);">
            {{ achievement.tajweed_errors_count }}
          </p>
        </div>
      </div>

      <!-- Teacher notes (if any) -->
      <div
        v-if="achievement.teacher_notes"
        class="rounded-xl p-3"
        style="background-color: var(--color-surface-container-low);"
      >
        <p class="label-sm font-arabic mb-1" style="color: var(--color-on-surface-variant);">ملاحظات:</p>
        <p class="body-sm font-arabic" style="color: var(--color-on-surface);">
          {{ achievement.teacher_notes }}
        </p>
      </div>

      <!-- Flags (unplanned/conflict) -->
      <div v-if="achievement.is_unplanned || achievement.is_flagged_conflict" class="mt-3 flex flex-col gap-1">
        <div
          v-if="achievement.is_unplanned"
          class="flex items-center gap-2 px-2 py-1 rounded-lg"
          style="background-color: #FFF3E0;"
        >
          <UIcon name="i-lucide-alert-triangle" class="w-3 h-3" style="color: #F57C00;" />
          <p class="label-sm font-arabic" style="color: #F57C00;">إنجاز غير مخطط</p>
        </div>

        <div
          v-if="achievement.is_flagged_conflict"
          class="flex items-center gap-2 px-2 py-1 rounded-lg"
          style="background-color: #FCE4EC;"
        >
          <UIcon name="i-lucide-alert-circle" class="w-3 h-3" style="color: #D81B60;" />
          <p class="label-sm font-arabic" style="color: #D81B60;">تعارض مع الحضور</p>
        </div>
      </div>
    </div>
  </div>
</template>
