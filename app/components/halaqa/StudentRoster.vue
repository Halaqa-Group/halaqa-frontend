<script setup lang="ts">
import type { ApiStudent, ApiStudentEnrollment } from '~/types'

const props = defineProps<{
  halaqaId: number
  canManage: boolean
}>()

const emit = defineEmits<{
  changed: []
}>()

const { t } = useI18n()
const toast = useToast()
const { listStudents, enrollStudent, removeStudent, transferStudent } = useHalaqaStudents()
const api = useApi()
const { halaqat } = useGlobalHalaqa()

const enrollments = ref<ApiStudentEnrollment[]>([])
const loading = ref(false)
const studentOptions = ref<{ id: number, name: string }[]>([])

async function load() {
  loading.value = true
  try {
    enrollments.value = await listStudents(props.halaqaId)
  } finally {
    loading.value = false
  }
}

async function loadStudentOptions() {
  if (studentOptions.value.length) return
  try {
    const data = await api<{ items: ApiStudent[] } | ApiStudent[]>('/students?limit=200&status=active')
    const items = Array.isArray(data) ? data : data.items
    studentOptions.value = items.map(s => ({ id: s.id, name: s.name }))
  } catch {
    studentOptions.value = []
  }
}

onMounted(load)

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Enroll modal ──────────────────────────────────────────────────────────
const enrollOpen = ref(false)
const enrollForm = reactive({
  student_id: null as number | null,
  enrollment_date: toIsoDate(new Date())
})
const enrollSaving = ref(false)

async function openEnroll() {
  await loadStudentOptions()
  enrollForm.student_id = null
  enrollForm.enrollment_date = toIsoDate(new Date())
  enrollOpen.value = true
}

const studentSelectItems = computed(() => [
  { label: t('common.selectStudent'), value: null },
  ...studentOptions.value.map(s => ({ label: s.name, value: s.id }))
])

async function submitEnroll() {
  if (!enrollForm.student_id) {
    toast.add({ title: t('common.selectStudent'), color: 'error' })
    return
  }
  enrollSaving.value = true
  try {
    await enrollStudent(props.halaqaId, {
      student_id: enrollForm.student_id,
      enrollment_date: enrollForm.enrollment_date
    })
    toast.add({ title: t('pages.halaqat.students.toastEnrolled'), color: 'success' })
    enrollOpen.value = false
    await load()
    emit('changed')
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message
    toast.add({ title: typeof msg === 'string' ? msg : t('pages.halaqat.toastError'), color: 'error' })
  } finally {
    enrollSaving.value = false
  }
}

// ── Remove modal ──────────────────────────────────────────────────────────
const removeOpen = ref(false)
const removeTarget = ref<ApiStudentEnrollment | null>(null)
const removeForm = reactive({
  outcome: 'completed' as 'completed' | 'unenrolled',
  notes: ''
})
const removeSaving = ref(false)

const outcomeItems = computed(() => [
  { label: t('pages.halaqat.students.outcome.completed'), value: 'completed' },
  { label: t('pages.halaqat.students.outcome.unenrolled'), value: 'unenrolled' }
])

function openRemove(e: ApiStudentEnrollment) {
  removeTarget.value = e
  removeForm.outcome = 'completed'
  removeForm.notes = ''
  removeOpen.value = true
}

async function submitRemove() {
  if (!removeTarget.value) return
  removeSaving.value = true
  try {
    await removeStudent(props.halaqaId, removeTarget.value.student_id, {
      outcome: removeForm.outcome,
      notes: removeForm.notes || undefined
    })
    toast.add({ title: t('pages.halaqat.students.toastRemoved'), color: 'success' })
    removeOpen.value = false
    removeTarget.value = null
    await load()
    emit('changed')
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message
    toast.add({ title: typeof msg === 'string' ? msg : t('pages.halaqat.toastError'), color: 'error' })
  } finally {
    removeSaving.value = false
  }
}

// ── Transfer modal ────────────────────────────────────────────────────────
const transferOpen = ref(false)
const transferTarget = ref<ApiStudentEnrollment | null>(null)
const transferForm = reactive({
  to_halaqa_id: null as number | null,
  reason: '',
  transfer_date: toIsoDate(new Date())
})
const transferSaving = ref(false)

const transferTargetItems = computed(() => [
  { label: t('pages.halaqat.students.fieldToHalaqa'), value: null },
  ...halaqat.value
    .filter(h => h.id !== props.halaqaId && h.status === 'active')
    .map(h => ({ label: h.name, value: h.id }))
])

function openTransfer(e: ApiStudentEnrollment) {
  transferTarget.value = e
  transferForm.to_halaqa_id = null
  transferForm.reason = ''
  transferForm.transfer_date = toIsoDate(new Date())
  transferOpen.value = true
}

