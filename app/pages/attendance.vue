<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today, type DateValue } from '@internationalized/date'

const { t } = useI18n()
const {
  attendanceRows,
  filteredRows,
  sessionNotes,
  isLoading,
  isSaving,
  isDirty,
  viewMode,
  setViewMode,
  appendNote,
  loadSession,
  submitSession,
  markAllPresent,
  applyUndoSnapshot,
  discardChanges,
  wasAbsentYesterday
} = useAttendance()
const { selectedHalaqaId, hasHalaqa } = useGlobalHalaqa()
const toast = useToast()

const _today = new Date()
const selectedDate = ref(`${_today.getFullYear()}-${String(_today.getMonth() + 1).padStart(2, '0')}-${String(_today.getDate()).padStart(2, '0')}`)
const quickTags = computed(() => [
  t('pages.attendance.quickTags.excellentEngagement'),
  t('pages.attendance.quickTags.groupReview'),
  t('pages.attendance.quickTags.partCompleted')
])
const searchQuery = ref('')
const calendarOpen = ref(false)

const visibleRows = computed(() =>
  filteredRows.value.filter(r =>
    !searchQuery.value || r.name.includes(searchQuery.value)
  )
)

async function onDateChange() {
  if (selectedHalaqaId.value && selectedDate.value) {
    await loadSession(selectedHalaqaId.value, selectedDate.value)
  }
}

const calendarValue = computed(() => {
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  return new CalendarDate(y!, m!, d!)
})
const maxCalendarValue = today(getLocalTimeZone())

