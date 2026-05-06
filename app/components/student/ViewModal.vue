<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'

const { t } = useI18n()
const { isViewModalOpen, viewingStudent, closeView } = useStudents()

const activeTab = ref<'overview' | 'activity' | 'guardians' | 'notifications'>('overview')

watch(isViewModalOpen, (open) => {
  if (open) activeTab.value = 'overview'
})

const tabs = computed<TabsItem[]>(() => [
  { value: 'overview', label: t('pages.students.viewModal.tabs.overview'), icon: 'i-lucide-layout-dashboard' },
  { value: 'activity', label: t('pages.students.viewModal.tabs.activity'), icon: 'i-lucide-activity' },
  { value: 'guardians', label: t('pages.students.viewModal.tabs.guardians'), icon: 'i-lucide-users' },
  { value: 'notifications', label: t('pages.students.viewModal.tabs.notifications'), icon: 'i-lucide-bell' }
])
</script>

<template>
  <UModal
    v-model:open="isViewModalOpen"
    :ui="{ content: 'sm:max-w-6xl max-h-[90vh] overflow-hidden p-0 rounded-2xl' }"
    @close="closeView"
  >
    <template #content>
      <div v-if="viewingStudent" class="flex flex-col lg:flex-row min-h-[560px] max-h-[90vh]">
        <StudentViewProfilePanel :student="viewingStudent" />

        <div class="flex-1 overflow-y-auto p-6 lg:p-8 bg-surface-container-lowest">
          <UTabs
            v-model="activeTab"
            :items="tabs"
            variant="link"
            class="w-full"
            :ui="{ list: 'border-b border-outline-variant', trigger: 'px-4 py-3' }"
          >
            <template #content="{ item }">
              <StudentViewOverviewTab v-if="item.value === 'overview'" :student="viewingStudent" />
              <StudentViewActivityTab v-else-if="item.value === 'activity'" :student="viewingStudent" />
              <StudentViewGuardiansTab v-else-if="item.value === 'guardians'" :student="viewingStudent" />
              <StudentViewNotificationsTab v-else-if="item.value === 'notifications'" :student="viewingStudent" />
            </template>
          </UTabs>
        </div>
      </div>
    </template>
  </UModal>
</template>
