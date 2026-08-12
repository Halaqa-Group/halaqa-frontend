<script setup lang="ts">
import type { ApiPlanLink } from '~/types'
import { SURAH_NAMES } from '~/data/constants'
import { formatVerseRange } from '~/utils/quran'
import { parseYmd } from '~/utils/date'
import { dateOfDayLabel } from '~/utils/plan'
import { TRACK_BADGE_COLOR, type AchievementTrack } from '~/utils/achievement'
import { creditedPages, creditedVerses } from '~/utils/plan-links'

// What the student recited this week that no session planned. These rows carry no
// plan item by construction, so they belong to the week — showing them under a day
// or a session would attribute work to a session that never asked for it.
const { t, locale } = useI18n()
const { hasLinks, outsidePlanLinks } = useWeeklyPlan()

// Hidden entirely when the plan was fetched without `?include=links`: absent rows
// mean "not asked for", which is not the same as "nothing was recited off-plan".
const visible = computed(() => hasLinks.value && outsidePlanLinks.value.length > 0)

const totalVerses = computed(() => creditedVerses(outsidePlanLinks.value))
const totalPages = computed(() => creditedPages(outsidePlanLinks.value))

function span(l: ApiPlanLink): string {
  return formatVerseRange(l.start_surah, l.start_verse, l.end_surah, l.end_verse, SURAH_NAMES)
}
function dayLabel(date: string): string {
  return dateOfDayLabel(parseYmd(date), locale.value)
}
function sizeLabel(verses: number, pages: number): string {
  const parts = [t('pages.achievements.versesCount', { count: verses })]
  if (pages > 0) {
    const rounded = Math.round(pages * 10) / 10
    parts.push(t('pages.achievements.pagesCount', {
      count: Number.isInteger(rounded) ? rounded : rounded.toFixed(1)
    }))
  }
  return parts.join(' · ')
}
</script>

<template>
  <section v-if="visible" class="rounded-xl border border-default bg-default">
    <UCollapsible :default-open="false">
      <template #default="{ open }">
        <button type="button" class="flex w-full items-center gap-2 p-4 text-start">
          <UIcon name="i-lucide-book-marked" class="w-4 h-4 text-muted shrink-0" />
          <span class="text-sm font-semibold flex-1 truncate">
            {{ t('pages.planner.links.outsideTitle') }}
          </span>
          <UBadge variant="subtle" color="neutral" size="sm" class="tabular-nums shrink-0">
            {{ sizeLabel(totalVerses, totalPages) }}
          </UBadge>
          <UIcon
            name="i-lucide-chevron-down"
            class="w-4 h-4 text-muted transition-transform shrink-0"
            :class="open && 'rotate-180'"
          />
        </button>
      </template>

      <template #content>
        <div class="px-4 pb-4 space-y-2">
          <p class="text-xs text-muted">
            {{ t('pages.planner.links.outsideHint') }}
          </p>
          <ul class="space-y-1.5">
            <li
              v-for="l in outsidePlanLinks"
              :key="l.id"
              class="flex items-center justify-between gap-2 rounded-lg border border-default bg-elevated px-3 py-2"
            >
              <div class="min-w-0">
                <p class="text-sm truncate">
                  {{ span(l) }}
                </p>
                <p class="text-xs text-muted">
                  {{ dayLabel(l.achievement_date) }} · {{ sizeLabel(l.credited_verses, Number(l.credited_pages)) }}
                </p>
              </div>
              <UBadge
                variant="subtle"
                size="sm"
                class="shrink-0"
                :color="TRACK_BADGE_COLOR[l.track_type as AchievementTrack]"
              >
                {{ t(`pages.achievements.tracks.${l.track_type}`) }}
              </UBadge>
            </li>
          </ul>
        </div>
      </template>
    </UCollapsible>
  </section>
</template>
