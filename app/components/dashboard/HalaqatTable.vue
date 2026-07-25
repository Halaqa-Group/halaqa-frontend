<script setup lang="ts">
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { ApiHalaqaPerformance, ApiHalaqatPerformance } from '~/types'
import { formatKpiPages, formatKpiRate, formatKpiScore } from '~/utils/dashboard'

/**
 * Per-halaqa performance (`GET /dashboard/halaqat`), one row per active halaqa
 * the caller may see. The API already sorts by volume and already narrowed the
 * list to the caller's scope, so there is nothing to filter or re-sort here.
 *
 * A student enrolled in two halaqat is counted in both rows — that is correct
 * per-halaqa, and it is why these `students` values can sum to more than the
 * distinct `active_students` on the KPI card above.
 */

defineProps<{
  data: ApiHalaqatPerformance | null
  loading?: boolean
  error?: string | null
}>()

const { t } = useI18n()

const centered = { class: { th: 'text-center', td: 'text-center' } }

const columns = computed<TableColumn<ApiHalaqaPerformance>[]>(() => [
  { accessorKey: 'halaqa_name', header: t('pages.home.halaqat.columns.halaqa') },
  { accessorKey: 'students', header: t('pages.home.halaqat.columns.students'), meta: centered },
  { accessorKey: 'attendance_rate', header: t('pages.home.halaqat.columns.attendance'), meta: centered },
  { accessorKey: 'pages', header: t('pages.home.halaqat.columns.pages'), meta: centered },
  { accessorKey: 'average_score', header: t('pages.home.halaqat.columns.score'), meta: centered },
  { accessorKey: 'plan_completion_rate', header: t('pages.home.halaqat.columns.planCompletion'), meta: centered }
])

function onRowSelect(_e: Event, row: TableRow<ApiHalaqaPerformance>) {
  navigateTo(`/halaqat/${row.original.halaqa_id}`)
}
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-building-2" class="size-5 text-primary" />
        <h3 class="text-base font-semibold text-on-surface">
          {{ t('pages.home.halaqat.title') }}
        </h3>
      </div>
    </template>

    <div v-if="loading" class="flex items-center justify-center py-14">
      <UIcon name="i-lucide-loader-circle" class="size-7 animate-spin text-primary" />
    </div>

    <div v-else-if="error" class="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <UIcon name="i-lucide-triangle-alert" class="size-7 text-error" />
      <p class="text-sm text-error">
        {{ error }}
      </p>
    </div>

    <div v-else-if="!data || data.items.length === 0" class="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <UIcon name="i-lucide-inbox" class="size-7 text-on-surface-variant" />
      <p class="text-sm text-on-surface-variant">
        {{ t('pages.home.halaqat.empty') }}
      </p>
    </div>

    <UTable
      v-else
      :data="data.items"
      :columns="columns"
      class="w-full"
      @select="onRowSelect"
    >
      <template #halaqa_name-cell="{ row }">
        <span class="font-medium text-on-surface">{{ row.original.halaqa_name }}</span>
      </template>

      <template #students-cell="{ row }">
        <span class="tabular-nums">{{ row.original.students }}</span>
      </template>

      <template #attendance_rate-cell="{ row }">
        <span class="tabular-nums">{{ formatKpiRate(row.original.attendance_rate) }}</span>
      </template>

      <template #pages-cell="{ row }">
        <span class="tabular-nums font-medium text-on-surface">{{ formatKpiPages(row.original.pages) }}</span>
      </template>

      <template #average_score-cell="{ row }">
        <span class="tabular-nums">{{ formatKpiScore(row.original.average_score) }}</span>
      </template>

      <template #plan_completion_rate-cell="{ row }">
        <span class="tabular-nums">{{ formatKpiRate(row.original.plan_completion_rate) }}</span>
      </template>
    </UTable>
  </UCard>
</template>
