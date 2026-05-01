<script setup lang="ts">
import { computed } from 'vue'
import { SURAH_NAMES, TRACK_TYPES } from '~/data/constants'
import { formatVerseRange, totalVersesInRange } from '~/utils/quran'
import type { ApiAchievement } from '~/types'

const props = defineProps<{
  achievements: ApiAchievement[]
  editingId?: number | null
}>()

const emit = defineEmits<{
  delete: [id: number]
  edit: [achievement: ApiAchievement]
  duplicate: [achievement: ApiAchievement]
}>()

type TrackKey = 'Hifz' | 'Near' | 'Far'

const TRACK_CLASS: Record<TrackKey, { textClass: string, bgClass: string }> = {
  Hifz: { textClass: 'text-track-hifz', bgClass: 'bg-track-hifz-bg' },
  Near: { textClass: 'text-track-near', bgClass: 'bg-track-near-bg' },
  Far:  { textClass: 'text-track-far', bgClass: 'bg-track-far-bg' }
}

const QUALITY = {
  good: { label: 'ممتاز', textClass: 'text-status-ok', bgClass: 'bg-status-ok-bg' },
  fair: { label: 'مقبول', textClass: 'text-status-warning', bgClass: 'bg-status-warning-bg' },
  poor: { label: 'ضعيف', textClass: 'text-error', bgClass: 'bg-track-near-bg' }
} as const

function getTrackConfig(trackType: string) {
  return TRACK_TYPES.find(t => t.value === trackType) || TRACK_TYPES[0]
}

function getTrackClass(trackType: string) {
  return TRACK_CLASS[(trackType as TrackKey)] ?? TRACK_CLASS.Hifz
}

function formatRange(a: ApiAchievement): string {
  return formatVerseRange(a.start_surah, a.start_verse, a.end_surah, a.end_verse, SURAH_NAMES)
}

function totalErrors(a: ApiAchievement): number {
  return a.mistakes_count + a.warnings_count
}

function quality(errors: number) {
  if (errors <= 2) return QUALITY.good
  if (errors <= 5) return QUALITY.fair
  return QUALITY.poor
}

