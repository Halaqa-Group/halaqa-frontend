<script setup lang="ts">
import type { Student } from '~/types'

definePageMeta({
  middleware: ['parent-only'],
  breadcrumb: [
    { label: 'pages.parent.title' }
  ]
})

const { t, locale } = useI18n()
const { children, isLoading, error, fetchChildren } = useMyChildren()
const { openView } = useStudents()

const dateFormatter = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' })
)

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateFormatter.value.format(d)
}

function statusLabel(s: Student) {
  if (s.deletedAt) return t('pages.students.statusDeleted')
  if (s.status === 'active') return t('pages.students.statusActive')
  if (s.status === 'inactive') return t('pages.students.statusInactive')
  return t('pages.students.statusGraduated')
}

function statusColor(s: Student): 'success' | 'warning' | 'info' | 'error' {
  if (s.deletedAt) return 'error'
  if (s.status === 'active') return 'success'
  if (s.status === 'inactive') return 'warning'
  return 'info'
}

onMounted(fetchChildren)
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
      <LucideLoaderCircle class="h-8 w-8 animate-spin text-primary" />
    </div>

    <div v-else-if="error" class="rounded-2xl p-6 text-center bg-status-conflict-bg">
      <LucideAlertCircle class="w-8 h-8 mx-auto mb-2 text-status-conflict" />
      <p class="text-status-conflict">
        {{ error }}
      </p>
    </div>

    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UCard>
          <p class="text-sm text-muted mb-1">
            {{ t('pages.parent.stats.childrenCount') }}
          </p>
          <p class="text-2xl font-bold">
            {{ children.length }}
          </p>
        </UCard>

        <UCard>
          <p class="text-sm text-muted mb-1">
            {{ t('pages.parent.stats.activeCount') }}
          </p>
          <p class="text-2xl font-bold">
            {{ children.filter(c => c.status === 'active' && !c.deletedAt).length }}
          </p>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <h2 class="font-semibold">
            {{ t('pages.parent.childrenList') }}
          </h2>
        </template>

        <div v-if="children.length === 0" class="text-sm text-muted py-2">
          {{ t('pages.parent.noChildren') }}
        </div>

        <div v-else class="space-y-3">
          <button
            v-for="student in children"
            :key="student.id"
            type="button"
            class="w-full rounded-lg border border-default p-4 text-start transition-colors hover:bg-surface-container-low"
            @click="openView(student)"
          >
            <div class="flex items-center gap-4">
              <img
                :src="student.avatar"
                :alt="student.name"
                class="w-12 h-12 rounded-full object-cover border border-outline-variant shrink-0"
              >
              <div class="flex-1 min-w-0">
                <p class="font-semibold truncate">
                  {{ student.name }}
                </p>
                <p v-if="student.idNumber" class="text-xs text-muted tabular-nums" dir="ltr">
                  {{ student.idNumber }}
                </p>
              </div>
              <div class="flex flex-col items-end gap-1 shrink-0">
                <UBadge variant="subtle" :color="statusColor(student)" :label="statusLabel(student)" />
                <span class="text-xs text-muted">
                  {{ t('pages.parent.joinedOn', { date: formatDate(student.joinDate) }) }}
                </span>
              </div>
            </div>
          </button>
        </div>
      </UCard>
    </template>
  </div>
</template>
