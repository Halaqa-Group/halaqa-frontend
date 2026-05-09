<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { Student } from '~/types'

const { t } = useI18n()
const { user } = useAuth()
const {
  students,
  isLoading,
  error,
  openAdd,
  openView,
  openEdit,
  openNotifyParent,
  requestDelete,
  requestGraduate,
  requestRestore
} = useStudents()
const canCreateStudent = computed(() => {
  const roles = user.value?.roles ?? []
  return roles.includes('principal') || roles.includes('vice_principal')
})
const { viewMode, sortedStudents, hasMore, isLoadingMore, loadMore, clearFilters } = useStudentsView()

const columns = computed<TableColumn<Student>[]>(() => [
  { accessorKey: 'name', header: t('pages.students.table.student') },
  { accessorKey: 'halaqat', header: t('pages.students.table.halaqat') },
  { accessorKey: 'status', header: t('pages.students.table.status') },
  { accessorKey: 'dailyHifzPagesCapacity', header: t('pages.students.table.dailyHifz') },
  { accessorKey: 'dailyNearPagesCapacity', header: t('pages.students.table.dailyNear') },
  { accessorKey: 'dailyFarPagesCapacity', header: t('pages.students.table.dailyFar') },
  { id: 'actions', header: t('pages.students.table.actions') }
])

function statusLabel(student: Student) {
  if (student.deletedAt) return t('pages.students.statusDeleted')
  if (student.status === 'active') return t('pages.students.statusActive')
  if (student.status === 'inactive') return t('pages.students.statusInactive')
  return t('pages.students.statusGraduated')
}

function statusColor(student: Student): 'success' | 'warning' | 'info' | 'error' {
  if (student.deletedAt) return 'error'
  if (student.status === 'active') return 'success'
  if (student.status === 'inactive') return 'warning'
  return 'info'
}

function rowMenuItems(student: Student): DropdownMenuItem[][] {
  const primary: DropdownMenuItem[] = [
    {
      label: t('pages.students.actions.logAchievement'),
      icon: 'i-lucide-book-open',
      onSelect: () => navigateTo(`/achievements?studentId=${student.id}`)
    },
    {
      label: t('pages.students.actions.recordAttendance'),
      icon: 'i-lucide-check',
      onSelect: () => navigateTo(`/attendance?studentId=${student.id}`)
    },
    {
      label: t('pages.students.actions.notifyParent'),
      icon: 'i-lucide-bell',
      onSelect: () => openNotifyParent(student)
    },
    {
      label: t('pages.students.actions.editStudent'),
      icon: 'i-lucide-pencil',
      onSelect: () => openEdit(student)
    }
  ]
  const lifecycle: DropdownMenuItem[] = []
  if (student.deletedAt) {
    lifecycle.push({
      label: t('pages.students.actions.restore'),
      icon: 'i-lucide-rotate-ccw',
      color: 'success',
      onSelect: () => requestRestore(student)
    })
  } else {
    if (student.status !== 'graduated') {
      lifecycle.push({
        label: t('pages.students.actions.graduate'),
        icon: 'i-lucide-graduation-cap',
        onSelect: () => requestGraduate(student)
      })
    }
    lifecycle.push({
      label: t('pages.students.actions.delete'),
      icon: 'i-lucide-trash-2',
      color: 'error',
      onSelect: () => requestDelete(student)
    })
  }
  return [primary, lifecycle]
}
</script>