const totals = computed(() => {
  const totalVerses = props.achievements.reduce(
    (sum, a) => sum + totalVersesInRange(a.start_surah, a.start_verse, a.end_surah, a.end_verse),
    0
  )
  const totalMistakes = props.achievements.reduce((sum, a) => sum + a.mistakes_count + a.warnings_count, 0)
  const tajweedAvg = props.achievements.length
    ? props.achievements.reduce((sum, a) => sum + a.tajweed_errors_count, 0) / props.achievements.length
    : 0
  return {
    totalVerses,
    totalMistakes,
    tajweedAvg: Math.round(tajweedAvg * 10) / 10
  }
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Empty state -->
    <div
      v-if="achievements.length === 0"
      class="rounded-2xl p-8 flex flex-col items-center gap-3 bg-surface-container-lowest"
    >
      <UIcon name="i-lucide-award" class="w-10 h-10 text-on-surface-variant" />
      <p class="text-sm font-normal leading-relaxed text-center text-on-surface-variant">
        لا توجد إنجازات لهذا الطالب اليوم
      </p>
    </div>

    <!-- Achievement cards with slide-in transition -->
    <TransitionGroup
      v-else
      name="achievement-slide"
      tag="div"
      class="flex flex-col gap-3"
    >
      <div
        v-for="achievement in achievements"
        :key="achievement.id"
        class="rounded-2xl p-5 relative bg-surface-container-lowest ring ring-card-border"
        :class="editingId === achievement.id ? 'ring-2 ring-primary' : ''"
      >
        <!-- Track badge + quality + actions -->
        <div class="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div class="flex items-center gap-2">
            <div
              class="px-3 py-1.5 rounded-full flex items-center gap-2"
              :class="getTrackClass(achievement.track_type).bgClass"
            >
              <UIcon
                name="i-lucide-award"
                class="w-3.5 h-3.5"
                :class="getTrackClass(achievement.track_type).textClass"
              />
              <span
                class="text-xs font-bold"
                :class="getTrackClass(achievement.track_type).textClass"
              >{{ getTrackConfig(achievement.track_type).label }}</span>
            </div>

            <!-- Quality tag -->
            <span
              class="px-2.5 py-1 rounded-full text-[11px] font-bold"
              :class="[
                quality(totalErrors(achievement)).textClass,
                quality(totalErrors(achievement)).bgClass
              ]"
            >
              {{ quality(totalErrors(achievement)).label }}
            </span>
          </div>

          <div class="flex items-center gap-1">
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-copy"
              size="sm"
              class="w-8 h-8 rounded-full justify-center"
              :aria-label="'نسخ الإنجاز'"
              @click="emit('duplicate', achievement)"
            />
            <UButton
              variant="ghost"
              color="primary"
              icon="i-lucide-pencil"
              size="sm"
              class="w-8 h-8 rounded-full justify-center"
              :aria-label="'تعديل الإنجاز'"
              @click="emit('edit', achievement)"
            />
            <UButton
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              size="sm"
              class="w-8 h-8 rounded-full justify-center"
              :aria-label="'حذف الإنجاز'"
              @click="emit('delete', achievement.id)"
            />
          </div>
        </div>

        <!-- Quran range -->
        <div class="flex items-center gap-2 mb-4 px-1">
          <UIcon name="i-lucide-book-open" class="w-4 h-4 shrink-0 text-on-surface-variant" />
          <p class="text-sm font-normal leading-relaxed text-on-surface">
            {{ formatRange(achievement) }}
          </p>
        </div>

        <!-- Error counters -->
        <div class="grid grid-cols-3 gap-2 mb-3">
          <div class="rounded-xl py-1.5 px-2 text-center bg-track-near-bg">
            <p class="text-[10px] mb-0.5 text-track-near">
              أخطاء
            </p>
            <p class="text-sm font-bold text-track-near">
              {{ achievement.mistakes_count }}
            </p>
          </div>
          <div class="rounded-xl py-1.5 px-2 text-center bg-status-warning-bg">
            <p class="text-[10px] mb-0.5 text-status-warning">
              تنبيهات
            </p>
            <p class="text-sm font-bold text-status-warning">
              {{ achievement.warnings_count }}
            </p>
          </div>
          <div class="rounded-xl py-1.5 px-2 text-center bg-status-ok-bg">
            <p class="text-[10px] mb-0.5 text-status-ok">
              تجويد
            </p>
            <p class="text-sm font-bold text-status-ok">
              {{ achievement.tajweed_errors_count }}<span class="text-[10px] font-normal opacity-70">/10</span>
            </p>
          </div>
        </div>

        <!-- Teacher notes -->
        <div
          v-if="achievement.teacher_notes"
          class="rounded-2xl px-4 py-3 bg-surface-container-low"
        >
          <p class="text-xs mb-1 text-on-surface-variant">
            ملاحظات المعلم
          </p>
          <p class="text-sm text-on-surface">
            {{ achievement.teacher_notes }}
          </p>
        </div>

        <!-- Flags -->
        <div v-if="achievement.is_unplanned || achievement.is_flagged_conflict" class="mt-3 flex flex-col gap-1.5">
          <div
            v-if="achievement.is_unplanned"
            class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-status-warning-bg"
          >
            <UIcon name="i-lucide-alert-triangle" class="w-3.5 h-3.5 text-status-warning" />
            <p class="text-xs text-status-warning">
              إنجاز غير مخطط
            </p>
          </div>
          <div
            v-if="achievement.is_flagged_conflict"
            class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-track-near-bg"
          >
            <UIcon name="i-lucide-alert-circle" class="w-3.5 h-3.5 text-track-near" />
            <p class="text-xs text-track-near">
              تعارض مع الحضور
            </p>
          </div>
        </div>
      </div>
    </TransitionGroup>

    <!-- Summary footer -->
    <div
      v-if="achievements.length > 0"
      class="mt-2 rounded-2xl p-4 flex items-center justify-between gap-2 bg-surface-container-low border border-card-border"
    >
      <div class="text-center flex-1">
        <p class="text-[10px] font-bold uppercase tracking-wider mb-1 text-on-surface-variant">
          مجموع الآيات
        </p>
        <p class="text-sm font-bold tabular-nums text-on-surface">
          {{ totals.totalVerses }} <span class="text-[10px] font-normal text-on-surface-variant">آية</span>
        </p>
      </div>
      <div class="w-px h-8 bg-card-border" />
      <div class="text-center flex-1">
        <p class="text-[10px] font-bold uppercase tracking-wider mb-1 text-on-surface-variant">
          مجموع الأخطاء
        </p>
        <p class="text-sm font-bold tabular-nums text-track-near">
          {{ totals.totalMistakes }}
        </p>
      </div>
      <div class="w-px h-8 bg-card-border" />
      <div class="text-center flex-1">
        <p class="text-[10px] font-bold uppercase tracking-wider mb-1 text-on-surface-variant">
          متوسط التجويد
        </p>
        <p class="text-sm font-bold tabular-nums text-status-ok">
          {{ totals.tajweedAvg }}<span class="text-[10px] font-normal opacity-70">/10</span>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.achievement-slide-enter-active,
.achievement-slide-leave-active {
  transition: all 0.25s ease;
}
.achievement-slide-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}
.achievement-slide-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
.achievement-slide-move {
  transition: transform 0.25s ease;
}
</style>
