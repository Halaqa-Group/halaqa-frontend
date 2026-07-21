<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { ApiAchievement } from '~/types'
import { SURAH_NAMES } from '~/data/constants'
import { formatVerseRange } from '~/utils/quran'
import { TRACK_BADGE_COLOR, achievementStatusColor, type AchievementTrack } from '~/utils/achievement'

const { t } = useI18n()
const toast = useToast()
const apiError = useApiError()
const {
  isParent,
  isStaff,
  canApproveAchievement,
  canUnapproveAchievement,
  canDeleteAchievement
} = usePermissions()
const {
  achievements,
  filteredAchievements,
  isLoading,
  viewMode,
  hasActiveFilters,
  clearFilters,
  studentDisplayName,
  studentAvatar,
  openRecord,
  openEdit,
  openDuplicate,
  requestDelete,
  approveAchievement,
  unapproveAchievement
} = useAchievements()

function isApproved(a: ApiAchievement) {
  return a.status === 'approved'
}
function formatRange(a: ApiAchievement) {
  return formatVerseRange(a.start_surah, a.start_verse, a.end_surah, a.end_verse, SURAH_NAMES)
}
function formatScore(a: ApiAchievement) {
  return `${Number(a.percentage_score)}%`
}
// Where the achievement was recorded from. Rows predating the mushaf flow carry
// no completion_method — those all came from the quick-entry form.
function sourceOf(a: ApiAchievement): 'mushaf' | 'quick' {
  return a.completion_method === 'mushaf' ? 'mushaf' : 'quick'
}
function totalErrors(a: ApiAchievement) {
  return (a.mistakes_count ?? 0) + (a.warnings_count ?? 0)
    + (a.tajweed_errors_count ?? 0) + (a.harakat_errors_count ?? 0)
}

