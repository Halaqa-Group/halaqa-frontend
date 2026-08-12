<script setup lang="ts">
import type { ApiPlanLink } from '~/types'
import { SURAH_NAMES } from '~/data/constants'
import { formatVerseRange } from '~/utils/quran'
import { parseYmd } from '~/utils/date'
import { dateOfDayLabel } from '~/utils/plan'
import { creditedPages, creditedVerses, isPartialCredit } from '~/utils/plan-links'

// The recitations the server credited to one plan session — its **stored**
// settlement, not a guess. Each row is "this achievement covered this span of this
// session", so the credited range is often narrower than what was actually recited;
// the wider recording is shown underneath when they differ.
const props = defineProps<{
  links: ApiPlanLink[]
  // Hide the empty state where the surrounding UI already says "nothing yet"
  // (a session sitting at 0/n reads that on its own progress bar).
  hideEmpty?: boolean
}>()

const { t, locale } = useI18n()

const totalVerses = computed(() => creditedVerses(props.links))
const totalPages = computed(() => creditedPages(props.links))

function span(l: ApiPlanLink): string {
  return formatVerseRange(l.start_surah, l.start_verse, l.end_surah, l.end_verse, SURAH_NAMES)
}
// The achievement's own range — shown only when it ran past the session, which is
// why `credited_verses` can be smaller than what the student actually recited.
function recordedSpan(l: ApiPlanLink): string | null {
  const a = l.achievement
  if (!a || !isPartialCredit(l)) return null
  return formatVerseRange(a.start_surah, a.start_verse, a.end_surah, a.end_verse, SURAH_NAMES)
}
function dayLabel(date: string): string {
  return dateOfDayLabel(parseYmd(date), locale.value)
}
// Fractional by nature — a credited span rarely lands on a whole page.
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
  <div v-if="links.length || !hideEmpty" class="space-y-2">
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs font-medium text-muted">{{ t('pages.planner.links.title') }}</span>
      <span v-if="links.length" class="text-xs text-muted tabular-nums">
        {{ sizeLabel(totalVerses, totalPages) }}
      </span>
    </div>

    <p v-if="!links.length" class="text-xs text-muted">
      {{ t('pages.planner.links.none') }}
    </p>

    <ul v-else class="space-y-1.5">
      <li
        v-for="l in links"
        :key="l.id"
        class="rounded-lg border border-default px-2.5 py-2 space-y-1"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-medium truncate">{{ span(l) }}</span>
          <UBadge variant="subtle" color="neutral" size="sm" class="shrink-0 tabular-nums">
            {{ Math.round(Number(l.percentage_score)) }}%
          </UBadge>
        </div>
        <p class="text-[11px] text-muted">
          {{ dayLabel(l.achievement_date) }} · {{ sizeLabel(l.credited_verses, Number(l.credited_pages)) }}
        </p>
        <p v-if="recordedSpan(l)" class="text-[11px] text-muted">
          {{ t('pages.planner.links.recorded', { range: recordedSpan(l) }) }}
        </p>
      </li>
    </ul>
  </div>
</template>
