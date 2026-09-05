<script setup lang="ts">
import type { ApiAchievement } from '~/types'
import { SURAH_NAMES } from '~/data/constants'
import { formatVerseRange } from '~/utils/quran'
import { TRACK_BADGE_COLOR, achievementStatusColor, type AchievementTrack } from '~/utils/achievement'
import { formatYmd } from '~/utils/date'

const props = defineProps<{
  achievements: ApiAchievement[]
  loading?: boolean
}>()

const { t, locale } = useI18n()

function formatDate(iso: string | null | undefined): string {
  return formatYmd(iso, locale.value)
}

function range(a: ApiAchievement): string {
  return formatVerseRange(a.start_surah, a.start_verse, a.end_surah, a.end_verse, SURAH_NAMES)
}

// Newest first — parents care most about the latest recitations.
const sorted = computed(() =>
  [...props.achievements].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))
)
</script>

<template>
  <div class="pt-4">
    <div v-if="loading" class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-circle" class="w-6 h-6 animate-spin text-primary" />
    </div>

    <div v-else-if="sorted.length === 0" class="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <UIcon name="i-lucide-book-open" class="w-9 h-9 text-muted" />
      <p class="text-sm text-muted">
        {{ t('pages.parent.child.achievements.empty') }}
      </p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="a in sorted"
        :key="a.id"
        class="rounded-xl border border-default bg-default p-4 flex flex-col gap-3"
      >
        <div class="flex flex-wrap items-center gap-2">
          <UBadge variant="subtle" :color="TRACK_BADGE_COLOR[a.track_type as AchievementTrack]">
            {{ t(`pages.achievements.tracks.${a.track_type}`) }}
          </UBadge>
          <UBadge variant="subtle" :color="achievementStatusColor(a.status)">
            {{ a.status === 'approved' ? t('pages.achievements.statusApproved') : t('pages.achievements.statusPending') }}
          </UBadge>
          <span class="ms-auto text-xs text-muted">{{ formatDate(a.date) }}</span>
        </div>

        <div class="flex items-center gap-2 text-sm text-muted">
          <UIcon name="i-lucide-book-marked" class="w-4 h-4 shrink-0" />
          <span class="truncate">{{ range(a) }}</span>
        </div>

        <div class="flex items-center justify-between border-t border-default pt-3">
          <span class="text-xs text-muted">{{ t('pages.achievements.table.score') }}</span>
          <span class="text-lg font-bold tabular-nums">
            {{ Number(a.percentage_score) }}<span class="text-sm font-normal text-muted">%</span>
          </span>
        </div>

        <p v-if="a.teacher_notes" class="text-xs text-muted line-clamp-3">
          {{ a.teacher_notes }}
        </p>
      </div>
    </div>
  </div>
</template>
