<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { ApiAchievement } from '~/types'
import { SURAH_NAMES } from '~/data/constants'
import { formatVerseRange } from '~/utils/quran'
import { TRACK_BADGE_COLOR, achievementStatusColor, type AchievementTrack } from '~/utils/achievement'

const props = defineProps<{
  achievement: ApiAchievement
  studentName: string
  studentAvatar: string
  hideErrors?: boolean
  actions: DropdownMenuItem[][]
}>()

const { t } = useI18n()

const range = computed(() => formatVerseRange(
  props.achievement.start_surah, props.achievement.start_verse,
  props.achievement.end_surah, props.achievement.end_verse, SURAH_NAMES
))
const isApproved = computed(() => props.achievement.status === 'approved')
const totalErrors = computed(() => (props.achievement.mistakes_count ?? 0) + (props.achievement.warnings_count ?? 0))
</script>

<template>
  <div class="rounded-xl border border-default bg-default p-4 flex flex-col gap-3">
    <!-- Header: student + actions -->
    <div class="flex items-center gap-3">
      <img :src="studentAvatar" :alt="studentName" class="w-9 h-9 rounded-full object-cover border border-default shrink-0">
      <div class="min-w-0 flex-1">
        <p class="font-semibold truncate">
          {{ studentName }}
        </p>
      </div>
      <UDropdownMenu :items="actions" :content="{ align: 'end', collisionPadding: 12 }">
        <UButton
          icon="i-lucide-ellipsis-vertical"
          color="neutral"
          variant="ghost"
          square
          size="sm"
          :aria-label="t('pages.achievements.table.actions')"
        />
      </UDropdownMenu>
    </div>

    <!-- Badges -->
    <div class="flex flex-wrap items-center gap-2">
      <UBadge variant="subtle" :color="TRACK_BADGE_COLOR[achievement.track_type as AchievementTrack]">
        {{ t(`pages.achievements.tracks.${achievement.track_type}`) }}
      </UBadge>
      <UBadge variant="subtle" :color="achievementStatusColor(achievement.status)">
        {{ isApproved ? t('pages.achievements.statusApproved') : t('pages.achievements.statusPending') }}
      </UBadge>
    </div>

    <!-- Range -->
    <div class="flex items-center gap-2 text-sm text-muted">
      <UIcon name="i-lucide-book-open" class="w-4 h-4 shrink-0" />
      <span class="truncate">{{ range }}</span>
    </div>

    <!-- Footer: score + errors -->
    <div class="flex items-center justify-between border-t border-default pt-3">
      <div>
        <p class="text-xs text-muted">
          {{ t('pages.achievements.table.score') }}
        </p>
        <p class="text-lg font-bold tabular-nums">
          {{ Number(achievement.percentage_score) }}<span class="text-sm font-normal text-muted">%</span>
        </p>
      </div>
      <div v-if="!hideErrors" class="text-end">
        <p class="text-xs text-muted">
          {{ t('pages.achievements.table.errors') }}
        </p>
        <p class="text-lg font-bold tabular-nums">
          {{ totalErrors }}
        </p>
      </div>
    </div>

    <!-- Notes -->
    <p v-if="achievement.teacher_notes" class="text-xs text-muted line-clamp-2">
      {{ achievement.teacher_notes }}
    </p>
  </div>
</template>
