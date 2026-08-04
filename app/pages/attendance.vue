<script setup lang="ts">
definePageMeta({
  breadcrumb: [
    { label: 'home', to: '/' },
    // Header shows the concise nav label ("الحضور"), not the verbose page title.
    { label: 'nav.attendance' }
  ]
})

const { t } = useI18n()
const toast = useToast()
const apiError = useApiError()
const { canMarkStudentAttendance, canViewStaffAttendance, canManageStaffAttendance } = usePermissions()
const { selectedHalaqaId, hasHalaqa } = useGlobalHalaqa()
const {
  attendanceRows, selectedDate, isSaving, isDirty,
  loadSession, resetSessionCache, submitSession, markAllPresent, applyUndoSnapshot, discardChanges
} = useAttendance()

// Staff attendance dirty state, so the unsaved-changes guards cover both tabs.
const { isDirty: staffIsDirty } = useTeacherAttendance()

// Recording student attendance is principal/vice_principal/teacher — a
// supervisor may read the roster but not save it.
const canMark = canMarkStudentAttendance
// All staff can read the staff roster; only admins get an editable one, which
// StaffPanel enforces on its own controls.
const canSeeStaffTab = canViewStaffAttendance

const tab = ref<'students' | 'staff'>(canManageStaffAttendance.value ? 'staff' : 'students')
const tabItems = computed(() => [
  { label: t('pages.attendance.tabs.staff'), icon: 'i-lucide-briefcase', value: 'staff', slot: 'staff' as const },
  { label: t('pages.attendance.tabs.students'), icon: 'i-lucide-graduation-cap', value: 'students', slot: 'students' as const }
])

const anyDirty = computed(() => isDirty.value || staffIsDirty.value)

// The student roster loads only while its tab is on screen (StaffPanel owns the
// staff roster). When there is no staff tab the students view is always active.
const studentTabActive = computed(() => !canSeeStaffTab.value || tab.value === 'students')

async function reload() {
  if (!studentTabActive.value) return
  // A null halaqa is the unscoped roster, not a missing selection.
  if (hasHalaqa.value && selectedDate.value) {
    await loadSession(selectedHalaqaId.value, selectedDate.value)
  }
}

watch(selectedHalaqaId, reload)
watch(selectedDate, reload)
// Load the first time the students tab becomes active (e.g. switched to from staff).
watch(studentTabActive, (active) => {
  if (active) reload()
})

async function handleSaveAttendance() {
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
  const id = `mark-all-${Date.now()}`
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

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (anyDirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onBeforeRouteLeave(() => {
  if (!anyDirty.value) return true
  return window.confirm(t('pages.attendance.unsavedConfirmLeave'))
})

onMounted(async () => {
  await reload()
  if (typeof window !== 'undefined') window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('beforeunload', handleBeforeUnload)
  // Drop the dedup marker so a later return to the page reloads the roster once.
  resetSessionCache()
})
</script>

<template>
  <div class="flex flex-col gap-6 pb-24">
    <CommonPageTabs
      v-if="canSeeStaffTab"
      v-model="tab"
      :items="tabItems"
      variant="link"
      class="w-full"
      flush-top
    >
      <template #students>
        <AttendanceStudentsSection
          :can-mark="canMark"
          :has-halaqa="hasHalaqa"
          :has-rows="attendanceRows.length > 0"
          @mark-all="handleMarkAllPresent"
        />
      </template>
      <template #staff>
        <AttendanceStaffPanel />
      </template>
    </CommonPageTabs>

    <AttendanceStudentsSection
      v-else
      :can-mark="canMark"
      :has-halaqa="hasHalaqa"
      :has-rows="attendanceRows.length > 0"
      @mark-all="handleMarkAllPresent"
    />

    <AttendanceStickyBar
      v-if="canMark && (tab === 'students' || !canSeeStaffTab)"
      :is-saving="isSaving"
      :is-dirty="isDirty"
      @save="handleSaveAttendance"
      @discard="discardChanges"
    />
  </div>
</template>