async function onApprove(a: ApiAchievement) {
  try {
    await approveAchievement(a.id)
    toast.add({ title: t('pages.achievements.approvedToast'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: apiError.format(e, t('pages.achievements.approveErrorTitle')), color: 'error' })
  }
}
async function onUnapprove(a: ApiAchievement) {
  try {
    await unapproveAchievement(a.id)
    toast.add({ title: t('pages.achievements.unapprovedToast'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: apiError.format(e, t('pages.achievements.unapproveErrorTitle')), color: 'error' })
  }
}

function reciteLink(a: ApiAchievement) {
  // Use the achievement's own halaqa (not the global filter, which is null when
  // the list is browsed unscoped — that left the recite page with no halaqa_id
  // and stuck on its "select a student" prompt). Carry the track + range too, so
  // recite opens on this exact session instead of falling back to the day's plan.
  return {
    path: '/recite',
    query: {
      achievement_id: a.id,
      student_id: a.student_id,
      halaqa_id: a.halaqa_id,
      date: a.date,
      track: a.track_type,
      start_surah: a.start_surah,
      start_verse: a.start_verse,
      end_surah: a.end_surah,
      end_verse: a.end_verse
    }
  }
}

// Drop empty groups so the trigger can hide entirely — with recite gone, a parent
// looking at a form-entered record has no actions left at all.
function compact(groups: DropdownMenuItem[][]): DropdownMenuItem[][] {
  return groups.filter(g => g.length > 0)
}

function rowActions(a: ApiAchievement): DropdownMenuItem[][] {
  const primary: DropdownMenuItem[] = []
  // Only a mushaf recitation can be reopened on the mushaf. A form-entered record
  // has no per-word data — its errors are synthesized at the range's first word —
  // so the page would render a blank mushaf with nothing highlighted.
  if (sourceOf(a) === 'mushaf') {
    primary.push({
      label: t('pages.achievements.actions.recite'),
      icon: 'i-lucide-book-open',
      onSelect: () => navigateTo(reciteLink(a))
    })
  }
  // Approving is scoped to the achievement's own halaqa: an assistant teacher
  // is in scope to record but not to approve.
  if (canApproveAchievement(a.halaqa_id) && !isApproved(a)) {
    primary.push({ label: t('pages.achievements.approve'), icon: 'i-lucide-check-check', onSelect: () => onApprove(a) })
  }
  if (canUnapproveAchievement.value && isApproved(a)) {
    primary.push({ label: t('pages.achievements.unapprove'), icon: 'i-lucide-undo-2', onSelect: () => onUnapprove(a) })
  }
  if (!isStaff.value) return compact([primary])

  if (!isApproved(a)) {
    primary.push({ label: t('pages.achievements.actions.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(a) })
  }
  primary.push({ label: t('pages.achievements.actions.duplicate'), icon: 'i-lucide-copy', onSelect: () => openDuplicate(a) })

  if (!canDeleteAchievement(isApproved(a))) return compact([primary])
  return compact([primary, [
    { label: t('pages.achievements.actions.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => requestDelete(a) }
  ]])
}

const columns = computed<TableColumn<ApiAchievement>[]>(() => {
  const cols: TableColumn<ApiAchievement>[] = [
    { accessorKey: 'student_id', header: t('pages.achievements.table.student') },
    { accessorKey: 'track_type', header: t('pages.achievements.table.track') },
    { id: 'range', header: t('pages.achievements.table.range') },
    { accessorKey: 'percentage_score', header: t('pages.achievements.table.score') }
  ]
  if (!isParent.value) cols.push({ id: 'errors', header: t('pages.achievements.table.errors') })
  cols.push({ accessorKey: 'completion_method', header: t('pages.achievements.table.source') })
  cols.push({ accessorKey: 'status', header: t('pages.achievements.table.status') })
  cols.push({ id: 'actions', header: t('pages.achievements.table.actions') })
  return cols
})
</script>

<template>
  <div v-if="isLoading && achievements.length === 0" class="flex justify-center py-16">
    <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary" />
  </div>

  <div v-else-if="achievements.length === 0" class="flex flex-col items-center justify-center gap-3 py-14">
    <UIcon name="i-lucide-award" class="w-10 h-10 text-muted" />
    <p class="text-sm text-muted">
      {{ t('pages.achievements.noResults') }}
    </p>
    <UButton v-if="!isParent" icon="i-lucide-plus" size="sm" @click="openRecord">
      {{ t('pages.achievements.recordButton') }}
    </UButton>
  </div>

  <div v-else-if="filteredAchievements.length === 0" class="flex flex-col items-center justify-center gap-3 py-14">
    <UIcon name="i-lucide-search-x" class="w-8 h-8 text-muted" />
    <p class="text-sm text-muted">
      {{ t('pages.achievements.noMatch') }}
    </p>
    <UButton
      v-if="hasActiveFilters"
      variant="soft"
      color="neutral"
      icon="i-lucide-x"
      size="sm"
      @click="clearFilters"
    >
      {{ t('pages.achievements.filters.clear') }}
    </UButton>
  </div>

  <template v-else>
    <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 sm:p-6">
      <AchievementCard
        v-for="a in filteredAchievements"
        :key="a.id"
        :achievement="a"
        :student-name="studentDisplayName(a)"
        :student-avatar="studentAvatar(a.student_id)"
        :hide-errors="isParent"
        :actions="rowActions(a)"
      />
    </div>

    <div v-else class="overflow-x-auto">
      <UTable :data="filteredAchievements" :columns="columns" :loading="isLoading" class="min-w-[880px]">
        <template #student_id-cell="{ row }">
          <div class="flex items-center gap-3 min-w-0">
            <img
              :src="studentAvatar(row.original.student_id)"
              :alt="studentDisplayName(row.original)"
              class="w-8 h-8 rounded-full object-cover border border-default shrink-0"
            >
            <span class="font-medium truncate">{{ studentDisplayName(row.original) }}</span>
          </div>
        </template>

        <template #track_type-cell="{ row }">
          <UBadge variant="subtle" :color="TRACK_BADGE_COLOR[row.original.track_type as AchievementTrack]">
            {{ t(`pages.achievements.tracks.${row.original.track_type}`) }}
          </UBadge>
        </template>

        <template #range-cell="{ row }">
          <span class="text-sm">{{ formatRange(row.original) }}</span>
        </template>

        <template #percentage_score-cell="{ row }">
          <span class="tabular-nums font-medium">{{ formatScore(row.original) }}</span>
        </template>

        <template #errors-cell="{ row }">
          <span class="tabular-nums text-muted">{{ totalErrors(row.original) }}</span>
        </template>

        <template #completion_method-cell="{ row }">
          <UBadge
            variant="subtle"
            :color="sourceOf(row.original) === 'mushaf' ? 'primary' : 'neutral'"
            :icon="sourceOf(row.original) === 'mushaf' ? 'i-lucide-book-open' : 'i-lucide-clipboard-list'"
          >
            {{ t(`pages.achievements.sources.${sourceOf(row.original)}`) }}
          </UBadge>
        </template>

        <template #status-cell="{ row }">
          <UBadge variant="subtle" :color="achievementStatusColor(row.original.status)">
            {{ row.original.status === 'approved' ? t('pages.achievements.statusApproved') : t('pages.achievements.statusPending') }}
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <UDropdownMenu
            v-if="rowActions(row.original).length"
            :items="rowActions(row.original)"
            :content="{ align: 'end', collisionPadding: 12 }"
          >
            <UButton
              icon="i-lucide-ellipsis-vertical"
              color="neutral"
              variant="ghost"
              square
              :aria-label="t('pages.achievements.table.actions')"
            />
          </UDropdownMenu>
        </template>
      </UTable>
    </div>
  </template>
</template>
