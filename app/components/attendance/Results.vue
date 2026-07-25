<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AttendanceRow } from '~/composables/useAttendance'

const { t } = useI18n()
const { canMarkStudentAttendance } = usePermissions()
const {
  attendanceRows, filteredRows, isLoading, loadError, viewMode,
  hasActiveFilters, clearFilters, wasAbsentYesterday, setStatus, setEthicsRating
} = useAttendance()

// Supervisors may read the roster but not record it — mirror StaffPanel and
// disable the controls rather than let a click 403 on save.
const canEdit = canMarkStudentAttendance

const columns = computed<TableColumn<AttendanceRow>[]>(() => [
  { accessorKey: 'name', header: t('pages.attendance.table.student') },
  { accessorKey: 'status', header: t('pages.attendance.statusLabel') },
  { accessorKey: 'ethicsRating', header: t('pages.attendance.ethics.label') },
  // Content is grouped at the row end, so the header follows it.
  {
    id: 'actions',
    header: t('pages.attendance.table.actions'),
    meta: { class: { th: 'text-end' } }
  }
])
</script>

<template>
  <div v-if="isLoading && attendanceRows.length === 0" class="flex justify-center py-16">
    <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary" />
  </div>

  <div v-else-if="loadError" class="p-6 text-sm text-error text-center">
    {{ loadError }}
  </div>

  <div v-else-if="attendanceRows.length === 0" class="flex flex-col items-center justify-center gap-3 py-14">
    <UIcon name="i-lucide-users" class="w-10 h-10 text-muted" />
    <p class="text-sm text-muted">
      {{ t('pages.attendance.noStudentsInHalaqa') }}
    </p>
  </div>

  <div v-else-if="filteredRows.length === 0" class="flex flex-col items-center justify-center gap-3 py-14">
    <UIcon name="i-lucide-search-x" class="w-8 h-8 text-muted" />
    <p class="text-sm text-muted">
      {{ t('pages.attendance.noMatch') }}
    </p>
    <UButton
      v-if="hasActiveFilters"
      variant="soft"
      color="neutral"
      icon="i-lucide-x"
      size="sm"
      @click="clearFilters"
    >
      {{ t('pages.attendance.filters.clear') }}
    </UButton>
  </div>

  <template v-else>
    <div class="md:hidden flex flex-col gap-3 p-3">
      <AttendanceCard
        v-for="row in filteredRows"
        :key="row.studentId"
        :student-id="row.studentId"
        :name="row.name"
        :avatar="row.avatar"
        :status="row.status"
        :ethics-rating="row.ethicsRating"
        :notes="row.notes"
        :daily-note="row.dailyNote"
      />
    </div>

    <div class="hidden md:block">
      <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 sm:p-6">
        <AttendanceCard
          v-for="row in filteredRows"
          :key="row.studentId"
          :student-id="row.studentId"
          :name="row.name"
          :avatar="row.avatar"
          :status="row.status"
          :ethics-rating="row.ethicsRating"
          :notes="row.notes"
        />
      </div>

      <div v-else class="overflow-x-auto">
        <UTable :data="filteredRows" :columns="columns" :loading="isLoading" class="min-w-[640px]">
          <template #name-cell="{ row }">
            <div class="flex items-center gap-3 min-w-0">
              <img
                :src="row.original.avatar"
                :alt="row.original.name"
                class="w-8 h-8 rounded-full object-cover border border-default shrink-0"
              >
              <span class="font-medium truncate">{{ row.original.name }}</span>
              <UBadge
                v-if="wasAbsentYesterday(row.original.studentId)"
                color="error"
                variant="subtle"
                size="sm"
                icon="i-lucide-alert-triangle"
              >
                {{ t('pages.attendance.absentYesterday') }}
              </UBadge>
            </div>
          </template>

          <template #status-cell="{ row }">
            <AttendanceStatusToggle
              :status="row.original.status"
              compact
              :disabled="!canEdit"
              @set="(s) => setStatus(row.original.studentId, s)"
            />
          </template>

          <template #ethicsRating-cell="{ row }">
            <AttendanceEthicsRating
              :rating="row.original.ethicsRating"
              compact
              :disabled="!canEdit"
              @set="(r) => setEthicsRating(row.original.studentId, r)"
            />
          </template>

          <template #actions-cell="{ row }">
            <AttendanceRowActions
              :student-id="row.original.studentId"
              :name="row.original.name"
              :notes="row.original.notes"
              :daily-note="row.original.dailyNote"
              :can-edit="canEdit"
            />
          </template>
        </UTable>
      </div>
    </div>
  </template>
</template>
