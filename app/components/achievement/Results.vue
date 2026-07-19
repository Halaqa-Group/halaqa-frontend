<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { ApiAchievement } from '~/types'
import { SURAH_NAMES } from '~/data/constants'
import { formatVerseRange } from '~/utils/quran'
import { TRACK_BADGE_COLOR, achievementStatusColor, type AchievementTrack } from '~/utils/achievement'

const { t } = useI18n()
const toast = useToast()
const { activeRole } = useAuth()
const { selectedHalaqaId } = useGlobalHalaqa()
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

const isParent = computed(() => activeRole.value === 'parent')
const canApprove = computed(() => ['principal', 'vice_principal', 'supervisor', 'teacher'].includes(activeRole.value ?? ''))
const canUnapprove = computed(() => ['principal', 'vice_principal'].includes(activeRole.value ?? ''))
const isPrincipal = computed(() => activeRole.value === 'principal')

function isApproved(a: ApiAchievement) {
  return a.status === 'approved'
}
function formatRange(a: ApiAchievement) {
  return formatVerseRange(a.start_surah, a.start_verse, a.end_surah, a.end_verse, SURAH_NAMES)
}
function formatScore(a: ApiAchievement) {
  return `${Number(a.percentage_score)}%`
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
    toast.add({ title: t('pages.achievements.approveErrorTitle'), description: e.data?.message || e.message, color: 'error' })
  }
}
async function onUnapprove(a: ApiAchievement) {
  try {
    await unapproveAchievement(a.id)
    toast.add({ title: t('pages.achievements.unapprovedToast'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: t('pages.achievements.unapproveErrorTitle'), description: e.data?.message || e.message, color: 'error' })
  }
}

function reciteLink(a: ApiAchievement) {
  return {
    path: '/recite',
    query: { student_id: a.student_id, halaqa_id: selectedHalaqaId.value, date: a.date }
  }
}

function rowActions(a: ApiAchievement): DropdownMenuItem[][] {
  const primary: DropdownMenuItem[] = [
    {
      label: t('pages.achievements.actions.recite'),
      icon: 'i-lucide-book-open',
      onSelect: () => navigateTo(reciteLink(a))
    }
  ]
  if (canApprove.value && !isApproved(a)) {
    primary.push({ label: t('pages.achievements.approve'), icon: 'i-lucide-check-check', onSelect: () => onApprove(a) })
  }
  if (canUnapprove.value && isApproved(a)) {
    primary.push({ label: t('pages.achievements.unapprove'), icon: 'i-lucide-undo-2', onSelect: () => onUnapprove(a) })
  }
  if (isParent.value) return [primary]

  if (!isApproved(a)) {
    primary.push({ label: t('pages.achievements.actions.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(a) })
  }
  primary.push({ label: t('pages.achievements.actions.duplicate'), icon: 'i-lucide-copy', onSelect: () => openDuplicate(a) })

  const canDelete = isApproved(a) ? isPrincipal.value : true
  if (!canDelete) return [primary]
  return [primary, [
    { label: t('pages.achievements.actions.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => requestDelete(a) }
  ]]
}

const columns = computed<TableColumn<ApiAchievement>[]>(() => {
  const cols: TableColumn<ApiAchievement>[] = [
    { accessorKey: 'student_id', header: t('pages.achievements.table.student') },
    { accessorKey: 'track_type', header: t('pages.achievements.table.track') },
    { id: 'range', header: t('pages.achievements.table.range') },
    { accessorKey: 'percentage_score', header: t('pages.achievements.table.score') }
  ]
  if (!isParent.value) cols.push({ id: 'errors', header: t('pages.achievements.table.errors') })
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
      <UTable :data="filteredAchievements" :columns="columns" :loading="isLoading" class="min-w-[760px]">
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

        <template #status-cell="{ row }">
          <UBadge variant="subtle" :color="achievementStatusColor(row.original.status)">
            {{ row.original.status === 'approved' ? t('pages.achievements.statusApproved') : t('pages.achievements.statusPending') }}
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <UDropdownMenu :items="rowActions(row.original)" :content="{ align: 'end', collisionPadding: 12 }">
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
