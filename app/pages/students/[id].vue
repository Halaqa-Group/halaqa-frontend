<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type { Student } from '~/types'

definePageMeta({
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.students.title', to: '/students' }
  ]
})

const route = useRoute()
const { t, locale } = useI18n()
const { activeRole } = useAuth()
const { students, fetchStudent } = useStudents()

const studentId = computed(() => String(route.params.id))
const loading = ref(false)
const error = ref<string | null>(null)
const loadedStudent = ref<Student | null>(null)

const student = computed(() => students.value.find(s => s.id === studentId.value) ?? loadedStudent.value)

// Error-heatmap insights are staff-only (parents don't see error breakdowns).
const canSeeInsights = computed(() => !!activeRole.value && activeRole.value !== 'parent')

const tabs = computed<TabsItem[]>(() => [
  { value: 'overview', label: t('pages.students.viewModal.tabs.overview'), icon: 'i-lucide-layout-dashboard' },
  { value: 'guardians', label: t('pages.students.viewModal.tabs.guardians'), icon: 'i-lucide-users' },
  ...(canSeeInsights.value
    ? [{ value: 'insights', label: t('pages.students.viewModal.tabs.insights'), icon: 'i-lucide-chart-column-increasing' }]
    : [])
])

const activeTab = ref<'overview' | 'guardians' | 'insights'>('overview')

const backIcon = computed(() =>
  locale.value === 'ar' ? 'i-lucide-arrow-right' : 'i-lucide-arrow-left'
)

const backTo = computed(() =>
  activeRole.value === 'parent' ? '/parent' : '/students'
)

async function loadStudent() {
  loading.value = true
  error.value = null
  loadedStudent.value = null
  try {
    loadedStudent.value = await fetchStudent(studentId.value)
  } catch (e: any) {
    error.value = e?.data?.message || t('auth.genericError')
  } finally {
    loading.value = false
  }
}

onMounted(loadStudent)

watch(studentId, () => {
  loadStudent()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="loading && !student" class="text-sm text-muted">
      {{ t('common.loading') }}
    </div>

    <div v-else-if="error" class="rounded-2xl p-6 text-center bg-status-conflict-bg">
      <UIcon name="i-lucide-alert-circle" class="w-8 h-8 mx-auto mb-2 text-status-conflict" />
      <p class="text-status-conflict">
        {{ error }}
      </p>
      <UButton
        :to="backTo"
        variant="soft"
        color="neutral"
        :icon="backIcon"
        class="mt-4"
      >
        {{ t('common.back') }}
      </UButton>
    </div>

    <template v-else-if="student">
      <div class="flex flex-col lg:flex-row gap-6">
        <StudentViewProfilePanel :student="student" />

        <div class="flex-1 min-w-0 ring-1 ring-muted/50 rounded-2xl sm:p-6 p-5">
          <UTabs
            v-model="activeTab"
            :items="tabs"
            variant="link"
            class="w-full"
          >
            <template #content="{ item }">
              <StudentViewOverviewTab v-if="item.value === 'overview'" :student="student" />
              <StudentViewGuardiansTab v-else-if="item.value === 'guardians'" :student="student" />
              <StudentViewInsightsTab v-else-if="item.value === 'insights'" :student="student" />
            </template>
          </UTabs>
        </div>
      </div>
    </template>
  </div>
</template>
