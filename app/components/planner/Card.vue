<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { ApiWeeklyPlanItem } from '~/types'
import { SURAH_NAMES } from '~/data/constants'
import { formatVerseRange } from '~/utils/quran'
import { TRACK_BADGE_COLOR, type AchievementTrack } from '~/utils/achievement'
import { planItemStatusColor } from '~/utils/plan'

const props = defineProps<{
  item: ApiWeeklyPlanItem
  dayLabel: string
  actions: DropdownMenuItem[][]
}>()

const { t } = useI18n()

const range = computed(() => formatVerseRange(
  props.item.start_surah, props.item.start_verse, props.item.end_surah, props.item.end_verse, SURAH_NAMES
))
const pct = computed(() => props.item.total_verses > 0
  ? Math.round((props.item.achieved_verses / props.item.total_verses) * 100)
  : 0)
const hasActions = computed(() => props.actions.length > 0)
</script>

<template>
  <div class="rounded-xl border border-default bg-default p-4 flex flex-col gap-3">
    <div class="flex items-center gap-2">
      <span class="font-semibold flex-1 truncate">{{ dayLabel }}</span>
      <UBadge variant="subtle" :color="TRACK_BADGE_COLOR[item.track_type as AchievementTrack]">
        {{ t(`pages.achievements.tracks.${item.track_type}`) }}
      </UBadge>
      <UDropdownMenu v-if="hasActions" :items="actions" :content="{ align: 'end', collisionPadding: 12 }">
        <UButton
          icon="i-lucide-ellipsis-vertical"
          color="neutral"
          variant="ghost"
          square
          size="sm"
          :aria-label="t('pages.planner.table.actions')"
        />
      </UDropdownMenu>
    </div>

    <div class="flex items-center gap-2 text-sm text-muted">
      <UIcon name="i-lucide-book-open" class="w-4 h-4 shrink-0" />
      <span class="truncate">{{ range }}</span>
    </div>

    <div class="flex items-center gap-2 border-t border-default pt-3">
      <div class="flex-1 h-1.5 rounded-full bg-elevated overflow-hidden">
        <div class="h-full rounded-full bg-primary" :style="{ width: `${pct}%` }" />
      </div>
      <UBadge variant="subtle" size="sm" :color="planItemStatusColor(item.status)">
        {{ item.achieved_verses }}/{{ item.total_verses }}
      </UBadge>
    </div>
  </div>
</template>
