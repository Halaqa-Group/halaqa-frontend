<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Student } from '~/types'

type StatusFilter = Student['status'] | 'deleted' | null

const { t } = useI18n()
const { user } = useAuth()
const { searchQuery, openAdd } = useStudents()
const { filterStatus, sortKey, viewMode } = useStudentsView()

// Backend silently ignores include_deleted for non-principal/VP roles, so the
// "Deleted" status option is only useful for principal/VP. POST /students is
// principal/VP only too — same gate hides Add.
const canManageDeleted = computed(() => {
  const roles = user.value?.roles ?? []
  return roles.includes('principal') || roles.includes('vice_principal')
})
const canCreateStudent = canManageDeleted

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
  { label: t('pages.students.sort.newest'), icon: 'i-lucide-clock', onSelect: () => { sortKey.value = 'newest' } },
  { label: t('pages.students.sort.joinDateDesc'), icon: 'i-lucide-calendar', onSelect: () => { sortKey.value = 'joinDateDesc' } },
  { label: t('pages.students.sort.nameAsc'), icon: 'i-lucide-arrow-down-a-z', onSelect: () => { sortKey.value = 'nameAsc' } }
]])

const sortLabel = computed(() => t(`pages.students.sort.${sortKey.value}`))
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 mb-8">
    <div>
      <UInput
        v-model="searchQuery"
        type="text"
        :placeholder="$t('pages.students.searchByName')"
        icon="i-lucide-search"
        class="flex-1 min-w-72"
        :ui="{ base: 'rounded-full' }" />
    </div>

    <div>
      <USelectMenu
        v-model="filterStatus"
        :items="statusFilters"
        value-key="value"
        :search-input="false"
        :ui="{ base: 'rounded-full px-4 min-w-48' }">
        <template #default="{ modelValue }">
          <span class="flex-1 text-start">
            {{statusFilters.find(f => f.value === modelValue)?.label ?? $t('pages.students.statusAll')}}
          </span>
        </template>
      </USelectMenu>
    </div>

    <div>
      <UDropdownMenu
        :items="sortItems"
        :content="{ align: 'end', collisionPadding: 12 }"
        :ui="{ content: 'w-56' }">
        <UButton
          variant="outline"
          color="neutral"
          trailing-icon="i-lucide-chevron-down"
          icon="i-lucide-arrow-up-down"
          size="md"
          class="rounded-full px-4">
          {{ $t('pages.students.sort.label') }}: {{ sortLabel }}
        </UButton>
      </UDropdownMenu>
    </div>

    <div class="flex items-center gap-2 ms-auto shrink-0">
      <div class="flex items-center bg-elevated p-1 rounded-full border border-default">
        <UButton
          :variant="viewMode === 'grid' ? 'soft' : 'ghost'"
          color="primary"
          icon="i-lucide-layout-grid"
          size="md"
          class="rounded-full px-3"
          :aria-label="$t('pages.students.view.grid')"
          @click="viewMode = 'grid'" />
        <UButton
          :variant="viewMode === 'table' ? 'soft' : 'ghost'"
          color="primary"
          icon="i-lucide-table-2"
          size="md"
          class="rounded-full px-3"
          :aria-label="$t('pages.students.view.table')"
          @click="viewMode = 'table'" />
      </div>

      <UButton
        v-if="canCreateStudent"
        icon="i-lucide-plus"
        size="lg"
        class="font-bold rounded-full shrink-0 px-6"
        @click="openAdd">
        {{ $t('pages.students.addNew') }}
      </UButton>
    </div>
  </div>
</template>
