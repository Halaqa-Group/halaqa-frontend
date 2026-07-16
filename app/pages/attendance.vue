<script setup lang="ts">
definePageMeta({
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.attendance.title' }
  ]
})

const { t } = useI18n()
const toast = useToast()
const { activeRole } = useAuth()
const { selectedHalaqaId, hasHalaqa } = useGlobalHalaqa()
const {
  attendanceRows, selectedDate, isSaving, isDirty,
  loadSession, submitSession, markAllPresent, applyUndoSnapshot, discardChanges
} = useAttendance()

// Staff attendance dirty state, so the unsaved-changes guards cover both tabs.
const { isDirty: staffIsDirty } = useTeacherAttendance()

const canMark = computed(() => activeRole.value !== 'parent')
const canManageStaff = computed(() =>
  activeRole.value === 'principal' || activeRole.value === 'vice_principal'
)

const tab = ref<'students' | 'staff'>('staff')
const tabItems = computed(() => [
  { label: t('pages.attendance.tabs.staff'), icon: 'i-lucide-briefcase', value: 'staff', slot: 'staff' as const },
  { label: t('pages.attendance.tabs.students'), icon: 'i-lucide-graduation-cap', value: 'students', slot: 'students' as const }
])

const anyDirty = computed(() => isDirty.value || staffIsDirty.value)

async function reload() {
  // A null halaqa is the unscoped roster, not a missing selection.
  if (hasHalaqa.value && selectedDate.value) {
    await loadSession(selectedHalaqaId.value, selectedDate.value)
  }
}

watch(selectedHalaqaId, reload)
watch(selectedDate, reload)

async function handleSaveAttendance() {
  try {
    await submitSession()
    toast.add({ title: t('pages.attendance.savedToastTitle'), icon: 'i-lucide-check-circle', color: 'success' })
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
})
</script>

<template>
  <div class="flex flex-col gap-6 pb-24">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold">
          {{ t('pages.attendance.title') }}
        </h1>
      </div>
    </div>

    <UTabs
      v-if="canManageStaff"
      v-model="tab"
      :items="tabItems"
      variant="link"
      class="w-full"
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
    </UTabs>

    <AttendanceStudentsSection
      v-else
      :can-mark="canMark"
      :has-halaqa="hasHalaqa"
      :has-rows="attendanceRows.length > 0"
      @mark-all="handleMarkAllPresent"
    />

    <AttendanceStickyBar
      v-if="tab === 'students' || !canManageStaff"
      :is-saving="isSaving"
      :is-dirty="isDirty"
      @save="handleSaveAttendance"
      @discard="discardChanges"
    />
  </div>
</template>
