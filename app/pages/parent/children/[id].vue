<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import { formatYmd } from '~/utils/date'

definePageMeta({
  middleware: ['parent-only'],
  breadcrumb: [
    { label: 'pages.parent.title', to: '/parent' }
  ]
})

const route = useRoute()
const { t, locale } = useI18n()

const childId = computed(() => String(route.params.id))
const { child, achievements, weeklyPlans, attendance, isLoading, error, fetchAll } = useChildProgress(childId)

// Header shows the child's name in place of the generic breadcrumb crumb.
useSetPageTitle(() => child.value?.name)
// Back button lives in the header, before the title.
useSetPageBack('/parent')

function formatDate(iso: string | null): string {
  return formatYmd(iso, locale.value)
}

const statusColor = computed<'success' | 'warning' | 'info' | 'error'>(() => {
  if (!child.value) return 'info'
  if (child.value.deletedAt) return 'error'
  if (child.value.status === 'active') return 'success'
  if (child.value.status === 'inactive') return 'warning'
  return 'info'
})

const statusLabel = computed(() => {
  if (!child.value) return ''
  if (child.value.deletedAt) return t('pages.students.statusDeleted')
  if (child.value.status === 'active') return t('pages.students.statusActive')
  if (child.value.status === 'inactive') return t('pages.students.statusInactive')
  return t('pages.students.statusGraduated')
})

const tabs = computed<TabsItem[]>(() => [
  { value: 'overview', label: t('pages.students.viewModal.tabs.overview'), icon: 'i-lucide-layout-dashboard' },
  { value: 'achievements', label: t('pages.parent.child.tabs.achievements'), icon: 'i-lucide-award' },
  { value: 'weeklyPlan', label: t('pages.parent.child.tabs.weeklyPlan'), icon: 'i-lucide-book-open' },
  { value: 'attendance', label: t('pages.parent.child.tabs.attendance'), icon: 'i-lucide-user-check' },
  { value: 'guardians', label: t('pages.students.viewModal.tabs.guardians'), icon: 'i-lucide-users' }
])

const activeTab = ref<'overview' | 'achievements' | 'weeklyPlan' | 'attendance' | 'guardians'>('overview')

onMounted(fetchAll)
watch(childId, fetchAll)
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="isLoading && !child" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div v-else-if="error" class="rounded-2xl p-6 text-center bg-status-conflict-bg">
      <UIcon name="i-lucide-alert-circle" class="w-8 h-8 mx-auto mb-2 text-status-conflict" />
      <p class="text-status-conflict">
        {{ error }}
      </p>
    </div>

    <div v-else-if="child" class="flex flex-col lg:flex-row gap-6">
      <UCard class="w-full lg:w-72 shrink-0" :ui="{ body: 'p-5' }">
        <div class="flex flex-col items-center text-center gap-4">
          <img
            :src="child.avatar"
            :alt="child.name"
            class="w-24 h-24 rounded-full object-cover border border-default"
          >
          <div class="space-y-1">
            <h2 class="text-lg font-semibold">
              {{ child.name }}
            </h2>
            <p v-if="child.idNumber" class="text-xs text-muted tabular-nums" dir="ltr">
              {{ child.idNumber }}
            </p>
            <UBadge variant="subtle" :color="statusColor" :label="statusLabel" />
          </div>

          <div class="w-full text-sm space-y-2 pt-2 border-t border-default">
            <div class="flex justify-between items-center gap-3">
              <span class="text-muted">{{ t('pages.students.viewModal.gender') }}</span>
              <span class="font-medium">
                {{ child.gender === 'male' ? t('pages.students.viewModal.male') : t('pages.students.viewModal.female') }}
              </span>
            </div>
            <div class="flex justify-between items-center gap-3">
              <span class="text-muted">{{ t('pages.students.viewModal.joinDate') }}</span>
              <span class="font-medium">{{ formatDate(child.joinDate) }}</span>
            </div>
            <div class="flex justify-between items-center gap-3">
              <span class="text-muted">{{ t('pages.students.viewModal.guardiansCount') }}</span>
              <span class="font-semibold text-primary">{{ child.guardians.length }}</span>
            </div>
          </div>
        </div>
      </UCard>

      <div class="flex-1 min-w-0 ring-1 ring-muted/50 rounded-2xl sm:p-6 p-5">
        <UTabs
          v-model="activeTab"
          :items="tabs"
          variant="link"
          class="w-full"
        >
          <template #content="{ item }">
            <StudentViewOverviewTab v-if="item.value === 'overview'" :student="child" />
            <ParentChildAchievements
              v-else-if="item.value === 'achievements'"
              :achievements="achievements"
              :loading="isLoading"
            />
            <ParentChildWeeklyPlan
              v-else-if="item.value === 'weeklyPlan'"
              :plans="weeklyPlans"
              :loading="isLoading"
            />
            <ParentChildAttendance
              v-else-if="item.value === 'attendance'"
              :records="attendance"
              :loading="isLoading"
            />
            <ParentChildGuardians
              v-else-if="item.value === 'guardians'"
              :guardians="child.guardians"
            />
          </template>
        </UTabs>
      </div>
    </div>
  </div>
</template>