async function submitTransfer() {
  if (!transferTarget.value || !transferForm.to_halaqa_id || !transferForm.reason.trim()) {
    toast.add({ title: t('pages.halaqat.toastError'), color: 'error' })
    return
  }
  transferSaving.value = true
  try {
    await transferStudent({
      student_id: transferTarget.value.student_id,
      from_halaqa_id: props.halaqaId,
      to_halaqa_id: transferForm.to_halaqa_id,
      reason: transferForm.reason.trim(),
      transfer_date: transferForm.transfer_date
    })
    toast.add({ title: t('pages.halaqat.students.toastTransferred'), color: 'success' })
    transferOpen.value = false
    transferTarget.value = null
    await load()
    emit('changed')
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message
    toast.add({ title: typeof msg === 'string' ? msg : t('pages.halaqat.toastError'), color: 'error' })
  } finally {
    transferSaving.value = false
  }
}

function rowActions(e: ApiStudentEnrollment) {
  if (!props.canManage) return [[]]
  return [[
    {
      label: t('pages.halaqat.students.transfer'),
      icon: 'i-lucide-arrow-right-left',
      onSelect: () => openTransfer(e)
    },
    {
      label: t('pages.halaqat.students.remove'),
      icon: 'i-lucide-user-minus',
      color: 'error' as const,
      onSelect: () => openRemove(e)
    }
  ]]
}
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">
          {{ t('pages.halaqat.students.title') }}
        </h3>
        <UButton
          v-if="canManage"
          icon="i-lucide-user-plus"
          size="sm"
          @click="openEnroll"
        >
          {{ t('pages.halaqat.students.addTitle') }}
        </UButton>
      </div>
    </template>

    <div v-if="loading" class="p-6 text-sm text-muted">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="!enrollments.length" class="p-6 text-sm text-muted text-center">
      {{ t('pages.halaqat.students.noActive') }}
    </div>
    <ul v-else class="divide-y divide-default">
      <li
        v-for="e in enrollments"
        :key="e.student_id"
        class="flex items-center justify-between gap-3 p-4"
      >
        <div class="space-y-1">
          <p class="font-medium">{{ e.student_name }}</p>
          <p class="text-xs text-muted">
            {{ t('pages.halaqat.students.enrollmentDate') }}: {{ e.enrollment_date }}
          </p>
        </div>
        <UDropdownMenu v-if="canManage" :items="rowActions(e)">
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            square
            :aria-label="t('pages.halaqat.actions')"
          />
        </UDropdownMenu>
      </li>
    </ul>
  </UCard>

  <!-- Enroll modal -->
  <UModal
    v-model:open="enrollOpen"
    :title="t('pages.halaqat.students.addTitle')"
    :ui="{ content: 'sm:max-w-md rounded-2xl' }"
  >
    <UButton class="sr-only" tabindex="-1" />
    <template #body>
      <div class="space-y-4">
        <UFormField :label="t('pages.halaqat.students.fieldStudent')" required>
          <USelect
            v-model="enrollForm.student_id"
            :items="studentSelectItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('pages.halaqat.students.fieldEnrollmentDate')">
          <UInput v-model="enrollForm.enrollment_date" type="date" class="w-full" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton variant="soft" color="neutral" :disabled="enrollSaving" @click="enrollOpen = false">
          {{ t('pages.halaqat.cancel') }}
        </UButton>
        <UButton :loading="enrollSaving" @click="submitEnroll">
          {{ t('pages.halaqat.save') }}
        </UButton>
      </div>
    </template>
  </UModal>

  <!-- Remove modal -->
  <UModal
    v-model:open="removeOpen"
    :title="t('pages.halaqat.students.removeTitle')"
    :ui="{ content: 'sm:max-w-md rounded-2xl' }"
  >
    <UButton class="sr-only" tabindex="-1" />
    <template #body>
      <div class="space-y-4">
        <UFormField :label="t('pages.halaqat.students.fieldOutcome')" required>
          <USelect
            v-model="removeForm.outcome"
            :items="outcomeItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('pages.halaqat.students.fieldNotes')">
          <UTextarea v-model="removeForm.notes" class="w-full" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton variant="soft" color="neutral" :disabled="removeSaving" @click="removeOpen = false">
          {{ t('pages.halaqat.cancel') }}
        </UButton>
        <UButton color="error" :loading="removeSaving" @click="submitRemove">
          {{ t('pages.halaqat.students.remove') }}
        </UButton>
      </div>
    </template>
  </UModal>

  <!-- Transfer modal -->
  <UModal
    v-model:open="transferOpen"
    :title="t('pages.halaqat.students.transferTitle')"
    :ui="{ content: 'sm:max-w-md rounded-2xl' }"
  >
    <UButton class="sr-only" tabindex="-1" />
    <template #body>
      <div class="space-y-4">
        <UFormField :label="t('pages.halaqat.students.fieldToHalaqa')" required>
          <USelect
            v-model="transferForm.to_halaqa_id"
            :items="transferTargetItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('pages.halaqat.students.fieldTransferDate')">
          <UInput v-model="transferForm.transfer_date" type="date" class="w-full" />
        </UFormField>
        <UFormField :label="t('pages.halaqat.students.fieldReason')" required>
          <UTextarea v-model="transferForm.reason" class="w-full" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton variant="soft" color="neutral" :disabled="transferSaving" @click="transferOpen = false">
          {{ t('pages.halaqat.cancel') }}
        </UButton>
        <UButton :loading="transferSaving" @click="submitTransfer">
          {{ t('pages.halaqat.students.transfer') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