function onCalendarPick(value: DateValue | null) {
  if (!value) return
  selectedDate.value = `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
  calendarOpen.value = false
  onDateChange()
}

watch(selectedHalaqaId, async (newHalaqaId, oldHalaqaId) => {
  if (newHalaqaId && newHalaqaId !== oldHalaqaId && selectedDate.value) {
    await loadSession(newHalaqaId, selectedDate.value)
  }
})

async function handleSaveAttendance() {
  try {
    await submitSession()
    toast.add({
      title: t('pages.attendance.savedToastTitle'),
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: t('pages.attendance.saveErrorTitle'),
      description: error.message || t('pages.attendance.saveErrorFallback'),
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

function handleMarkAllPresent() {
  const snap = markAllPresent()
  const id = `mark-all-${Date.now()}`
  toast.add({
    id,
    title: t('pages.attendance.markedAllPresent'),
    icon: 'i-lucide-check-circle',
    color: 'primary',
    duration: 4000,
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

function handleDiscard() {
  discardChanges()
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (isDirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onBeforeRouteLeave(() => {
  if (!isDirty.value) return true
  return window.confirm(t('pages.attendance.unsavedConfirmLeave'))
})

onMounted(async () => {
  if (selectedHalaqaId.value && selectedDate.value) {
    await loadSession(selectedHalaqaId.value, selectedDate.value)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleBeforeUnload)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }
})
</script>

<template>
  <div class="flex flex-col gap-6 pb-24">
    <!-- Screen header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-2">
      <div class="space-y-1">
        <span class="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-primary">
          {{ $t('pages.attendance.recordLabel') }}
        </span>
        <h2 class="text-2xl sm:text-3xl font-bold leading-tight text-on-surface">
          {{ $t('pages.attendance.title') }}
        </h2>
        <p class="text-sm text-on-surface-variant">
          {{ $t('pages.attendance.subtitle') }}
        </p>
      </div>
    </div>

    <!-- Stats (clickable filters) -->
    <AttendanceStats />

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <!-- Empty: no halaqa selected -->
    <div
      v-else-if="!hasHalaqa"
      class="flex flex-col items-center gap-3 py-12 rounded-2xl bg-surface-container-lowest"
    >
      <UIcon name="i-lucide-layers" class="w-10 h-10 text-on-surface-variant" />
      <p class="text-sm font-normal leading-relaxed text-on-surface-variant">
        {{ $t('common.selectHalaqaPrompt') }}
      </p>
    </div>

    <template v-else>
      <!-- Date strip + open-calendar -->
      <AttendanceDateStrip
        v-model="selectedDate"
        @update:model-value="onDateChange"
      >
        <template #trigger>
          <UPopover v-model:open="calendarOpen">
            <UButton
              variant="outline"
              color="primary"
              icon="i-lucide-calendar-days"
              size="md"
              class="shrink-0 rounded-full"
              :aria-label="$t('pages.attendance.viewFullCalendar')"
            >
              <span class="hidden sm:inline">{{ $t('pages.attendance.viewFullCalendar') }}</span>
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
        </template>
      </AttendanceDateStrip>

      <!-- Toolbar: search + mark-all + view toggle -->
      <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
        <UInput
          v-model="searchQuery"
          type="text"
          :placeholder="$t('pages.attendance.searchPlaceholder')"
          trailing-icon="i-lucide-search"
          variant="none"
          class="flex-1 min-w-[200px] sm:min-w-[240px]"
          :ui="{
            base: 'w-full pe-11 ps-4 py-3 rounded-2xl text-base bg-surface-container-lowest text-on-surface border-[1.5px] border-outline-variant focus:ring-2 focus:ring-primary/30',
            trailing: 'absolute inset-y-0 end-4',
            trailingIcon: 'w-4 h-4 text-on-surface-variant'
          }"
        />

        <UButton
          icon="i-lucide-check-check"
          color="primary"
          variant="soft"
          size="lg"
          class="rounded-full font-semibold px-3 sm:px-5 cursor-pointer shrink-0"
          :disabled="attendanceRows.length === 0"
          :aria-label="$t('pages.attendance.markAllPresent')"
          @click="handleMarkAllPresent"
        >
          <span class="hidden sm:inline">{{ $t('pages.attendance.markAllPresent') }}</span>
        </UButton>

        <UFieldGroup orientation="horizontal" class="shrink-0">
          <UButton :color="viewMode === 'grid' ? 'primary' : 'neutral'" icon="i-lucide-layout-grid" variant="subtle" class="rounded-full px-3 sm:px-4" :aria-label="$t('pages.attendance.gridView')" @click="setViewMode('grid')" />
          <UButton :color="viewMode === 'list' ? 'primary' : 'neutral'" icon="i-lucide-list" variant="subtle" class="rounded-full px-3 sm:px-4" :aria-label="$t('pages.attendance.listView')" @click="setViewMode('list')" />
        </UFieldGroup>
      </div>

      <!-- Filter chips -->
      <AttendanceFilterChips />

      <!-- Student rows -->
      <div
        v-if="visibleRows.length > 0"
        :class="viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5' : 'flex flex-col gap-2'"
      >
        <AttendanceRow
          v-for="row in visibleRows"
          :key="row.studentId"
          v-bind="row"
          :view="viewMode"
          :absent-yesterday="wasAbsentYesterday(row.studentId)"
        />
      </div>
      <div
        v-else
        class="flex flex-col items-center gap-3 py-12 rounded-2xl bg-surface-container-lowest"
      >
        <UIcon name="i-lucide-user-x" class="w-10 h-10 text-on-surface-variant" />
        <p class="text-sm font-normal leading-relaxed text-on-surface-variant">
          {{ attendanceRows.length === 0 ? $t('pages.attendance.noStudentsInHalaqa') : $t('common.noResults') }}
        </p>
      </div>

      <!-- Session notes -->
      <div class="rounded-2xl p-4 sm:p-5 bg-surface-container-lowest shadow-card ring ring-card-border">
        <div class="flex items-center justify-between gap-2 mb-3">
          <p class="text-sm sm:text-base font-semibold leading-relaxed text-on-surface">
            {{ $t('pages.attendance.sessionNotes') }}
          </p>
          <UButton variant="ghost" color="neutral" icon="i-lucide-sparkles" size="sm" class="shrink-0" :aria-label="$t('pages.attendance.smartAssistant')">
            <span class="hidden sm:inline">{{ $t('pages.attendance.smartAssistant') }}</span>
          </UButton>
        </div>
        <UTextarea
          v-model="sessionNotes"
          :rows="3"
          :placeholder="$t('pages.attendance.notesPlaceholder')"
          variant="none"
          class="w-full"
          :ui="{
            base: 'w-full resize-none rounded-xl p-3 text-sm bg-surface-container-low text-on-surface'
          }"
        />
        <div class="flex items-center gap-2 mt-3 flex-wrap">
          <span class="text-xs font-semibold leading-tight tracking-wide text-on-surface-variant">{{ $t('pages.attendance.quickAdd') }}</span>
          <UButton
            v-for="tag in quickTags"
            :key="tag"
            variant="soft"
            color="neutral"
            size="xs"
            :label="tag"
            class="px-3 py-1 rounded-full text-xs font-normal"
            @click="appendNote(tag)"
          />
        </div>
      </div>

      <!-- Sticky save bar -->
      <AttendanceStickyBar
        :is-saving="isSaving"
        @save="handleSaveAttendance"
        @discard="handleDiscard"
      />

    </template>
  </div>
</template>
