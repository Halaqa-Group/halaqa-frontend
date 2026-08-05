<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import type { TableColumn, DropdownMenuItem, TableRow } from '@nuxt/ui'
import type { StudentReportRow } from '~/types'
import {
  attendanceMeta,
  formatRate,
  formatScore,
  isMissingAttendance
} from '~/utils/daily-report'

definePageMeta({
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.dailyReport.title' }
  ]
})

const { t } = useI18n()
const toast = useToast()
const { canManageHalaqaLifecycle } = usePermissions()
const { halaqat, fetchHalaqat } = useHalaqat()
const {
  report, isLoading, isRecalculating, error,
  fetchReport, recalculate
} = useDailyReport()

// ── Halaqa + date selection ──────────────────────────────────────────────────
// A report is always scoped to ONE halaqa (unlike attendance, which an admin can
// browse unscoped), so the page requires a concrete halaqa id.
const halaqaId = ref<number | null>(null)
const selectedDate = ref<string>(new Date().toISOString().split('T')[0]!)

const halaqaItems = computed(() =>
  halaqat.value.map(h => ({ label: h.name, value: h.id }))
)

const calendarOpen = ref(false)
const calendarValue = computed(() => {
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  return new CalendarDate(y!, m!, d!)
})
const maxCalendarValue = computed(() => today(getLocalTimeZone()))
const formattedDate = computed(() => {
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  if (!y || !m || !d) return selectedDate.value
  return new Date(y, m - 1, d).toLocaleDateString('ar', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
})
function onCalendarPick(value: unknown) {
  if (!value) return
  const v = value as { year: number, month: number, day: number }
  selectedDate.value = `${v.year}-${String(v.month).padStart(2, '0')}-${String(v.day).padStart(2, '0')}`
  calendarOpen.value = false
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function shiftDate(days: number) {
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  if (!y || !m || !d) return
  const next = new Date(y, m - 1, d)
  next.setDate(next.getDate() + days)
  selectedDate.value = isoOf(next)
}
// No future reports — the calendar caps at today, so "next" stops there too.
const isToday = computed(() => selectedDate.value >= isoOf(new Date()))

// ── Load ─────────────────────────────────────────────────────────────────────
async function reload() {
  if (halaqaId.value === null || !selectedDate.value) return
  try {
    await fetchReport(halaqaId.value, selectedDate.value)
  } catch {
    // error surfaced via `error` ref
  }
}

watch([halaqaId, selectedDate], reload)

onMounted(async () => {
  await fetchHalaqat({ status: 'active', limit: 100 })
  if (halaqaId.value === null && halaqat.value.length > 0) {
    halaqaId.value = halaqat.value[0]!.id
  }
})

// ── Derived view state ───────────────────────────────────────────────────────
const isNonWorkingDay = computed(() => report.value?.day_status === 'non_working_day')

const columns = computed<TableColumn<StudentReportRow>[]>(() => {
  // Each track's scoring weight rides in its column header (e.g. "حفظ · 40%"),
  // shown where the score is instead of in a separate strip above the table.
  const w = report.value?.weights
  const centered = { class: { th: 'text-center', td: 'text-center' } }
  const withWeight = (labelKey: string, val?: number) => {
    const label = t(labelKey)
    if (val == null) return label
    const pct = Number.isInteger(val) ? val : Math.round(val * 10) / 10
    return `${label} · ${pct}%`
  }
  return [
    { accessorKey: 'student_name', header: t('pages.dailyReport.columns.student') },
    { accessorKey: 'attendance_status', header: t('pages.dailyReport.columns.attendance'), meta: centered },
    { accessorKey: 'hifz_score', header: withWeight('tracks.hifz', w?.hifz), meta: centered },
    { accessorKey: 'near_score', header: withWeight('tracks.near', w?.near), meta: centered },
    { accessorKey: 'far_score', header: withWeight('tracks.far', w?.far), meta: centered },
    { accessorKey: 'ethics_score', header: withWeight('pages.dailyReport.ethics', w?.ethics), meta: centered },
    { accessorKey: 'plan_completion_rate', header: t('pages.dailyReport.columns.planCompletion'), meta: centered },
    { accessorKey: 'total_score', header: t('pages.dailyReport.columns.total'), meta: centered },
    { id: 'alerts', header: t('pages.dailyReport.columns.alerts') },
    { id: 'actions', header: t('pages.dailyReport.columns.actions') }
  ]
})

function rowMenuItems(row: StudentReportRow): DropdownMenuItem[][] {
  return [[
    {
      label: t('pages.dailyReport.rowActions.viewDetails'),
      icon: 'i-lucide-eye',
      onSelect: () => openDetail(row)
    },
    {
      label: t('pages.dailyReport.rowActions.viewProfile'),
      icon: 'i-lucide-user',
      onSelect: () => navigateTo(`/students/${row.student_id}`)
    },
    {
      label: t('pages.dailyReport.rowActions.logAchievement'),
      icon: 'i-lucide-book-open',
      onSelect: () => navigateTo(`/achievements?studentId=${row.student_id}`)
    }
  ]]
}

// ── Student detail modal ─────────────────────────────────────────────────────
const detailOpen = ref(false)
const detailStudentId = ref<number | null>(null)
const detailStudentName = ref('')
function openDetail(row: StudentReportRow) {
  detailStudentId.value = row.student_id
  detailStudentName.value = row.student_name
  detailOpen.value = true
}
function onRowSelect(_e: Event, row: TableRow<StudentReportRow>) {
  openDetail(row.original)
}

// ── Recalculate ──────────────────────────────────────────────────────────────
const recalcOpen = ref(false)
const apiError = useApiError()
async function onRecalculate(reason: string) {
  if (halaqaId.value === null) return
  try {
    await recalculate(halaqaId.value, selectedDate.value, reason)
    recalcOpen.value = false
    toast.add({ title: t('pages.dailyReport.recalculate.doneToast'), color: 'success' })
    await reload()
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.dailyReport.recalculate.errorToast')), color: 'error' })
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3">
      <CommonToolbar>
        <USelectMenu
          v-model="halaqaId"
          :items="halaqaItems"
          value-key="value"
          :placeholder="t('common.selectHalaqa')"
          icon="i-lucide-building-2"
          class="w-full sm:flex-1 sm:max-w-xs"
        />

        <div class="flex items-center gap-1">
          <UButton
            variant="outline"
            color="neutral"
            icon="i-lucide-chevron-right"
            square
            :aria-label="t('pages.dailyReport.prevDay')"
            @click="shiftDate(-1)"
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
          <UButton
            variant="outline"
            color="neutral"
            icon="i-lucide-chevron-left"
            square
            :disabled="isToday"
            :aria-label="t('pages.dailyReport.nextDay')"
            @click="shiftDate(1)"
          />
        </div>

        <template #actions>
          <UButton
            v-if="report && canManageHalaqaLifecycle"
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            :label="t('pages.dailyReport.recalculate.button')"
            @click="recalcOpen = true"
          />
        </template>
      </CommonToolbar>
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <!-- States -->
      <div v-if="isLoading" class="flex items-center justify-center py-16">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
      </div>

      <div v-else-if="error" class="flex flex-col items-center gap-3 py-12 text-center">
        <UIcon name="i-lucide-triangle-alert" class="size-8 text-error" />
        <p class="text-sm text-error">
          {{ error }}
        </p>
        <UButton variant="soft" size="sm" :label="t('common.tryAgain')" @click="reload" />
      </div>

      <div v-else-if="halaqaId === null" class="py-12 text-center text-sm text-muted">
        {{ t('common.selectHalaqaToContinue') }}
      </div>

      <!-- Non-working day: no zero-filled rows -->
      <div v-else-if="isNonWorkingDay" class="flex flex-col items-center gap-2 py-14 text-center">
        <UIcon name="i-lucide-calendar-off" class="size-8 text-muted" />
        <p class="font-medium">
          {{ t('pages.dailyReport.nonWorkingDay') }}
        </p>
        <p class="text-sm text-muted">
          {{ t('pages.dailyReport.nonWorkingDayHint') }}
        </p>
      </div>

      <div v-else-if="report && report.students.length === 0" class="py-12 text-center text-sm text-muted">
        {{ t('pages.dailyReport.noStudents') }}
      </div>

      <!-- Report table -->
      <div v-else-if="report">
        <UTable
          :data="report.students"
          :columns="columns"
          :loading="isLoading"
          :on-select="onRowSelect"
          :ui="{ base: 'w-full min-w-[800px]', tr: 'cursor-pointer' }"
        >
          <template #student_name-cell="{ row }">
            <div class="flex items-center gap-2 min-w-0">
              <span class="font-medium truncate">{{ row.original.student_name }}</span>
              <UIcon
                v-if="row.original.teacher_note"
                name="i-lucide-sticky-note"
                class="size-3.5 text-primary shrink-0"
                :title="row.original.teacher_note"
              />
            </div>
          </template>

          <template #attendance_status-cell="{ row }">
            <UBadge
              :color="attendanceMeta(row.original.attendance_status).color"
              variant="subtle"
              size="sm"
              :label="t(attendanceMeta(row.original.attendance_status).labelKey)"
            />
          </template>

          <template #hifz_score-cell="{ row }">
            <span class="tabular-nums">
              {{ isMissingAttendance(row.original.attendance_status) ? '—' : formatScore(row.original.hifz_score) }}
            </span>
          </template>

          <template #near_score-cell="{ row }">
            <span class="tabular-nums">
              {{ isMissingAttendance(row.original.attendance_status) ? '—' : formatScore(row.original.near_score) }}
            </span>
          </template>

          <template #far_score-cell="{ row }">
            <span class="tabular-nums">
              {{ isMissingAttendance(row.original.attendance_status) ? '—' : formatScore(row.original.far_score) }}
            </span>
          </template>

          <template #ethics_score-cell="{ row }">
            <span class="tabular-nums">
              {{ isMissingAttendance(row.original.attendance_status) ? '—' : formatScore(row.original.ethics_score) }}
            </span>
          </template>

          <template #plan_completion_rate-cell="{ row }">
            <span class="tabular-nums text-muted">
              {{ formatRate(row.original.plan_completion_rate) }}
            </span>
          </template>

          <template #total_score-cell="{ row }">
            <span
              class="font-bold tabular-nums"
              :class="row.original.total_score === null ? 'text-muted' : 'text-primary'"
            >
              {{ formatScore(row.original.total_score) }}
            </span>
          </template>

          <template #alerts-cell="{ row }">
            <DailyReportSystemAlerts :alerts="row.original.system_alerts" compact />
          </template>

          <!-- Stop propagation so the menu doesn't also open the row's detail. -->
          <template #actions-cell="{ row }">
            <div class="flex justify-end" @click.stop>
              <UDropdownMenu
                :items="rowMenuItems(row.original)"
                :content="{ align: 'end', collisionPadding: 12 }"
              >
                <UButton
                  icon="i-lucide-ellipsis-vertical"
                  color="neutral"
                  variant="ghost"
                  square
                  :aria-label="t('pages.dailyReport.columns.actions')"
                />
              </UDropdownMenu>
            </div>
          </template>
        </UTable>
      </div>
    </UCard>

    <DailyReportStudentDetail
      v-if="halaqaId !== null"
      v-model:open="detailOpen"
      :halaqa-id="halaqaId"
      :date="selectedDate"
      :student-id="detailStudentId"
      :student-name="detailStudentName"
    />

    <DailyReportRecalculateDialog
      v-model:open="recalcOpen"
      :loading="isRecalculating"
      @confirm="onRecalculate"
    />
  </div>
</template>
