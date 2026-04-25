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

function getTrackConfig(trackType: string) {
  return TRACK_TYPES.find(t => t.value === trackType) || TRACK_TYPES[0]
}

function formatRange(a: ApiAchievement): string {
  return formatVerseRange(a.start_surah, a.start_verse, a.end_surah, a.end_verse, SURAH_NAMES)
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
      <p class="text-sm font-normal leading-relaxed text-center" style="color: var(--color-on-surface-variant);">
        لا توجد إنجازات لهذا الطالب اليوم
      </p>
    </div>

    <!-- Achievement cards -->
    <div
      v-for="achievement in achievements"
      :key="achievement.id"
      class="rounded-2xl p-5"
      style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);"
    >
      <!-- Track badge + delete -->
      <div class="flex items-center justify-between mb-4">
        <div
          class="px-3 py-1.5 rounded-full flex items-center gap-2"
          :style="`background-color: ${getTrackConfig(achievement.track_type).bgColor};`"
        >
          <UIcon name="i-lucide-award" class="w-3.5 h-3.5" :style="`color: ${getTrackConfig(achievement.track_type).color};`" />
          <span
            class="label-sm font-bold"
            :style="`color: ${getTrackConfig(achievement.track_type).color};`"
          >{{ getTrackConfig(achievement.track_type).label }}</span>
        </div>
        <UButton
          variant="ghost"
          color="error"
          icon="i-lucide-trash-2"
          size="sm"
          class="w-8 h-8 rounded-full justify-center"
          @click="emit('delete', achievement.id)"
        />
      </div>

      <!-- Quran range -->
      <div class="flex items-center gap-2 mb-4 px-1">
        <UIcon name="i-lucide-book-open" class="w-4 h-4 shrink-0" style="color: var(--color-on-surface-variant);" />
        <p class="text-sm font-normal leading-relaxed" style="color: var(--color-on-surface);">
          {{ formatRange(achievement) }}
        </p>
      </div>

      <!-- Error counters -->
      <div class="grid grid-cols-3 gap-2 mb-3">
        <div class="rounded-xl py-1.5 px-2 text-center" style="background-color: var(--color-surface-container-low);">
          <p class="text-[10px] mb-0.5" style="color: var(--color-on-surface-variant);">
            أخطاء
          </p>
          <p class="text-sm font-bold" style="color: var(--color-on-surface);">
            {{ achievement.mistakes_count }}
          </p>
        </div>
        <div class="rounded-xl py-1.5 px-2 text-center" style="background-color: var(--color-surface-container-low);">
          <p class="text-[10px] mb-0.5" style="color: var(--color-on-surface-variant);">
            تنبيهات
          </p>
          <p class="text-sm font-bold" style="color: var(--color-on-surface);">
            {{ achievement.warnings_count }}
          </p>
        </div>
        <div class="rounded-xl py-1.5 px-2 text-center" style="background-color: var(--color-surface-container-low);">
          <p class="text-[10px] mb-0.5" style="color: var(--color-on-surface-variant);">
            تجويد
          </p>
          <p class="text-sm font-bold" style="color: var(--color-on-surface);">
            {{ achievement.tajweed_errors_count }}
          </p>
        </div>
      </div>

      <!-- Teacher notes -->
      <div
        v-if="achievement.teacher_notes"
        class="rounded-2xl px-4 py-3"
        style="background-color: var(--color-surface-container-low);"
      >
        <p class="label-sm mb-1" style="color: var(--color-on-surface-variant);">
          ملاحظات
        </p>
        <p class="body-sm" style="color: var(--color-on-surface);">
          {{ achievement.teacher_notes }}
        </p>
      </div>

      <!-- Flags -->
      <div v-if="achievement.is_unplanned || achievement.is_flagged_conflict" class="mt-3 flex flex-col gap-1.5">
        <div
          v-if="achievement.is_unplanned"
          class="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style="background-color: #FFF3E0;"
        >
          <UIcon name="i-lucide-alert-triangle" class="w-3.5 h-3.5" style="color: #C76400;" />
          <p class="label-sm" style="color: #C76400;">
            إنجاز غير مخطط
          </p>
        </div>
        <div
          v-if="achievement.is_flagged_conflict"
          class="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style="background-color: #FCE4EC;"
        >
          <UIcon name="i-lucide-alert-circle" class="w-3.5 h-3.5" style="color: #B5174E;" />
          <p class="label-sm" style="color: #B5174E;">
            تعارض مع الحضور
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
