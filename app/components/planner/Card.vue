<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { ApiPlanLink, ApiWeeklyPlanItem } from '~/types'
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
const { fetchItemLinks } = usePlanLinks()

const range = computed(() => formatVerseRange(
  props.item.start_surah, props.item.start_verse, props.item.end_surah, props.item.end_verse, SURAH_NAMES
))
const pct = computed(() => props.item.total_verses > 0
  ? Math.round((props.item.achieved_verses / props.item.total_verses) * 100)
  : 0)
const hasActions = computed(() => props.actions.length > 0)

// ── Which recitations paid for this session ─────────────────────────────────
// Fetched per item on demand rather than embedded: this card renders in lists that
// span whole terms (a parent's every week), where asking every plan for its links
// up front would be a costly read for something most cards never expand.
//
// An item at zero achieved has no rows by construction — `credited_verses` sums to
// `achieved_verses` — so it isn't offered at all.
const canExpand = computed(() => props.item.achieved_verses > 0)
const expanded = ref(false)
const links = ref<ApiPlanLink[] | null>(null)
const loadingLinks = ref(false)
const linksError = ref(false)

async function loadLinks() {
  if (links.value || loadingLinks.value) return
  loadingLinks.value = true
  linksError.value = false
  try {
    links.value = (await fetchItemLinks(props.item.id)).links
  } catch {
    linksError.value = true
  } finally {
    loadingLinks.value = false
  }
}

function onToggle(open: boolean) {
  expanded.value = open
  if (open) void loadLinks()
}

// Drop the cached rows when the card is pointed at another item, or the same item
// is re-credited (saving the draft reloads the plan). Refetch right away if the
// panel is open, so it never sits on rows that no longer describe the item.
watch(() => [props.item.id, props.item.achieved_verses], () => {
  links.value = null
  linksError.value = false
  if (expanded.value) void loadLinks()
})
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

    <UCollapsible v-if="canExpand" :default-open="false" @update:open="onToggle">
      <template #default="{ open }">
        <button type="button" class="flex w-full items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-link" class="w-3.5 h-3.5 shrink-0" />
          <span class="flex-1 text-start">{{ t('pages.planner.links.show') }}</span>
          <UIcon
            name="i-lucide-chevron-down"
            class="w-3.5 h-3.5 transition-transform shrink-0"
            :class="open && 'rotate-180'"
          />
        </button>
      </template>

      <template #content>
        <div class="pt-3">
          <div v-if="loadingLinks" class="flex justify-center py-2">
            <UIcon name="i-lucide-loader-circle" class="w-4 h-4 animate-spin text-primary" />
          </div>
          <p v-else-if="linksError" class="text-xs text-error">
            {{ t('pages.planner.links.loadError') }}
          </p>
          <PlannerSessionLinks v-else-if="links" :links="links" />
        </div>
      </template>
    </UCollapsible>
  </div>
</template>
