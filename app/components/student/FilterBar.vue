<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Student } from '~/types'

type StatusFilter = Student['status'] | null

const { t } = useI18n()
const { searchQuery, openAdd } = useStudents()
const { filterStatus, filterHalaqaId, sortKey, filterCounts, viewMode } = useStudentsView()
const { halaqat, fetchHalaqat, isLoading: halaqatLoading } = useHalaqat()

onMounted(() => {
  if (halaqat.value.length === 0) fetchHalaqat()
})

const statusFilters = computed<{ label: string, value: StatusFilter, count: number }[]>(() => [
  { label: t('pages.students.statusAll'), value: null, count: filterCounts.value.all },
  { label: t('pages.students.statusActive'), value: 'active', count: filterCounts.value.active },
  { label: t('pages.students.statusInactive'), value: 'inactive', count: filterCounts.value.inactive },
  { label: t('pages.students.statusGraduated'), value: 'graduated', count: filterCounts.value.graduated }
])

const halaqaFilters = computed<{ label: string, value: number | null }[]>(() => [
  { label: 'كل الحلقات', value: null },
  ...halaqat.value.map(h => ({ label: h.name, value: h.id }))
])

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
          <span
            class="ms-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold bg-primary text-white">
            {{statusFilters.find(f => f.value === modelValue)?.count ?? 0}}
          </span>
        </template>
        <template #item="{ item }">
          <span class="flex-1">{{ item.label }}</span>
          <span
            class="ms-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold bg-on-surface/5 text-on-surface-variant">
            {{ item.count }}
          </span>
        </template>
      </USelectMenu>
    </div>

    <div>
      <USelectMenu
        v-model="filterHalaqaId"
        :items="halaqaFilters"
        value-key="value"
        :loading="halaqatLoading"
        icon="i-lucide-layers"
        :ui="{ base: 'rounded-full px-4 min-w-48' }">
        <template #default="{ modelValue }">
          <span class="flex-1 text-start">
            {{ halaqaFilters.find(f => f.value === modelValue)?.label ?? 'كل الحلقات' }}
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
        icon="i-lucide-plus"
        size="lg"
        class="font-bold rounded-full shrink-0 px-6"
        @click="openAdd">
        {{ $t('pages.students.addNew') }}
      </UButton>
    </div>
  </div>
</template>
