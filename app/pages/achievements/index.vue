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
const { canRecordAchievement: canRecord } = usePermissions()
const { selectedHalaqaId, hasHalaqa } = useGlobalHalaqa()
const {
  selectedDate, filters, page, total, limit, totalPages, isLoading,
  deleteOpen, deleteTarget,
  loadAll, loadAchievements, openRecord, deleteAchievement
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
  loadAchievements()
}

watch(selectedHalaqaId, () => {
  page.value = 1
  loadAll()
})
watch([selectedDate, () => filters.trackType, () => filters.status], () => {
  page.value = 1
  loadAchievements()
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
    <div v-if="canRecord && hasHalaqa" class="flex justify-end">
      <UButton
        icon="i-lucide-plus"
        class="shrink-0"
        @click="openRecord"
      >
        {{ t('pages.achievements.recordButton') }}
      </UButton>
    </div>

    <div
      v-if="!hasHalaqa"
      class="flex flex-col items-center gap-3 py-12 rounded-xl border border-default bg-default"
    >
      <UIcon name="i-lucide-layers" class="w-10 h-10 text-muted" />
      <p class="text-sm text-muted">
        {{ t('common.selectHalaqaPrompt') }}
      </p>
    </div>

    <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <AchievementFilterBar />
      </template>

      <AchievementResults />

      <template v-if="totalPages > 1" #footer>
        <div class="flex justify-end">
          <UPagination
            :page="page"
            :total="total"
            :items-per-page="limit"
            :disabled="isLoading"
            @update:page="onPageChange"
          />
        </div>
      </template>
    </UCard>

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
