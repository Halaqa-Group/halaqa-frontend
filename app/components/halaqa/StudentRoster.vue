<script setup lang="ts">
import * as z from 'zod'
import { createReusableTemplate, useMediaQuery } from '@vueuse/core'
import type { FormSubmitEvent } from '@nuxt/ui'
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
const apiError = useApiError()
const { listStudents, enrollStudent, removeStudent, transferStudent } = useHalaqaStudents()
const api = useApi()
const { halaqat } = useGlobalHalaqa()

const enrollments = ref<ApiStudentEnrollment[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    enrollments.value = await listStudents(props.halaqaId)
  } finally {
    loading.value = false
  }
}

// ── Student picker ────────────────────────────────────────────────────────────
// The roster is school-wide, so the list is searched on the server (GET /students
// takes `q` and caps `limit` at 100) rather than pulled down whole. The select
// menu shows the first page until the user types, then narrows.
const STUDENT_PAGE_SIZE = 50

const studentOptions = ref<{ id: number, name: string }[]>([])
const studentSearch = ref('')
const studentsLoading = ref(false)
let studentSearchToken = 0

async function fetchStudents(q: string) {
  const token = ++studentSearchToken
  studentsLoading.value = true
  try {
    const params = new URLSearchParams({
      limit: String(STUDENT_PAGE_SIZE),
      status: 'active'
    })
    if (q) params.set('q', q)
    const data = await api<{ items: ApiStudent[] } | ApiStudent[]>(`/students?${params}`)
    // A slower earlier request must not overwrite a newer one's results.
    if (token !== studentSearchToken) return
    const items = Array.isArray(data) ? data : data.items
    studentOptions.value = items.map(s => ({ id: s.id, name: s.name }))
  } catch {
    if (token === studentSearchToken) studentOptions.value = []
  } finally {
    if (token === studentSearchToken) studentsLoading.value = false
  }
}

let studentSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(studentSearch, (q) => {
  if (studentSearchTimer) clearTimeout(studentSearchTimer)
  studentSearchTimer = setTimeout(() => fetchStudents(q.trim()), 300)
})
onBeforeUnmount(() => {
  if (studentSearchTimer) clearTimeout(studentSearchTimer)
})

onMounted(load)

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const enrollSchema = computed(() => z.object({
  student_id: z.number({ error: () => t('common.selectStudent') })
    .int()
    .positive(t('common.selectStudent')),
  enrollment_date: z.string({ error: () => t('validation.required') })
    .min(1, t('validation.required'))
}))

type EnrollSchema = z.output<typeof enrollSchema.value>

const enrollOpen = ref(false)

// Centered modal on desktop, bottom drawer on mobile — body + footer are shared
// between the two shells via reusable templates.
const isDesktop = useMediaQuery('(min-width: 640px)')
const [DefineBody, ReuseBody] = createReusableTemplate()
const [DefineFooter, ReuseFooter] = createReusableTemplate()
const enrollState = reactive<{
  student_id: number | null
  enrollment_date: string
}>({
  student_id: null,
  enrollment_date: toIsoDate(new Date())
})
const enrollSaving = ref(false)

async function openEnroll() {
  enrollState.student_id = null
  enrollState.enrollment_date = toIsoDate(new Date())
  enrollOpen.value = true
  studentSearch.value = ''
  await fetchStudents('')
}

// Selecting clears the search term, which re-runs the query — so the chosen
// student can fall out of the fresh page and the trigger would render blank.
// Pin them into the list to keep the selection displayable.
const pinnedStudent = ref<{ id: number, name: string } | null>(null)
watch(() => enrollState.student_id, (id) => {
  if (id == null) {
    pinnedStudent.value = null
    return
  }
  const found = studentOptions.value.find(s => s.id === id)
  if (found) pinnedStudent.value = found
})

const studentSelectItems = computed(() => {
  const opts = studentOptions.value
  const pinned = pinnedStudent.value
  const list = pinned && !opts.some(s => s.id === pinned.id) ? [pinned, ...opts] : opts
  return list.map(s => ({ label: s.name, value: s.id }))
})

async function submitEnroll(event: FormSubmitEvent<EnrollSchema>) {
  enrollSaving.value = true
  try {
    await enrollStudent(props.halaqaId, {
      student_id: event.data.student_id,
      enrollment_date: event.data.enrollment_date
    })
    toast.add({ title: t('pages.halaqat.students.toastEnrolled'), color: 'success' })
    enrollOpen.value = false
    await load()
    emit('changed')
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.halaqat.toastError')), color: 'error' })
  } finally {
    enrollSaving.value = false
  }
}

const removeSchema = computed(() => z.object({
  outcome: z.enum(['completed', 'unenrolled']),
  notes: z.string().optional()
}))

type RemoveSchema = z.output<typeof removeSchema.value>

const removeOpen = ref(false)
const removeTarget = ref<ApiStudentEnrollment | null>(null)
const removeState = reactive<{
  outcome: 'completed' | 'unenrolled'
  notes: string
}>({
  outcome: 'completed',
  notes: ''
})
const removeSaving = ref(false)

const outcomeItems = computed(() => [
  { label: t('pages.halaqat.students.outcome.completed'), value: 'completed' },
  { label: t('pages.halaqat.students.outcome.unenrolled'), value: 'unenrolled' }
])

function openRemove(e: ApiStudentEnrollment) {
  removeTarget.value = e
  removeState.outcome = 'completed'
  removeState.notes = ''
  removeOpen.value = true
}

