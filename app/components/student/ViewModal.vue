<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type { Student } from '~/types'

defineProps<{ student: Student }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const activeTab = ref<'overview' | 'activity' | 'guardians' | 'notifications'>('overview')

const tabs = computed<TabsItem[]>(() => [
  { value: 'overview', label: t('pages.students.viewModal.tabs.overview'), icon: 'i-lucide-layout-dashboard' },
  { value: 'activity', label: t('pages.students.viewModal.tabs.activity'), icon: 'i-lucide-activity' },
  { value: 'guardians', label: t('pages.students.viewModal.tabs.guardians'), icon: 'i-lucide-users' },
  { value: 'notifications', label: t('pages.students.viewModal.tabs.notifications'), icon: 'i-lucide-bell' }
])
</script>

<template>
  <UModal :ui="{ content: 'sm:max-w-6xl max-h-[90vh] overflow-hidden p-0 rounded-2xl' }">
    <template #content>
      <div class="flex flex-col lg:flex-row min-h-[560px] max-h-[90vh]">
        <StudentViewProfilePanel :student="student" @close="emit('close')" />

        <div class="flex-1 overflow-y-auto p-6 lg:p-8 bg-surface-container-lowest">
          <UTabs
            v-model="activeTab"
            :items="tabs"
            variant="link"
            class="w-full"
            :ui="{ list: 'border-b border-outline-variant', trigger: 'px-4 py-3' }">
            <template #content="{ item }">
              <StudentViewOverviewTab v-if="item.value === 'overview'" :student="student" />
              <StudentViewActivityTab v-else-if="item.value === 'activity'" :student="student" />
              <StudentViewGuardiansTab v-else-if="item.value === 'guardians'" :student="student" />
              <StudentViewNotificationsTab v-else-if="item.value === 'notifications'" :student="student" />
            </template>
          </UTabs>
        </div>
      </div>
    </template>
  </UModal>
</template>
