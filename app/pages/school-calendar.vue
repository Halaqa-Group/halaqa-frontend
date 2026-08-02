<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import ConfirmDialog from '~/components/common/ConfirmDialog.vue'
import type { ApiHoliday, ApiSchoolSchedule } from '~/types'

definePageMeta({
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.schoolCalendar.title' }
  ]
})

const { t, locale } = useI18n()
const toast = useToast()
const apiError = useApiError()
const { canManageCalendar: canManage } = usePermissions()

const {
  schedules, holidays, isLoadingSchedules, isLoadingHolidays,
  fetchSchedules, createSchedule, deleteSchedule,
  fetchHolidays, createHoliday, deleteHoliday
} = useSchoolCalendar()

// 0 = Saturday … 6 = Friday
const dayNames = computed(() => [
  t('pages.schoolCalendar.days.sat'),
  t('pages.schoolCalendar.days.sun'),
  t('pages.schoolCalendar.days.mon'),
  t('pages.schoolCalendar.days.tue'),
  t('pages.schoolCalendar.days.wed'),
  t('pages.schoolCalendar.days.thu'),
  t('pages.schoolCalendar.days.fri')
])
function dayLabel(d: number) {
  return dayNames.value[d] ?? String(d)
}

const dateLocale = computed(() => locale.value === 'ar' ? 'ar-EG' : 'en-US')
function formatDate(iso: string | null) {
  if (!iso) return '—'
  try {
    const [y, m, d] = iso.split('-').map(Number)
    if (!y || !m || !d) return iso
    return new Date(y, m - 1, d).toLocaleDateString(dateLocale.value, {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  } catch {
    return iso
  }
}

onMounted(() => {
  fetchSchedules().catch(e => toast.add({ description: apiError.format(e, t('pages.schoolCalendar.loadError')), color: 'error' }))
  fetchHolidays().catch(e => toast.add({ description: apiError.format(e, t('pages.schoolCalendar.loadError')), color: 'error' }))
})

// ─── Schedule add ─────────────────────────────────────────────────────────────

const scheduleColumns = computed<TableColumn<ApiSchoolSchedule>[]>(() => [
  { accessorKey: 'day_of_week', header: t('pages.schoolCalendar.schedule.day') },
  { accessorKey: 'effective_from', header: t('pages.schoolCalendar.schedule.from') },
  { accessorKey: 'effective_to', header: t('pages.schoolCalendar.schedule.to') },
  { accessorKey: 'notes', header: t('pages.schoolCalendar.schedule.notes') },
  ...(canManage.value ? [{ id: 'actions', header: '' }] : [])
])

const scheduleOpen = ref(false)
const scheduleSaving = ref(false)
const scheduleForm = ref<{ day_of_week: number, effective_from: string, effective_to: string, notes: string }>({
  day_of_week: 0,
  effective_from: new Date().toISOString().split('T')[0]!,
  effective_to: '',
  notes: ''
})

const dayItems = computed(() => dayNames.value.map((label, value) => ({ label, value })))

function openScheduleForm() {
  scheduleForm.value = {
    day_of_week: 0,
    effective_from: new Date().toISOString().split('T')[0]!,
    effective_to: '',
    notes: ''
  }
  scheduleOpen.value = true
}

async function submitSchedule() {
  if (!scheduleForm.value.effective_from) return
  scheduleSaving.value = true
  try {
    await createSchedule({
      day_of_week: scheduleForm.value.day_of_week,
      effective_from: scheduleForm.value.effective_from,
      effective_to: scheduleForm.value.effective_to || undefined,
      notes: scheduleForm.value.notes.trim() || undefined
    })
    toast.add({ description: t('pages.schoolCalendar.schedule.addedToast'), color: 'success' })
    scheduleOpen.value = false
  } catch (e: unknown) {
    toast.add({ description: apiError.format(e, t('pages.schoolCalendar.schedule.addError')), color: 'error' })
  } finally {
    scheduleSaving.value = false
  }
}

const scheduleDeleteOpen = ref(false)
const scheduleDeleteTarget = ref<ApiSchoolSchedule | null>(null)
function requestScheduleDelete(s: ApiSchoolSchedule) {
  scheduleDeleteTarget.value = s
  scheduleDeleteOpen.value = true
}
async function confirmScheduleDelete() {
  const target = scheduleDeleteTarget.value
  scheduleDeleteTarget.value = null
  if (!target) return
  try {
    await deleteSchedule(target.id)
    toast.add({ description: t('pages.schoolCalendar.schedule.deletedToast'), color: 'success' })
  } catch (e: unknown) {
    toast.add({ description: apiError.format(e, t('pages.schoolCalendar.schedule.deleteError')), color: 'error' })
  }
}

// ─── Holiday add ──────────────────────────────────────────────────────────────

const holidayColumns = computed<TableColumn<ApiHoliday>[]>(() => [
  { accessorKey: 'holiday_date', header: t('pages.schoolCalendar.holiday.date') },
  { accessorKey: 'description', header: t('pages.schoolCalendar.holiday.description') },
  ...(canManage.value ? [{ id: 'actions', header: '' }] : [])
])

const holidayOpen = ref(false)
const holidaySaving = ref(false)
const holidayForm = ref<{ holiday_date: string, description: string }>({
  holiday_date: new Date().toISOString().split('T')[0]!,
  description: ''
})

function openHolidayForm() {
  holidayForm.value = { holiday_date: new Date().toISOString().split('T')[0]!, description: '' }
  holidayOpen.value = true
}

async function submitHoliday() {
  if (!holidayForm.value.holiday_date || !holidayForm.value.description.trim()) return
  holidaySaving.value = true
  try {
    await createHoliday({
      holiday_date: holidayForm.value.holiday_date,
      description: holidayForm.value.description.trim()
    })
    toast.add({ description: t('pages.schoolCalendar.holiday.addedToast'), color: 'success' })
    holidayOpen.value = false
  } catch (e: unknown) {
    toast.add({ description: apiError.format(e, t('pages.schoolCalendar.holiday.addError')), color: 'error' })
  } finally {
    holidaySaving.value = false
  }
}

const holidayDeleteOpen = ref(false)
const holidayDeleteTarget = ref<ApiHoliday | null>(null)
function requestHolidayDelete(h: ApiHoliday) {
  holidayDeleteTarget.value = h
  holidayDeleteOpen.value = true
}
async function confirmHolidayDelete() {
  const target = holidayDeleteTarget.value
  holidayDeleteTarget.value = null
  if (!target) return
  try {
    await deleteHoliday(target.id)
    toast.add({ description: t('pages.schoolCalendar.holiday.deletedToast'), color: 'success' })
  } catch (e: unknown) {
    toast.add({ description: apiError.format(e, t('pages.schoolCalendar.holiday.deleteError')), color: 'error' })
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Operating days -->
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div class="space-y-0.5">
            <h2 class="font-semibold">
              {{ t('pages.schoolCalendar.schedule.title') }}
            </h2>
            <p class="text-xs text-muted">
              {{ t('pages.schoolCalendar.schedule.hint') }}
            </p>
          </div>
          <UButton v-if="canManage" icon="i-lucide-plus" size="sm" class="shrink-0" @click="openScheduleForm">
            {{ t('pages.schoolCalendar.schedule.addButton') }}
          </UButton>
        </div>
      </template>

      <UTable :data="schedules" :columns="scheduleColumns" :loading="isLoadingSchedules">
        <template #day_of_week-cell="{ row }">
          <UBadge variant="soft" color="primary">
            {{ dayLabel(row.original.day_of_week) }}
          </UBadge>
        </template>
        <template #effective_from-cell="{ row }">
          {{ formatDate(row.original.effective_from) }}
        </template>
        <template #effective_to-cell="{ row }">
          <span :class="row.original.effective_to ? '' : 'text-muted'">
            {{ row.original.effective_to ? formatDate(row.original.effective_to) : t('pages.schoolCalendar.schedule.openEnded') }}
          </span>
        </template>
        <template #notes-cell="{ row }">
          <span class="text-sm text-muted">{{ row.original.notes || '—' }}</span>
        </template>
        <template #actions-cell="{ row }">
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="sm"
            square
            :aria-label="t('common.delete')"
            @click="requestScheduleDelete(row.original)"
          />
        </template>
      </UTable>

      <div v-if="!isLoadingSchedules && schedules.length === 0" class="text-center text-sm text-muted py-8">
        {{ t('pages.schoolCalendar.schedule.empty') }}
      </div>
    </UCard>

    <!-- Holidays -->
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div class="space-y-0.5">
            <h2 class="font-semibold">
              {{ t('pages.schoolCalendar.holiday.title') }}
            </h2>
            <p class="text-xs text-muted">
              {{ t('pages.schoolCalendar.holiday.hint') }}
            </p>
          </div>
          <UButton v-if="canManage" icon="i-lucide-plus" size="sm" class="shrink-0" @click="openHolidayForm">
            {{ t('pages.schoolCalendar.holiday.addButton') }}
          </UButton>
        </div>
      </template>

      <UTable :data="holidays" :columns="holidayColumns" :loading="isLoadingHolidays">
        <template #holiday_date-cell="{ row }">
          <UBadge variant="soft" color="error">
            {{ formatDate(row.original.holiday_date) }}
          </UBadge>
        </template>
        <template #description-cell="{ row }">
          {{ row.original.description }}
        </template>
        <template #actions-cell="{ row }">
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="sm"
            square
            :aria-label="t('common.delete')"
            @click="requestHolidayDelete(row.original)"
          />
        </template>
      </UTable>

      <div v-if="!isLoadingHolidays && holidays.length === 0" class="text-center text-sm text-muted py-8">
        {{ t('pages.schoolCalendar.holiday.empty') }}
      </div>
    </UCard>

    <!-- Add schedule modal -->
    <UModal v-model:open="scheduleOpen" :title="t('pages.schoolCalendar.schedule.addButton')">
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField :label="t('pages.schoolCalendar.schedule.day')">
            <USelect v-model="scheduleForm.day_of_week" :items="dayItems" value-key="value" class="w-full" />
          </UFormField>
          <UFormField :label="t('pages.schoolCalendar.schedule.from')">
            <UInput v-model="scheduleForm.effective_from" type="date" class="w-full" />
          </UFormField>
          <UFormField :label="t('pages.schoolCalendar.schedule.toOptional')">
            <UInput v-model="scheduleForm.effective_to" type="date" class="w-full" />
          </UFormField>
          <UFormField :label="t('pages.schoolCalendar.schedule.notesOptional')">
            <UInput v-model="scheduleForm.notes" class="w-full" :placeholder="t('pages.schoolCalendar.schedule.notesPlaceholder')" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex items-center justify-end gap-2 w-full">
          <UButton variant="soft" color="neutral" :disabled="scheduleSaving" @click="scheduleOpen = false">
            {{ t('common.cancel') }}
          </UButton>
          <UButton color="primary" :loading="scheduleSaving" :disabled="!scheduleForm.effective_from" @click="submitSchedule">
            {{ t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Add holiday modal -->
    <UModal v-model:open="holidayOpen" :title="t('pages.schoolCalendar.holiday.addButton')">
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField :label="t('pages.schoolCalendar.holiday.date')">
            <UInput v-model="holidayForm.holiday_date" type="date" class="w-full" />
          </UFormField>
          <UFormField :label="t('pages.schoolCalendar.holiday.description')">
            <UInput v-model="holidayForm.description" class="w-full" :placeholder="t('pages.schoolCalendar.holiday.descriptionPlaceholder')" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex items-center justify-end gap-2 w-full">
          <UButton variant="soft" color="neutral" :disabled="holidaySaving" @click="holidayOpen = false">
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            color="primary"
            :loading="holidaySaving"
            :disabled="!holidayForm.holiday_date || !holidayForm.description.trim()"
            @click="submitHoliday"
          >
            {{ t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <ConfirmDialog
      v-model:open="scheduleDeleteOpen"
      :title="t('pages.schoolCalendar.schedule.deleteTitle')"
      :message="t('pages.schoolCalendar.schedule.deleteMessage')"
      destructive
      :confirm-label="t('common.delete')"
      @confirm="confirmScheduleDelete"
    />

    <ConfirmDialog
      v-model:open="holidayDeleteOpen"
      :title="t('pages.schoolCalendar.holiday.deleteTitle')"
      :message="t('pages.schoolCalendar.holiday.deleteMessage')"
      destructive
      :confirm-label="t('common.delete')"
      @confirm="confirmHolidayDelete"
    />
  </div>
</template>