async function submitRemove(event: FormSubmitEvent<RemoveSchema>) {
  if (!removeTarget.value) return
  removeSaving.value = true
  try {
    await removeStudent(props.halaqaId, removeTarget.value.student_id, {
      outcome: event.data.outcome,
      notes: event.data.notes || undefined
    })
    toast.add({ title: t('pages.halaqat.students.toastRemoved'), color: 'success' })
    removeOpen.value = false
    removeTarget.value = null
    await load()
    emit('changed')
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.halaqat.toastError')), color: 'error' })
  } finally {
    removeSaving.value = false
  }
}

const transferSchema = computed(() => z.object({
  to_halaqa_id: z.number({ error: () => t('pages.halaqat.validationToHalaqa') })
    .int()
    .positive(t('pages.halaqat.validationToHalaqa')),
  reason: z.string({ error: () => t('pages.halaqat.validationReason') })
    .trim()
    .min(1, t('pages.halaqat.validationReason')),
  transfer_date: z.string({ error: () => t('validation.required') })
    .min(1, t('validation.required'))
}))

type TransferSchema = z.output<typeof transferSchema.value>

const transferOpen = ref(false)
const transferTarget = ref<ApiStudentEnrollment | null>(null)
const transferState = reactive<{
  to_halaqa_id: number | null
  reason: string
  transfer_date: string
}>({
  to_halaqa_id: null,
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
  transferState.to_halaqa_id = null
  transferState.reason = ''
  transferState.transfer_date = toIsoDate(new Date())
  transferOpen.value = true
}

async function submitTransfer(event: FormSubmitEvent<TransferSchema>) {
  if (!transferTarget.value) return
  transferSaving.value = true
  try {
    await transferStudent({
      student_id: transferTarget.value.student_id,
      from_halaqa_id: props.halaqaId,
      to_halaqa_id: event.data.to_halaqa_id,
      reason: event.data.reason,
      transfer_date: event.data.transfer_date
    })
    toast.add({ title: t('pages.halaqat.students.toastTransferred'), color: 'success' })
    transferOpen.value = false
    transferTarget.value = null
    await load()
    emit('changed')
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.halaqat.toastError')), color: 'error' })
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
          <p class="font-medium">
            {{ e.student_name }}
          </p>
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

  <DefineBody>
      <UForm
        id="student-enroll-form"
        :schema="enrollSchema"
        :state="enrollState"
        class="space-y-4"
        @submit="submitEnroll"
      >
        <UFormField :label="t('pages.halaqat.students.fieldStudent')" name="student_id" required>
          <USelectMenu
            v-model="enrollState.student_id"
            v-model:search-term="studentSearch"
            :items="studentSelectItems"
            value-key="value"
            :placeholder="t('common.selectStudent')"
            :loading="studentsLoading"
            icon="i-lucide-user"
            ignore-filter
            :reset-search-term-on-blur="false"
            class="w-full"
          >
            <template #empty>
              {{ studentsLoading ? t('common.loading') : t('pages.halaqat.students.noStudentMatch') }}
            </template>
          </USelectMenu>
        </UFormField>
        <UFormField :label="t('pages.halaqat.students.fieldEnrollmentDate')" name="enrollment_date">
          <UInput v-model="enrollState.enrollment_date" type="date" class="w-full" />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton variant="soft" color="neutral" :disabled="enrollSaving" @click="enrollOpen = false">
          {{ t('pages.halaqat.cancel') }}
        </UButton>
        <UButton type="submit" form="student-enroll-form" :loading="enrollSaving">
          {{ t('pages.halaqat.save') }}
        </UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="removeOpen"
    :title="t('pages.halaqat.students.removeTitle')"
    :ui="{ content: 'sm:max-w-md rounded-2xl' }"
  >
    <UButton class="sr-only" tabindex="-1" />
    <template #body>
      <UForm
        id="student-remove-form"
        :schema="removeSchema"
        :state="removeState"
        class="space-y-4"
        @submit="submitRemove"
      >
        <UFormField :label="t('pages.halaqat.students.fieldOutcome')" name="outcome" required>
          <USelect
            v-model="removeState.outcome"
            :items="outcomeItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('pages.halaqat.students.fieldNotes')" name="notes">
          <UTextarea v-model="removeState.notes" class="w-full" />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton variant="soft" color="neutral" :disabled="removeSaving" @click="removeOpen = false">
          {{ t('pages.halaqat.cancel') }}
        </UButton>
        <UButton type="submit" form="student-remove-form" color="error" :loading="removeSaving">
          {{ t('pages.halaqat.students.remove') }}
        </UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="transferOpen"
    :title="t('pages.halaqat.students.transferTitle')"
    :ui="{ content: 'sm:max-w-md rounded-2xl' }"
  >
    <UButton class="sr-only" tabindex="-1" />
    <template #body>
      <UForm
        id="student-transfer-form"
        :schema="transferSchema"
        :state="transferState"
        class="space-y-4"
        @submit="submitTransfer"
      >
        <UFormField :label="t('pages.halaqat.students.fieldToHalaqa')" name="to_halaqa_id" required>
          <USelect
            v-model="transferState.to_halaqa_id"
            :items="transferTargetItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('pages.halaqat.students.fieldTransferDate')" name="transfer_date">
          <UInput v-model="transferState.transfer_date" type="date" class="w-full" />
        </UFormField>
        <UFormField :label="t('pages.halaqat.students.fieldReason')" name="reason" required>
          <UTextarea v-model="transferState.reason" class="w-full" />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton variant="soft" color="neutral" :disabled="transferSaving" @click="transferOpen = false">
          {{ t('pages.halaqat.cancel') }}
        </UButton>
        <UButton type="submit" form="student-transfer-form" :loading="transferSaving">
          {{ t('pages.halaqat.students.transfer') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
