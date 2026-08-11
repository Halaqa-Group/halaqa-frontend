<script setup lang="ts">
import ConfirmDialog from '~/components/common/ConfirmDialog.vue'

definePageMeta({
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.achievements.title' }
  ]
})

const { t } = useI18n()
const toast = useToast()
const apiError = useApiError()
const { selectedHalaqaId, hasHalaqa } = useGlobalHalaqa()
const {
  selectedDate, filters, page, listTotal, limit, totalPages, isLoading, isSearching,
  deleteOpen, deleteTarget,
  loadAll, loadAchievements, deleteAchievement
} = useAchievements()

async function onDeleteConfirm() {
  const target = deleteTarget.value
  if (!target) return
  deleteTarget.value = null
  try {
    await deleteAchievement(target.id)
    toast.add({ title: t('pages.achievements.deletedToast'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: apiError.format(e, t('pages.achievements.deleteErrorTitle')), color: 'error' })
  }
}

function onPageChange(next: number) {
  page.value = next
  // A search already holds the whole scope in memory and pages over the matches
  // locally, so only the server-paged list needs a fetch here.
  if (!isSearching.value) loadAchievements()
}

watch(selectedHalaqaId, () => {
  page.value = 1
  loadAll()
})
watch([selectedDate, () => filters.trackType, () => filters.status], () => {
  page.value = 1
  loadAchievements()
})

// Starting or clearing a search changes how much has to be loaded — the whole
// scope versus one page. Typing further characters only narrows what's already
// here, so it re-filters without another request.
watch(isSearching, () => {
  page.value = 1
  loadAchievements()
})

// Narrowing a search can leave the current page past the end of the matches.
// Safe to do without a refetch only here: the search slice is derived from `page`,
// so it re-renders correctly the moment this changes.
watch(totalPages, (count) => {
  if (isSearching.value && page.value > count) page.value = Math.max(1, count)
})

// When offline work finishes syncing (draft recitations uploaded, queued deletes
// applied), the local draft rows are removed but the server list is still stale —
// reload it so the freshly-synced records appear without a manual refresh.
const { flushedAt: draftsFlushedAt } = useAchievementDrafts()
const { flushedAt: outboxFlushedAt } = useOfflineOutbox()
watch([draftsFlushedAt, outboxFlushedAt], () => {
  if (import.meta.client && navigator.onLine) loadAchievements()
})

onMounted(() => {
  loadAll()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AchievementFilterBar />

    <div
      v-if="!hasHalaqa"
      class="flex flex-col items-center gap-3 py-12 rounded-xl border border-default bg-default"
    >
      <UIcon name="i-lucide-layers" class="w-10 h-10 text-muted" />
      <p class="text-sm text-muted">
        {{ t('common.selectHalaqaPrompt') }}
      </p>
    </div>

    <!-- No parent box: the cards stand alone; the table brings its own border. -->
    <div v-else>
      <AchievementResults />

      <div v-if="totalPages > 1" class="flex justify-end border-t border-default px-0 py-3 sm:px-6">
        <UPagination
          :page="page"
          :total="listTotal"
          :items-per-page="limit"
          :disabled="isLoading"
          @update:page="onPageChange"
        />
      </div>
    </div>

    <ConfirmDialog
      v-model:open="deleteOpen"
      :title="t('pages.achievements.deleteConfirm.title')"
      :message="t('pages.achievements.deleteConfirm.message')"
      destructive
      :confirm-label="t('common.delete')"
      @confirm="onDeleteConfirm"
    />
  </div>
</template>
