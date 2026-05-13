<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type { Student } from '~/types'

defineProps<{ student: Student }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const activeTab = ref<'overview' | 'guardians'>('overview')

const tabs = computed<TabsItem[]>(() => [
  { value: 'overview', label: t('pages.students.viewModal.tabs.overview'), icon: 'i-lucide-layout-dashboard' },
  { value: 'guardians', label: t('pages.students.viewModal.tabs.guardians'), icon: 'i-lucide-users' }
])

const modalOpen = ref(true)
watch(modalOpen, (open) => {
  if (!open) emit('close')
})
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    :title="student.name"
    :ui="{ content: 'sm:max-w-5xl rounded-2xl' }"
  >
    <UButton class="sr-only" tabindex="-1" />

    <template #body>
      <div class="flex flex-col lg:flex-row gap-6 -m-2">
        <StudentViewProfilePanel :student="student" @close="emit('close')" />

        <div class="flex-1 min-w-0">
          <UTabs
            v-model="activeTab"
            :items="tabs"
            variant="link"
            class="w-full"
          >
            <template #content="{ item }">
              <StudentViewOverviewTab v-if="item.value === 'overview'" :student="student" />
              <StudentViewGuardiansTab v-else-if="item.value === 'guardians'" :student="student" />
            </template>
          </UTabs>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end w-full">
        <UButton variant="soft" color="neutral" @click="emit('close')">
          {{ t('pages.students.viewModal.close') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
