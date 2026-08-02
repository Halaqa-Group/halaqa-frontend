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
const { t } = useI18n()
const apiError = useApiError()
const { activeRole } = useAuth()
const { students, fetchStudent } = useStudents()

const studentId = computed(() => String(route.params.id))
const loading = ref(false)
const error = ref<string | null>(null)
const loadedStudent = ref<Student | null>(null)

const student = computed(() => students.value.find(s => s.id === studentId.value) ?? loadedStudent.value)

// Header shows the student's name in place of the generic breadcrumb crumb.
useSetPageTitle(() => student.value?.name)
// Back button lives in the header, before the title. Parents came from /parent.
useSetPageBack(() => (activeRole.value === 'parent' ? '/parent' : '/students'))

const tabs = computed<TabsItem[]>(() => [
  { value: 'overview', label: t('pages.students.viewModal.tabs.overview'), icon: 'i-lucide-layout-dashboard' },
  { value: 'guardians', label: t('pages.students.viewModal.tabs.guardians'), icon: 'i-lucide-users' },
  { value: 'insights', label: t('pages.students.viewModal.tabs.insights'), icon: 'i-lucide-layout-grid' }
])

const activeTab = ref<'overview' | 'guardians' | 'insights'>('overview')

async function loadStudent() {
  loading.value = true
  error.value = null
  loadedStudent.value = null
  try {
    loadedStudent.value = await fetchStudent(studentId.value)
  } catch (e: any) {
    error.value = apiError.format(e, t('auth.genericError'))
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
