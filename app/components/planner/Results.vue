<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { ApiWeeklyPlanItem } from '~/types'
import { SURAH_NAMES } from '~/data/constants'
import { formatVerseRange } from '~/utils/quran'
import { TRACK_BADGE_COLOR, type AchievementTrack } from '~/utils/achievement'
import { planItemStatusColor } from '~/utils/plan'

const { t, locale } = useI18n()
const { activeRole } = useAuth()
const {
  plan, items, filteredItems, planStatus, isLoading, viewMode, selectedStudentId,
  hasActiveFilters, clearFilters, dateOfDay, openAdd, openEdit, requestDelete
} = useWeeklyPlan()

const canModify = computed(() => activeRole.value !== 'parent' && planStatus.value !== 'approved')

function dayLabel(it: ApiWeeklyPlanItem) {
  const d = dateOfDay(it.day_of_week)
  try {
    return d.toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : locale.value, { weekday: 'long', day: 'numeric', month: 'short' })
  } catch {
    return String(it.day_of_week)
  }
}
function range(it: ApiWeeklyPlanItem) {
  return formatVerseRange(it.start_surah, it.start_verse, it.end_surah, it.end_verse, SURAH_NAMES)
}
function pct(it: ApiWeeklyPlanItem) {
  return it.total_verses > 0 ? Math.round((it.achieved_verses / it.total_verses) * 100) : 0
}

function rowActions(it: ApiWeeklyPlanItem): DropdownMenuItem[][] {
  if (!canModify.value) return []
  return [[
    { label: t('pages.planner.actions.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(it) },
    { label: t('pages.planner.actions.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => requestDelete(it) }
  ]]
}

const columns = computed<TableColumn<ApiWeeklyPlanItem>[]>(() => {
  const cols: TableColumn<ApiWeeklyPlanItem>[] = [
    { id: 'day', header: t('pages.planner.table.day') },
    { accessorKey: 'track_type', header: t('pages.planner.table.track') },
    { id: 'range', header: t('pages.planner.table.range') },
    { id: 'progress', header: t('pages.planner.table.progress') }
  ]
  if (canModify.value) cols.push({ id: 'actions', header: t('pages.planner.table.actions') })
  return cols
})
</script>

<template>
  <div v-if="isLoading && !plan" class="flex justify-center py-16">
    <LucideLoaderCircle class="w-8 h-8 animate-spin text-primary" />
  </div>

  <!-- No student picked -->
  <div v-else-if="!selectedStudentId" class="flex flex-col items-center justify-center gap-3 py-14">
    <UIcon name="i-lucide-user-round" class="w-10 h-10 text-muted" />
    <p class="text-sm text-muted">
      {{ t('pages.planner.selectStudent') }}
    </p>
  </div>

  <!-- No plan / no items yet -->
  <div v-else-if="items.length === 0" class="flex flex-col items-center justify-center gap-3 py-14">
    <UIcon name="i-lucide-book-open" class="w-10 h-10 text-muted" />
    <p class="text-sm text-muted">
      {{ t('pages.planner.noPlan') }}
    </p>
    <UButton v-if="canModify" icon="i-lucide-plus" size="sm" @click="openAdd">
      {{ t('pages.planner.addItem') }}
    </UButton>
  </div>

  <!-- No match -->
  <div v-else-if="filteredItems.length === 0" class="flex flex-col items-center justify-center gap-3 py-14">
    <UIcon name="i-lucide-search-x" class="w-8 h-8 text-muted" />
    <p class="text-sm text-muted">
      {{ t('pages.planner.noMatch') }}
    </p>
    <UButton
      v-if="hasActiveFilters"
      variant="soft"
      color="neutral"
      icon="i-lucide-x"
      size="sm"
      @click="clearFilters"
    >
      {{ t('pages.planner.filters.clear') }}
    </UButton>
  </div>

  <template v-else>
    <!-- Grid -->
    <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 sm:p-6">
      <PlannerCard
        v-for="it in filteredItems"
        :key="it.id"
        :item="it"
        :day-label="dayLabel(it)"
        :actions="rowActions(it)"
      />
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <UTable :data="filteredItems" :columns="columns" :loading="isLoading" class="min-w-[700px]">
        <template #day-cell="{ row }">
          <span class="font-medium">{{ dayLabel(row.original) }}</span>
        </template>

        <template #track_type-cell="{ row }">
          <UBadge variant="subtle" :color="TRACK_BADGE_COLOR[row.original.track_type as AchievementTrack]">
            {{ t(`pages.achievements.tracks.${row.original.track_type}`) }}
          </UBadge>
        </template>

        <template #range-cell="{ row }">
          <span class="text-sm">{{ range(row.original) }}</span>
        </template>

        <template #progress-cell="{ row }">
          <div class="flex items-center gap-2 min-w-[160px]">
            <div class="flex-1 h-1.5 rounded-full bg-elevated overflow-hidden">
              <div class="h-full rounded-full bg-primary" :style="{ width: `${pct(row.original)}%` }" />
            </div>
            <UBadge variant="subtle" size="sm" :color="planItemStatusColor(row.original.status)">
              {{ row.original.achieved_verses }}/{{ row.original.total_verses }}
            </UBadge>
          </div>
        </template>

        <template #actions-cell="{ row }">
          <UDropdownMenu v-if="canModify" :items="rowActions(row.original)" :content="{ align: 'end', collisionPadding: 12 }">
            <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" square :aria-label="t('pages.planner.table.actions')" />
          </UDropdownMenu>
        </template>
      </UTable>
    </div>
  </template>
</template>
