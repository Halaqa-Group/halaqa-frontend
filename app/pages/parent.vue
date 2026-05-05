<script setup lang="ts">
definePageMeta({
  middleware: ['parent-only'],
  breadcrumb: [
    { label: 'pages.parent.title' }
  ]
})

const { t } = useI18n()
const { students, fetchStudents, isLoading } = useStudents()

const averageProgress = computed(() => {
  if (!students.value.length) return 0
  const total = students.value.reduce((sum, student) => sum + (student.progress || 0), 0)
  return Math.round(total / students.value.length)
})

const averageAttendance = computed(() => {
  if (!students.value.length) return 0
  const total = students.value.reduce((sum, student) => sum + (student.attendance || 0), 0)
  return Math.round(total / students.value.length)
})

const topStudent = computed(() => {
  if (!students.value.length) return null
  return [...students.value].sort((a, b) => (b.progress || 0) - (a.progress || 0))[0]
})

onMounted(async () => {
  await fetchStudents()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-bold">
        {{ t('pages.parent.title') }}
      </h1>
      <p class="text-sm text-muted">
        {{ t('pages.parent.subtitle') }}
      </p>
    </div>

    <div v-if="isLoading" class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-circle" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UCard>
          <p class="text-sm text-muted mb-1">
            {{ t('pages.parent.stats.childrenCount') }}
          </p>
          <p class="text-2xl font-bold">
            {{ students.length }}
          </p>
        </UCard>

        <UCard>
          <p class="text-sm text-muted mb-1">
            {{ t('pages.parent.stats.avgProgress') }}
          </p>
          <p class="text-2xl font-bold">
            {{ averageProgress }}%
          </p>
        </UCard>

        <UCard>
          <p class="text-sm text-muted mb-1">
            {{ t('pages.parent.stats.avgAttendance') }}
          </p>
          <p class="text-2xl font-bold">
            {{ averageAttendance }}%
          </p>
        </UCard>
      </div>

      <UCard v-if="topStudent">
        <template #header>
          <h2 class="font-semibold">
            {{ t('pages.parent.bestChild') }}
          </h2>
        </template>
        <p class="text-sm">
          {{ topStudent.name }} - {{ topStudent.progress }}%
        </p>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold">
            {{ t('pages.parent.childrenAchievements') }}
          </h2>
        </template>

        <div v-if="students.length === 0" class="text-sm text-muted">
          {{ t('pages.parent.noChildren') }}
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="student in students"
            :key="student.id"
            class="rounded-lg border border-default p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="font-semibold">
                  {{ student.name }}
                </p>
                <p class="text-xs text-muted">
                  {{ t('pages.parent.currentSurah') }}: {{ student.currentSurah || '—' }}
                </p>
              </div>
              <UBadge color="primary" variant="soft">
                {{ student.progress }}%
              </UBadge>
            </div>

            <div class="mt-3 space-y-2">
              <div>
                <p class="text-xs text-muted mb-1">
                  {{ t('pages.parent.memorizationProgress') }}
                </p>
                <UProgress :model-value="student.progress || 0" />
              </div>
              <div>
                <p class="text-xs text-muted mb-1">
                  {{ t('pages.parent.attendanceRate') }}
                </p>
                <UProgress :model-value="student.attendance || 0" color="secondary" />
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
