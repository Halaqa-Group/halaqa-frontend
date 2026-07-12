<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Student } from '~/types'

type StatusFilter = Student['status'] | 'deleted' | null

const { t } = useI18n()
const { user } = useAuth()
const { searchQuery } = useStudents()
const { filterStatus, sortKey, viewMode } = useStudentsView()

const canManageDeleted = computed(() => {
  const roles = user.value?.roles ?? []
  return roles.includes('principal') || roles.includes('vice_principal')
})

const statusFilters = computed<{ label: string, value: StatusFilter }[]>(() => {
  const base: { label: string, value: StatusFilter }[] = [
    { label: t('pages.students.statusAll'), value: null },
    { label: t('pages.students.statusActive'), value: 'active' },
    { label: t('pages.students.statusInactive'), value: 'inactive' },
    { label: t('pages.students.statusGraduated'), value: 'graduated' }
  ]
  if (canManageDeleted.value) {
    base.push({ label: t('pages.students.statusDeleted'), value: 'deleted' })
  }
  return base
})

const sortItems = computed<DropdownMenuItem[][]>(() => [[
  {
    label: t('pages.students.sort.newest'),
    icon: 'i-lucide-clock',
    onSelect: () => { sortKey.value = 'newest' }
  },
  {
    label: t('pages.students.sort.joinDateDesc'),
    icon: 'i-lucide-calendar',
    onSelect: () => { sortKey.value = 'joinDateDesc' }
  },
  {
    label: t('pages.students.sort.nameAsc'),
    icon: 'i-lucide-arrow-down-a-z',
    onSelect: () => { sortKey.value = 'nameAsc' }
  }
]])

const sortLabel = computed(() => t(`pages.students.sort.${sortKey.value}`))
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <UInput
      v-model="searchQuery"
      icon="i-lucide-search"
      :placeholder="t('pages.students.searchByName')"
      class="w-full sm:w-64"
    />
    <USelect
      v-model="filterStatus"
      :items="statusFilters"
      value-key="value"
      class="w-full sm:w-40"
    />
    <UDropdownMenu
      :items="sortItems"
      :content="{ align: 'end', collisionPadding: 12 }"
    >
      <UButton
        variant="outline"
        color="neutral"
        trailing-icon="i-lucide-chevron-down"
        icon="i-lucide-arrow-up-down"
        size="sm"
        class="w-full sm:w-auto"
      >
        {{ t('pages.students.sort.label') }}: {{ sortLabel }}
      </UButton>
    </UDropdownMenu>

    <div class="sm:ms-auto flex items-center gap-1 rounded-md border border-default p-0.5">
      <UButton
        :variant="viewMode === 'table' ? 'soft' : 'ghost'"
        color="primary"
        icon="i-lucide-table-2"
        size="sm"
        square
        :aria-label="t('pages.students.view.table')"
        @click="viewMode = 'table'"
      />
      <UButton
        :variant="viewMode === 'grid' ? 'soft' : 'ghost'"
        color="primary"
        icon="i-lucide-layout-grid"
        size="sm"
        square
        :aria-label="t('pages.students.view.grid')"
        @click="viewMode = 'grid'"
      />
    </div>
  </div>
</template>