<template>
  <div v-if="isLoading && students.length === 0" class="flex justify-center py-16">
    <UIcon name="i-lucide-loader-circle" class="w-10 h-10 animate-spin text-primary" />
  </div>

  <div v-else-if="error" class="rounded-2xl p-6 text-center bg-status-conflict-bg">
    <UIcon name="i-lucide-alert-circle" class="w-8 h-8 mx-auto mb-2 text-status-conflict" />
    <p class="text-status-conflict">
      {{ error }}
    </p>
  </div>

  <div
    v-else-if="students.length === 0"
    class="flex flex-col items-center justify-center gap-5 py-20 rounded-2xl border border-dashed border-outline-variant"
  >
    <div class="w-20 h-20 rounded-full flex items-center justify-center bg-primary-container">
      <UIcon name="i-lucide-user-plus" class="w-10 h-10 text-primary" />
    </div>
    <p class="text-lg font-semibold text-on-surface">
      {{ $t('pages.students.empty.welcomeTitle') }}
    </p>
    <UButton
      v-if="canCreateStudent"
      icon="i-lucide-plus"
      size="lg"
      class="font-bold rounded-full px-6"
      @click="openAdd"
    >
      {{ $t('pages.students.addNew') }}
    </UButton>
  </div>

  <div
    v-else-if="sortedStudents.length === 0"
    class="flex flex-col items-center justify-center gap-4 py-16 rounded-2xl border border-dashed border-outline-variant"
  >
    <div class="w-16 h-16 rounded-full flex items-center justify-center bg-primary-container">
      <UIcon name="i-lucide-search-x" class="w-8 h-8 text-primary" />
    </div>
    <p class="text-on-surface">
      {{ $t('pages.students.empty.noMatchTitle') }}
    </p>
    <UButton
      variant="soft"
      color="primary"
      icon="i-lucide-x"
      size="md"
      class="rounded-full"
      @click="clearFilters"
    >
      {{ $t('pages.students.empty.clearFilters') }}
    </UButton>
  </div>

  <template v-else>
    <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <StudentCard v-for="student in sortedStudents" :key="student.id" :student="student" />
    </div>

    <div v-else class="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-x-auto">
      <UTable
        :data="sortedStudents"
        :columns="columns"
        class="min-w-[900px]"
      >
        <template #name-cell="{ row }">
          <button
            type="button"
            class="flex items-center gap-3 min-w-0 text-start hover:opacity-80 transition-opacity"
            @click="openView(row.original)"
          >
            <img
              :src="row.original.avatar"
              :alt="row.original.name"
              class="w-9 h-9 rounded-full object-cover border border-outline-variant shrink-0"
            >
            <div class="flex flex-col min-w-0">
              <span class="font-semibold text-on-surface truncate">{{ row.original.name }}</span>
              <span class="text-xs text-on-surface-variant truncate">
                {{ $t('pages.students.card.currentSurah') }}: {{ row.original.currentSurah ?? '—' }}
              </span>
            </div>
          </button>
        </template>

        <template #halaqat-cell="{ row }">
          <div v-if="row.original.halaqat.length === 0" class="text-on-surface-variant">
            —
          </div>
          <div v-else class="flex flex-wrap gap-1">
            <UBadge
              v-for="(name, i) in row.original.halaqat"
              :key="i"
              variant="subtle"
              color="primary"
              :label="name"
            />
          </div>
        </template>

        <template #status-cell="{ row }">
          <UBadge
            variant="subtle"
            :color="statusColor(row.original)"
            :label="statusLabel(row.original)"
          />
        </template>

        <template #dailyHifzPagesCapacity-cell="{ row }">
          <span class="tabular-nums text-on-surface">
            {{ row.original.dailyHifzPagesCapacity }}
          </span>
        </template>

        <template #dailyNearPagesCapacity-cell="{ row }">
          <span class="tabular-nums text-on-surface">
            {{ row.original.dailyNearPagesCapacity }}
          </span>
        </template>

        <template #dailyFarPagesCapacity-cell="{ row }">
          <span class="tabular-nums text-on-surface">
            {{ row.original.dailyFarPagesCapacity }}
          </span>
        </template>

        <template #actions-cell="{ row }">
          <UDropdownMenu
            :items="rowMenuItems(row.original)"
            :content="{ align: 'end', collisionPadding: 12 }"
            :ui="{ content: 'w-56' }"
          >
            <UButton
              icon="i-lucide-ellipsis-vertical"
              color="neutral"
              variant="ghost"
              square
              :aria-label="$t('pages.students.table.actions')"
            />
          </UDropdownMenu>
        </template>
      </UTable>
    </div>

    <div v-if="hasMore" class="flex justify-center mt-8">
      <UButton
        variant="outline"
        color="primary"
        size="md"
        class="rounded-full px-6"
        :loading="isLoadingMore"
        :disabled="isLoadingMore"
        @click="loadMore"
      >
        {{ $t('pages.students.loadMore') }}
      </UButton>
    </div>
  </template>
</template>
