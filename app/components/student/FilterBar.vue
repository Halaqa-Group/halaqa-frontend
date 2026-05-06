<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Student } from '~/types'

type StatusFilter = Student['status'] | null

const { t } = useI18n()
const { searchQuery } = useStudents()
const { filterStatus, sortKey, filterCounts } = useStudentsView()

const statusFilters = computed<{ label: string, value: StatusFilter, count: number }[]>(() => [
  { label: t('pages.students.statusAll'), value: null, count: filterCounts.value.all },
  { label: t('pages.students.statusActive'), value: 'active', count: filterCounts.value.active },
  { label: t('pages.students.statusInactive'), value: 'inactive', count: filterCounts.value.inactive },
  { label: t('pages.students.statusGraduated'), value: 'graduated', count: filterCounts.value.graduated }
])

const sortItems = computed<DropdownMenuItem[][]>(() => [[
  { label: t('pages.students.sort.newest'), icon: 'i-lucide-clock', onSelect: () => { sortKey.value = 'newest' } },
  { label: t('pages.students.sort.joinDateDesc'), icon: 'i-lucide-calendar', onSelect: () => { sortKey.value = 'joinDateDesc' } },
  { label: t('pages.students.sort.nameAsc'), icon: 'i-lucide-arrow-down-a-z', onSelect: () => { sortKey.value = 'nameAsc' } }
]])

const sortLabel = computed(() => t(`pages.students.sort.${sortKey.value}`))
</script>

<template>
  <div class="flex flex-wrap items-center gap-4 mb-8">
    <UInput
      v-model="searchQuery"
      type="text"
      :placeholder="$t('pages.students.searchByName')"
      trailing-icon="i-lucide-search"
      variant="none"
      class="flex-1 min-w-72"
      :ui="{
        base: 'w-full pe-11 ps-4 py-3 rounded-2xl text-base bg-surface-container-lowest text-on-surface border-[1.5px] border-outline-variant focus:ring-2 focus:ring-primary/30',
        trailing: 'absolute inset-y-0 end-4',
        trailingIcon: 'w-4 h-4 text-on-surface-variant'
      }" />

    <div class="flex items-center bg-elevated p-1 rounded-full border border-default">
      <UButton
        v-for="f in statusFilters"
        :key="String(f.value)"
        :variant="filterStatus === f.value ? 'soft' : 'ghost'"
        color="primary"
        class="px-5 py-1.5 text-base rounded-full"
        @click="filterStatus = f.value">
        {{ f.label }}
        <span
          class="ms-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold"
          :class="filterStatus === f.value
            ? 'bg-primary text-white'
            : 'bg-on-surface/5 text-on-surface-variant'">{{ f.count }}</span>
      </UButton>
    </div>

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
</template>
