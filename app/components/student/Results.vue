<script setup lang="ts">
import type { TableColumn, TableRow, DropdownMenuItem } from '@nuxt/ui'
import type { Student } from '~/types'
import { formatYmd } from '~/utils/date'

const { t, locale } = useI18n()
const {
  canCreateStudent, canEditStudent, canGraduateStudent, canDeleteStudent, canRestoreStudent
} = usePermissions()
const {
  students,
  isLoading,
  error,
  openAdd,
  openView,
  openEdit,
  requestDelete,
  requestGraduate,
  requestRestore
} = useStudents()
const { viewMode, sortedStudents, clearFilters, toggleSort, sortDirection } = useStudentsView()
const { unitLabel } = useCapacityUnits()

const columns = computed<TableColumn<Student>[]>(() => [
  { accessorKey: 'name', header: t('pages.students.table.student') },
  { accessorKey: 'idNumber', header: t('pages.students.table.idNumber') },
  { accessorKey: 'status', header: t('pages.students.table.status') },
  { accessorKey: 'joinDate', header: t('pages.students.table.joinDate') },
  { accessorKey: 'dailyHifzPagesCapacity', header: t('pages.students.table.dailyHifz') },
  { accessorKey: 'dailyNearPagesCapacity', header: t('pages.students.table.dailyNear') },
  { accessorKey: 'dailyFarPagesCapacity', header: t('pages.students.table.dailyFar') },
  { id: 'actions', header: t('pages.students.table.actions') }
])

function formatJoinDate(iso: string | null): string {
  return formatYmd(iso, locale.value)
}

function sortIcon(field: 'name' | 'joinDate'): string {
  const dir = sortDirection(field)
  if (dir === 'asc') return 'i-lucide-arrow-up'
  if (dir === 'desc') return 'i-lucide-arrow-down'
  return 'i-lucide-chevrons-up-down'
}

function onRowSelect(_e: Event, row: TableRow<Student>) {
  openView(row.original)
}

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
      label: t('pages.students.actions.viewProfile'),
      icon: 'i-lucide-eye',
      onSelect: () => openView(student)
    },
    {
      label: t('pages.students.actions.logAchievement'),
      icon: 'i-lucide-book-open',
      onSelect: () => navigateTo(`/achievements?studentId=${student.id}`)
    },
    {
      label: t('pages.students.actions.recordAttendance'),
      icon: 'i-lucide-check',
      onSelect: () => navigateTo(`/attendance?studentId=${student.id}`)
    }
  ]
  // PATCH /students/:id is principal, vice_principal, teacher — supervisors read only.
  if (canEditStudent.value) {
    primary.push({
      label: t('pages.students.actions.editStudent'),
      icon: 'i-lucide-pencil',
      onSelect: () => openEdit(student)
    })
  }
  const lifecycle: DropdownMenuItem[] = []
  if (student.deletedAt) {
    if (canRestoreStudent.value) {
      lifecycle.push({
        label: t('pages.students.actions.restore'),
        icon: 'i-lucide-rotate-ccw',
        onSelect: () => requestRestore(student)
      })
    }
  } else {
    if (canGraduateStudent.value && student.status !== 'graduated') {
      lifecycle.push({
        label: t('pages.students.actions.graduate'),
        icon: 'i-lucide-graduation-cap',
        onSelect: () => requestGraduate(student)
      })
    }
    if (canDeleteStudent.value) {
      lifecycle.push({
        label: t('pages.students.actions.delete'),
        icon: 'i-lucide-trash-2',
        color: 'error',
        onSelect: () => requestDelete(student)
      })
    }
  }
  return lifecycle.length ? [primary, lifecycle] : [primary]
}
</script>

