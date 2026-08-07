<script setup lang="ts">
import type { Student } from '~/types'

type StatusFilter = Student['status'] | 'deleted' | null

const { t } = useI18n()
const { canRestoreStudent: canManageDeleted, canCreateStudent } = usePermissions()
const { searchQuery, openAdd } = useStudents()
const { filterStatus, viewMode, summary } = useStudentsView()

// Status counts double as the filter: each chip shows its tally and selects that
// status; "all" clears it. Mirrors the attendance status chips.
const statusChips = computed(() => {
  const chips: { value: StatusFilter, label: string, count: number | null, color: 'neutral' | 'success' | 'warning' | 'info' | 'error' }[] = [
    { value: null, label: t('pages.students.statusAll'), count: summary.value.total, color: 'neutral' },
    { value: 'active', label: t('pages.students.statusActive'), count: summary.value.active, color: 'success' },
    { value: 'inactive', label: t('pages.students.statusInactive'), count: summary.value.inactive, color: 'warning' },
    { value: 'graduated', label: t('pages.students.statusGraduated'), count: summary.value.graduated, color: 'info' }
  ]
  if (canManageDeleted.value) {
    // Deleted students are not part of the live summary snapshot, so no count.
    chips.push({ value: 'deleted', label: t('pages.students.statusDeleted'), count: null, color: 'error' })
  }
  return chips
})
</script>

<template>
  <CommonToolbar>
    <div class="flex items-center gap-1.5 overflow-x-auto -mx-4 w-[calc(100%+2rem)] px-4 sm:mx-0 sm:w-auto sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <UButton
        v-for="chip in statusChips"
        :key="String(chip.value)"
        size="sm"
        :color="chip.color"
        :variant="filterStatus === chip.value ? 'solid' : 'soft'"
        class="rounded-full shrink-0"
        @click="filterStatus = chip.value"
      >
        {{ chip.label }}
        <span v-if="chip.count !== null" class="tabular-nums font-semibold ms-1">{{ chip.count }}</span>
      </UButton>
    </div>

    <UInput
      v-model="searchQuery"
      icon="i-lucide-search"
      :placeholder="t('pages.students.searchByName')"
      class="flex-1 min-w-40 sm:max-w-xs"
    />
    <template #actions>
      <div class="flex items-center gap-1 rounded-md border border-default p-0.5">
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
      <UButton
        v-if="canCreateStudent"
        icon="i-lucide-plus"
        class="shrink-0"
        @click="openAdd"
      >
        {{ t('pages.students.addNew') }}
      </UButton>
    </template>
  </CommonToolbar>
</template>
