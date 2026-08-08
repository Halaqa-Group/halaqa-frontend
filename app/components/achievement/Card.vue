<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { ApiAchievement, RecitationPosition } from '~/types'
import { SURAH_NAMES } from '~/data/constants'
import { formatVerseRange } from '~/utils/quran'
import { TRACK_BADGE_COLOR, achievementStatusColor, type AchievementTrack } from '~/utils/achievement'

const props = defineProps<{
  achievement: ApiAchievement
  studentName: string
  studentAvatar: string
  actions: DropdownMenuItem[][]
}>()

const { t } = useI18n()

const range = computed(() => formatVerseRange(
  props.achievement.start_surah, props.achievement.start_verse,
  props.achievement.end_surah, props.achievement.end_verse, SURAH_NAMES
))
const isApproved = computed(() => props.achievement.status === 'approved')
// Draft rows (recorded offline, not yet synced) carry a `draft:`-prefixed id.
// (Server ids are also serialized as strings, so the prefix is what matters.)
const isDraft = computed(() =>
  typeof props.achievement.id === 'string' && props.achievement.id.startsWith('draft:')
)
const totalErrors = computed(() =>
  (props.achievement.mistakes_count ?? 0)
  + (props.achievement.warnings_count ?? 0)
  + (props.achievement.harakat_errors_count ?? 0)
)

// Tested spots — only meaningful for a partial `test` recitation. Each position
// carries its own range and error counts (parents get ranges only).
const isTest = computed(() => props.achievement.recitation_method === 'test')
const spots = computed<RecitationPosition[]>(() => props.achievement.recitation_positions ?? [])
function spotRange(p: RecitationPosition): string {
  return formatVerseRange(p.start_surah, p.start_verse, p.end_surah, p.end_verse, SURAH_NAMES)
}
function spotErrors(p: RecitationPosition): number {
  return (p.mistakes_count ?? 0) + (p.warnings_count ?? 0)
    + (p.harakat_errors_count ?? 0)
}
function spotErrorLabel(p: RecitationPosition): string {
  const n = spotErrors(p)
  return n === 0 ? t('pages.achievements.spotClean') : t('pages.achievements.spotErrorsCount', { n })
}
</script>

<template>
  <div class="rounded-xl border border-default bg-default p-4 flex flex-col gap-3">
    <div class="flex items-center gap-3">
      <img :src="studentAvatar" :alt="studentName" class="w-9 h-9 rounded-full object-cover border border-default shrink-0">
      <div class="min-w-0 flex-1">
        <p class="font-semibold truncate">
          {{ studentName }}
        </p>
      </div>
      <UDropdownMenu v-if="actions.length" :items="actions" :content="{ align: 'end', collisionPadding: 12 }">
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

    <div class="flex flex-wrap items-center gap-2">
      <UBadge variant="subtle" :color="TRACK_BADGE_COLOR[achievement.track_type as AchievementTrack]">
        {{ t(`pages.achievements.tracks.${achievement.track_type}`) }}
      </UBadge>
      <UBadge
        v-if="achievement.recitation_method === 'test'"
        variant="subtle"
        color="neutral"
        icon="i-lucide-list-checks"
      >
        {{ t('pages.achievements.methodTest') }}
      </UBadge>
      <UBadge
        v-else-if="achievement.recitation_method === 'untracked'"
        variant="subtle"
        color="neutral"
        icon="i-lucide-gauge"
      >
        {{ t('pages.achievements.methodUntracked') }}
      </UBadge>
      <UBadge
        v-if="isDraft"
        color="warning"
        variant="soft"
        icon="i-lucide-cloud-off"
      >
        {{ t('pwa.notSynced') }}
      </UBadge>
      <UBadge variant="subtle" :color="achievementStatusColor(achievement.status)">
        {{ isApproved ? t('pages.achievements.statusApproved') : t('pages.achievements.statusPending') }}
      </UBadge>
    </div>

    <div class="flex items-center gap-2 text-sm text-muted">
      <UIcon name="i-lucide-book-open" class="w-4 h-4 shrink-0" />
      <span class="truncate">{{ range }}</span>
    </div>

    <!-- Tested spots (partial `test` recitation): each spot's range + error tally. -->
    <div v-if="isTest && spots.length" class="flex flex-col gap-1.5 rounded-lg border border-default bg-elevated/40 p-2.5" dir="rtl">
      <p class="text-xs font-medium text-muted">
        {{ t('pages.achievements.testedSpots') }} ({{ spots.length }})
      </p>
      <div
        v-for="(p, i) in spots"
        :key="i"
        class="flex items-center justify-between gap-2 text-xs"
      >
        <span class="flex min-w-0 items-center gap-1.5">
          <span class="font-bold text-primary">{{ i + 1 }}</span>
          <span class="truncate">{{ spotRange(p) }}</span>
        </span>
        <span
          class="shrink-0 tabular-nums"
          :class="spotErrors(p) === 0 ? 'text-success' : 'text-muted'"
        >
          {{ spotErrorLabel(p) }}
        </span>
      </div>
    </div>

    <div class="flex items-center justify-between border-t border-default pt-3">
      <div>
        <p class="text-xs text-muted">
          {{ t('pages.achievements.table.score') }}
        </p>
        <p class="text-lg font-bold tabular-nums">
          {{ Number(achievement.percentage_score) }}<span class="text-sm font-normal text-muted">%</span>
        </p>
      </div>
      <div class="text-end">
        <p class="text-xs text-muted">
          {{ t('pages.achievements.table.errors') }}
        </p>
        <p class="text-lg font-bold tabular-nums">
          {{ totalErrors }}
        </p>
      </div>
    </div>

    <p v-if="achievement.teacher_notes" class="text-xs text-muted line-clamp-2">
      {{ achievement.teacher_notes }}
    </p>
  </div>
</template>
