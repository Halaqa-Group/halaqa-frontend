<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { useOnline } from '@vueuse/core'
import type { TableColumn } from '@nuxt/ui'
import type { StaffRow } from '~/composables/useTeacherAttendance'
import type { AttendanceStatus } from '~/types'

const { t, locale } = useI18n()
const online = useOnline()
const toast = useToast()
const apiError = useApiError()

// Staff attendance is readable by all staff (GET /attendance/teachers) but only
// principal/vice_principal may sync or correct it, so everyone else gets the
// roster read-only rather than buttons that 403.
const { canManageStaffAttendance: canEdit } = usePermissions()

const {
  staffRows, filteredRows, search, selectedDate, statusFilter, viewMode,
  isLoading, loadError, isSaving, isDirty,
  presentCount, lateCount, absentCount, excusedCount, hasActiveFilters,
  loadSession, submitSession, setStatus, setNote, clearFilters,
  markAllPresent, applyUndoSnapshot, discardChanges
} = useTeacherAttendance()

const calendarOpen = ref(false)

const statusItems = computed(() => [
  { label: t('pages.attendance.filters.allStaff'), value: 'all' },
  { label: t('pages.attendance.filters.present'), value: 'present' },
  { label: t('pages.attendance.filters.late'), value: 'late' },
  { label: t('pages.attendance.filters.absent'), value: 'absent' },
  { label: t('pages.attendance.filters.excused'), value: 'excused' }
])

const calendarValue = computed(() => {
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  return new CalendarDate(y!, m!, d!)
})
const maxCalendarValue = today(getLocalTimeZone())

const formattedDate = computed(() => {
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  if (!y || !m || !d) return selectedDate.value
  try {
    return new Date(y, m - 1, d).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : locale.value, {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  } catch {
    return selectedDate.value
  }
})

function onCalendarPick(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('year' in value)) return
  const v = value as { year: number, month: number, day: number }
  selectedDate.value = `${v.year}-${String(v.month).padStart(2, '0')}-${String(v.day).padStart(2, '0')}`
  calendarOpen.value = false
}

const columns = computed<TableColumn<StaffRow>[]>(() => [
  { accessorKey: 'name', header: t('pages.attendance.table.staff') },
  { accessorKey: 'status', header: t('pages.attendance.statusLabel') },
  { id: 'note', header: t('pages.attendance.table.note') }
])

watch(selectedDate, (d) => {
  loadSession(d)
})

onMounted(() => {
  loadSession(selectedDate.value)
})

