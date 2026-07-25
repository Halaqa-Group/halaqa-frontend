<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ApiTeacherCommitment, ApiTeachersCommitment } from '~/types'
import { formatKpiPages, formatKpiRate } from '~/utils/dashboard'

/**
 * Teacher commitment — معدل التزام المحفظين (`GET /dashboard/teachers`).
 *
 * The endpoint reports ON teachers, so it is principal/VP/supervisor only and
 * 403s for the teacher role. The page must not render this component for a
 * teacher; `canViewTeacherCommitment` is the gate.
 *
 * The two rates are NOT the same measurement and are deliberately kept apart:
 * `attendance_rate` is the teacher's own attendance (and is `null` when they
 * have no rows at all, which is not the same as 0%), while
 * `student_attendance_rate` is their students'.
 */

defineProps<{
  data: ApiTeachersCommitment | null
  loading?: boolean
  error?: string | null
}>()

const { t } = useI18n()

const centered = { class: { th: 'text-center', td: 'text-center' } }

const columns = computed<TableColumn<ApiTeacherCommitment>[]>(() => [
  { accessorKey: 'teacher_name', header: t('pages.home.teachers.columns.teacher') },
  { accessorKey: 'attendance_rate', header: t('pages.home.teachers.columns.ownAttendance'), meta: centered },
  { accessorKey: 'halaqat', header: t('pages.home.teachers.columns.halaqat'), meta: centered },
  { accessorKey: 'students', header: t('pages.home.teachers.columns.students'), meta: centered },
  { accessorKey: 'student_attendance_rate', header: t('pages.home.teachers.columns.studentAttendance'), meta: centered },
  { accessorKey: 'student_pages', header: t('pages.home.teachers.columns.studentPages'), meta: centered }
])
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-user-check" class="size-5 text-primary" />
        <h3 class="text-base font-semibold text-on-surface">
          {{ t('pages.home.teachers.title') }}
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
        {{ t('pages.home.teachers.empty') }}
      </p>
    </div>

    <UTable v-else :data="data.items" :columns="columns" class="w-full">
      <template #teacher_name-cell="{ row }">
        <span class="font-medium text-on-surface">{{ row.original.teacher_name }}</span>
      </template>

      <!-- `null` means "no attendance rows at all" — showing 0% would accuse
           them of never turning up. -->
      <template #attendance_rate-cell="{ row }">
        <span class="tabular-nums font-medium text-on-surface">
          {{ formatKpiRate(row.original.attendance_rate) }}
        </span>
      </template>

      <template #halaqat-cell="{ row }">
        <span class="tabular-nums">{{ row.original.halaqat }}</span>
      </template>

      <template #students-cell="{ row }">
        <span class="tabular-nums">{{ row.original.students }}</span>
      </template>

      <template #student_attendance_rate-cell="{ row }">
        <span class="tabular-nums">{{ formatKpiRate(row.original.student_attendance_rate) }}</span>
      </template>

      <template #student_pages-cell="{ row }">
        <span class="tabular-nums">{{ formatKpiPages(row.original.student_pages) }}</span>
      </template>
    </UTable>
  </UCard>
</template>
