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

const canMark = computed(() => activeRole.value !== 'parent')

async function reload() {
  if (selectedHalaqaId.value && selectedDate.value) {
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
      <UButton
        v-if="canMark && hasHalaqa && attendanceRows.length > 0"
        icon="i-lucide-check-check"
        color="primary"
        variant="soft"
        class="shrink-0"
        @click="handleMarkAllPresent"
      >
        {{ t('pages.attendance.markAllPresent') }}
      </UButton>
    </div>

    <div
      v-if="!hasHalaqa"
      class="flex flex-col items-center gap-3 py-12 rounded-xl border border-default bg-default"
    >
      <UIcon name="i-lucide-layers" class="w-10 h-10 text-muted" />
      <p class="text-sm text-muted">
        {{ t('common.selectHalaqaPrompt') }}
      </p>
    </div>

    <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <AttendanceFilterBar />
      </template>
      <AttendanceResults />
    </UCard>

    <AttendanceStickyBar
      :is-saving="isSaving"
      @save="handleSaveAttendance"
      @discard="discardChanges"
    />
  </div>
</template>