async function handleSave() {
  try {
    await submitSession()
    toast.add({ title: t('pages.attendance.savedToastTitle'), icon: 'i-lucide-check-circle', color: 'success' })
  } catch (error: any) {
    toast.add({
      title: apiError.format(error, t('pages.attendance.saveErrorTitle')),
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

function handleMarkAllPresent() {
  const snap = markAllPresent()
  const id = `mark-all-staff-${selectedDate.value}`
  toast.add({
    id,
    title: t('pages.attendance.markedAllPresent'),
    icon: 'i-lucide-check-circle',
    color: 'primary',
    duration: 4000,
    // Place the undo button beside the title, not under it.
    orientation: 'horizontal',
    actions: [{
      label: t('pages.attendance.undo'),
      color: 'neutral',
      variant: 'subtle',
      onClick: () => {
        applyUndoSnapshot(snap)
        toast.remove(id)
      }
    }]
  })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <CommonToolbar>
      <UInput
        v-model="search"
        icon="i-lucide-search"
        :placeholder="t('pages.attendance.searchStaffPlaceholder')"
        class="flex-1 min-w-40 sm:flex-none sm:w-56"
      />

      <UPopover v-model:open="calendarOpen">
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-calendar-days"
          trailing-icon="i-lucide-chevron-down"
          class="min-w-36 justify-between"
        >
          {{ formattedDate }}
        </UButton>
        <template #content>
          <UCalendar
            :model-value="calendarValue"
            :max-value="maxCalendarValue"
            color="primary"
            class="p-2"
            @update:model-value="onCalendarPick"
          />
        </template>
      </UPopover>

      <USelect
        v-model="statusFilter"
        :items="statusItems"
        value-key="value"
        class="flex-1 min-w-32 sm:flex-none sm:w-40"
      />

      <UButton
        v-if="hasActiveFilters"
        variant="link"
        color="neutral"
        icon="i-lucide-x"
        size="sm"
        class="px-0"
        @click="clearFilters"
      >
        {{ t('pages.attendance.filters.clear') }}
      </UButton>

      <template #actions>
        <div class="flex items-center gap-1.5 text-xs flex-wrap">
          <UBadge color="success" variant="subtle">
            {{ presentCount }} {{ t('pages.attendance.filters.present') }}
          </UBadge>
          <UBadge color="warning" variant="subtle">
            {{ lateCount }} {{ t('pages.attendance.filters.late') }}
          </UBadge>
          <UBadge color="error" variant="subtle">
            {{ absentCount }} {{ t('pages.attendance.filters.absent') }}
          </UBadge>
          <UBadge color="info" variant="subtle">
            {{ excusedCount }} {{ t('pages.attendance.filters.excused') }}
          </UBadge>
        </div>
        <div class="hidden md:flex items-center gap-1 rounded-md border border-default p-0.5">
          <UButton
            :variant="viewMode === 'table' ? 'soft' : 'ghost'"
            color="primary"
            icon="i-lucide-table-2"
            size="sm"
            square
            :aria-label="t('pages.attendance.view.table')"
            @click="viewMode = 'table'"
          />
          <UButton
            :variant="viewMode === 'grid' ? 'soft' : 'ghost'"
            color="primary"
            icon="i-lucide-layout-grid"
            size="sm"
            square
            :aria-label="t('pages.attendance.gridView')"
            @click="viewMode = 'grid'"
          />
        </div>
        <UButton
          v-if="canEdit && staffRows.length > 0"
          icon="i-lucide-check-check"
          color="primary"
          variant="soft"
          class="shrink-0"
          @click="handleMarkAllPresent"
        >
          {{ t('pages.attendance.markAllPresent') }}
        </UButton>
      </template>
    </CommonToolbar>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <div v-if="isLoading && staffRows.length === 0" class="flex justify-center py-16">
        <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary" />
      </div>

      <CommonOfflineEmptyState v-else-if="loadError && !online" />

      <div v-else-if="loadError" class="p-6 text-sm text-error text-center">
        {{ loadError }}
      </div>

      <div v-else-if="staffRows.length === 0" class="flex flex-col items-center justify-center gap-3 py-14">
        <UIcon name="i-lucide-users" class="w-10 h-10 text-muted" />
        <p class="text-sm text-muted">
          {{ t('pages.attendance.noStaff') }}
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
        <!-- Mobile + grid cards -->
        <div
          v-if="viewMode === 'grid'"
          class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 sm:p-6"
        >
          <div
            v-for="row in filteredRows"
            :key="row.userId"
            class="rounded-xl border border-default bg-default p-4 flex flex-col gap-3"
          >
            <div class="flex items-center gap-3">
              <img :src="row.avatar" :alt="row.name" class="w-10 h-10 rounded-full object-cover border border-default shrink-0">
              <p class="font-semibold truncate flex-1 min-w-0">
                {{ row.name }}
              </p>
              <AttendanceNotePopover :name="row.name" :notes="row.notes" :disabled="!canEdit" @save="(v) => setNote(row.userId, v)" />
            </div>
            <AttendanceStatusToggle :status="row.status" :disabled="!canEdit" @set="(s: AttendanceStatus) => setStatus(row.userId, s)" />
          </div>
        </div>

        <div v-else class="flex flex-col gap-3 p-3 md:hidden">
          <div
            v-for="row in filteredRows"
            :key="row.userId"
            class="rounded-xl border border-default bg-default p-4 flex flex-col gap-3"
          >
            <div class="flex items-center gap-3">
              <img :src="row.avatar" :alt="row.name" class="w-10 h-10 rounded-full object-cover border border-default shrink-0">
              <p class="font-semibold truncate flex-1 min-w-0">
                {{ row.name }}
              </p>
              <AttendanceNotePopover :name="row.name" :notes="row.notes" :disabled="!canEdit" @save="(v) => setNote(row.userId, v)" />
            </div>
            <AttendanceStatusToggle :status="row.status" :disabled="!canEdit" @set="(s: AttendanceStatus) => setStatus(row.userId, s)" />
          </div>
        </div>

        <div v-if="viewMode === 'table'" class="hidden md:block overflow-x-auto">
          <UTable :data="filteredRows" :columns="columns" :loading="isLoading" class="min-w-[640px]">
            <template #name-cell="{ row }">
              <div class="flex items-center gap-3 min-w-0">
                <img
                  :src="row.original.avatar"
                  :alt="row.original.name"
                  class="w-8 h-8 rounded-full object-cover border border-default shrink-0"
                >
                <span class="font-medium truncate">{{ row.original.name }}</span>
              </div>
            </template>

            <template #status-cell="{ row }">
              <AttendanceStatusToggle
                :status="row.original.status"
                compact
                :disabled="!canEdit"
                @set="(s: AttendanceStatus) => setStatus(row.original.userId, s)"
              />
            </template>

            <template #note-cell="{ row }">
              <AttendanceNotePopover
                :name="row.original.name"
                :notes="row.original.notes"
                :disabled="!canEdit"
                @save="(v) => setNote(row.original.userId, v)"
              />
            </template>
          </UTable>
        </div>
      </template>
    </UCard>

    <AttendanceStickyBar
      v-if="canEdit"
      :is-saving="isSaving"
      :is-dirty="isDirty"
      @save="handleSave"
      @discard="discardChanges"
    />
  </div>
</template>