<template>
  <div v-if="isLoading && students.length === 0" class="flex justify-center py-16">
    <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary" />
  </div>

  <div v-else-if="error" class="p-6 text-sm text-error text-center">
    {{ error }}
  </div>

  <div v-else-if="students.length === 0" class="flex flex-col items-center justify-center gap-3 py-12">
    <UIcon name="i-lucide-user-plus" class="w-10 h-10 text-muted" />
    <p class="text-sm text-muted">
      {{ t('pages.students.empty.welcomeTitle') }}
    </p>
    <UButton
      v-if="canCreateStudent"
      icon="i-lucide-plus"
      size="sm"
      @click="openAdd"
    >
      {{ t('pages.students.addNew') }}
    </UButton>
  </div>

  <div v-else-if="sortedStudents.length === 0" class="flex flex-col items-center justify-center gap-3 py-12">
    <UIcon name="i-lucide-search-x" class="w-8 h-8 text-muted" />
    <p class="text-sm text-muted">
      {{ t('pages.students.empty.noMatchTitle') }}
    </p>
    <UButton
      variant="soft"
      color="neutral"
      icon="i-lucide-x"
      size="sm"
      @click="clearFilters"
    >
      {{ t('pages.students.empty.clearFilters') }}
    </UButton>
  </div>

  <template v-else>
    <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <StudentCard v-for="student in sortedStudents" :key="student.id" :student="student" />
    </div>

    <!-- The card grid stands alone; only the table gets a container border. -->
    <div v-else class="overflow-hidden rounded-xl border border-default">
      <UTable
        :data="sortedStudents"
        :columns="columns"
        :loading="isLoading"
        :on-select="onRowSelect"
        :ui="{ base: 'w-full min-w-[900px]', tr: 'cursor-pointer' }"
      >
        <template #name-header>
          <button
            type="button"
            class="inline-flex items-center gap-1 -mx-1 px-1 rounded hover:text-highlighted"
            @click="toggleSort('name')"
          >
            {{ t('pages.students.table.student') }}
            <UIcon
              :name="sortIcon('name')"
              class="w-3.5 h-3.5 shrink-0"
              :class="sortDirection('name') ? 'text-primary' : 'text-dimmed'"
            />
          </button>
        </template>

        <template #joinDate-header>
          <button
            type="button"
            class="inline-flex items-center gap-1 -mx-1 px-1 rounded hover:text-highlighted"
            @click="toggleSort('joinDate')"
          >
            {{ t('pages.students.table.joinDate') }}
            <UIcon
              :name="sortIcon('joinDate')"
              class="w-3.5 h-3.5 shrink-0"
              :class="sortDirection('joinDate') ? 'text-primary' : 'text-dimmed'"
            />
          </button>
        </template>

        <template #name-cell="{ row }">
          <button
            type="button"
            class="flex items-center gap-3 min-w-0 text-start hover:underline"
            @click="openView(row.original)"
          >
            <img
              :src="row.original.avatar"
              :alt="row.original.name"
              class="w-8 h-8 rounded-full object-cover border border-default shrink-0"
            >
            <span class="font-medium truncate">{{ row.original.name }}</span>
          </button>
        </template>

        <template #idNumber-cell="{ row }">
          <span class="tabular-nums text-muted" dir="ltr">
            {{ row.original.idNumber ?? '—' }}
          </span>
        </template>

        <template #status-cell="{ row }">
          <UBadge
            variant="subtle"
            :color="statusColor(row.original)"
            :label="statusLabel(row.original)"
          />
        </template>

        <template #joinDate-cell="{ row }">
          <span class="tabular-nums text-muted" dir="ltr">
            {{ formatJoinDate(row.original.joinDate) }}
          </span>
        </template>

        <template #dailyHifzPagesCapacity-cell="{ row }">
          <span class="tabular-nums">{{ row.original.dailyHifzPagesCapacity }}</span>
          <span class="text-xs text-muted"> {{ unitLabel(row.original.dailyHifzCapacityUnit) }}</span>
        </template>

        <template #dailyNearPagesCapacity-cell="{ row }">
          <span class="tabular-nums">{{ row.original.dailyNearPagesCapacity }}</span>
          <span class="text-xs text-muted"> {{ unitLabel(row.original.dailyNearCapacityUnit) }}</span>
        </template>

        <template #dailyFarPagesCapacity-cell="{ row }">
          <span class="tabular-nums">{{ row.original.dailyFarPagesCapacity }}</span>
          <span class="text-xs text-muted"> {{ unitLabel(row.original.dailyFarCapacityUnit) }}</span>
        </template>

        <!-- Stop propagation so the menu doesn't also open the student's profile. -->
        <template #actions-cell="{ row }">
          <div class="flex justify-end" @click.stop>
            <UDropdownMenu
              :items="rowMenuItems(row.original)"
              :content="{ align: 'end', collisionPadding: 12 }"
            >
              <UButton
                icon="i-lucide-ellipsis-vertical"
                color="neutral"
                variant="ghost"
                square
                :aria-label="t('pages.students.table.actions')"
              />
            </UDropdownMenu>
          </div>
        </template>
      </UTable>
    </div>
  </template>
</template>
