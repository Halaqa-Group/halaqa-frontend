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

const tabs = computed<TabsItem[]>(() => [
  { value: 'overview', label: t('pages.students.viewModal.tabs.overview'), icon: 'i-lucide-layout-dashboard' },
  { value: 'guardians', label: t('pages.students.viewModal.tabs.guardians'), icon: 'i-lucide-users' }
])

const activeTab = ref<'overview' | 'guardians'>('overview')

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
      <LucideAlertCircle class="w-8 h-8 mx-auto mb-2 text-status-conflict" />
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
      <div class="flex flex-col gap-2">
        <UButton
          :to="backTo"
          variant="link"
          color="neutral"
          :icon="backIcon"
          size="sm"
          class="self-start px-0 h-auto"
        >
          {{ t('common.back') }}
        </UButton>

        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-bold">
            {{ student.name }}
          </h1>
          <p v-if="student.idNumber" class="text-sm text-muted tabular-nums" dir="ltr">
            {{ student.idNumber }}
          </p>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-6">
        <StudentViewProfilePanel :student="student" />

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
  </div>
</template>