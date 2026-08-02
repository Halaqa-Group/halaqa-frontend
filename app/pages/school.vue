<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.school.title' }
  ]
})

const { t } = useI18n()
const { activeRole } = useAuth()

// School details (the form that used to live on the home screen) is principal-only,
// so non-principals land straight on the calendar with no empty tab.
const canSeeDetails = computed(() => activeRole.value === 'principal')

const tab = ref<'details' | 'calendar'>('details')

const tabItems = computed<TabsItem[]>(() => [
  { value: 'details', label: t('pages.school.tabs.details'), icon: 'i-lucide-building-2' },
  { value: 'calendar', label: t('pages.school.tabs.calendar'), icon: 'i-lucide-calendar-days' }
])
</script>

<template>
  <div class="flex flex-col gap-6">
    <CommonPageTabs
      v-if="canSeeDetails"
      v-model="tab"
      :items="tabItems"
      variant="link"
      class="w-full"
      flush-top
    >
      <template #content="{ item }">
        <div v-if="item.value === 'details'" class="mt-4">
          <SchoolSummaryCard />
        </div>
        <div v-else-if="item.value === 'calendar'" class="mt-4">
          <SchoolCalendarPanel />
        </div>
      </template>
    </CommonPageTabs>

    <SchoolCalendarPanel v-else />
  </div>
</template>
