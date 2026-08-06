<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type {
  ApiTeacherAssignment,
  ApiTeacherOption,
  EndReason,
  TeacherRole
} from '~/types'
import { TEACHER_ROLE_COLOR } from '~/utils/halaqa'

const props = defineProps<{
  halaqaId: number
  teachers: ApiTeacherAssignment[]
  canManage: boolean
}>()

const emit = defineEmits<{
  changed: []
}>()

const { t, locale } = useI18n()
const toast = useToast()
const apiError = useApiError()

const dateFormatter = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', numberingSystem: 'latn' })
)

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : dateFormatter.value.format(d)
}

const {
  assignTeacher,
  updateAssignment,
  endAssignment,
  setActing
} = useHalaqaTeachers()
const { fetchTeachers } = useHalaqat()

const teacherOptions = ref<ApiTeacherOption[]>([])
const teachersLoading = ref(false)
const teachersError = ref<string | null>(null)

async function loadTeacherOptions() {
  teachersLoading.value = true
  teachersError.value = null
  try {
    teacherOptions.value = await fetchTeachers()
  } catch (e: unknown) {
    teachersError.value = apiError.format(e, t('pages.halaqat.toastError'))
    teacherOptions.value = []
  } finally {
    teachersLoading.value = false
  }
}

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const assignSchema = computed(() => z.object({
  teacher_user_id: z.number({ error: () => t('pages.halaqat.validationTeacher') })
    .int()
    .positive(t('pages.halaqat.validationTeacher')),
  role: z.enum(['main', 'assistant']),
  start_date: z.string({ error: () => t('validation.required') })
    .min(1, t('validation.required')),
  notes: z.string().optional()
}))

type AssignSchema = z.output<typeof assignSchema.value>

const assignOpen = ref(false)
const assignState = reactive<{
  teacher_user_id: number | null
  role: 'main' | 'assistant'
  start_date: string
  notes: string
}>({
  teacher_user_id: null,
  role: 'main',
  start_date: toIsoDate(new Date()),
  notes: ''
})
const assignSaving = ref(false)

const teacherSelectItems = computed(() => [
  { label: t('pages.halaqat.fieldTeacherPlaceholder'), value: null },
  ...teacherOptions.value.map(o => ({ label: o.name, value: o.id }))
])

const roleSelectItems = computed(() => [
  { label: t('pages.halaqat.teachers.role.main'), value: 'main' },
  { label: t('pages.halaqat.teachers.role.assistant'), value: 'assistant' }
])

async function openAssign() {
  assignState.teacher_user_id = null
  assignState.role = 'main'
  assignState.start_date = toIsoDate(new Date())
  assignState.notes = ''
  assignOpen.value = true
  await loadTeacherOptions()
}

async function submitAssign(event: FormSubmitEvent<AssignSchema>) {
  assignSaving.value = true
  try {
    await assignTeacher(props.halaqaId, {
      teacher_user_id: event.data.teacher_user_id,
      role: event.data.role,
      start_date: event.data.start_date,
      notes: event.data.notes || undefined
    })
    toast.add({ title: t('pages.halaqat.teachers.toastAssigned'), color: 'success' })
    assignOpen.value = false
    emit('changed')
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.halaqat.toastError')), color: 'error' })
  } finally {
    assignSaving.value = false
  }
}

const END_REASONS: EndReason[] = ['reassigned', 'left_school', 'vacation', 'retired', 'other']

const endSchema = computed(() => z.object({
  end_date: z.string({ error: () => t('validation.required') })
    .min(1, t('validation.required')),
  end_reason: z.enum(END_REASONS as unknown as [EndReason, ...EndReason[]]),
  notes: z.string().optional()
}))

type EndSchema = z.output<typeof endSchema.value>

const endOpen = ref(false)
const endTarget = ref<ApiTeacherAssignment | null>(null)
const endState = reactive<{
  end_date: string
  end_reason: EndReason
  notes: string
}>({
  end_date: toIsoDate(new Date()),
  end_reason: 'other',
  notes: ''
})
const endSaving = ref(false)

const endReasonItems = computed(() =>
  END_REASONS.map(value => ({
    label: t(`pages.halaqat.teachers.endReason.${value}`),
    value
  }))
)

function openEnd(assignment: ApiTeacherAssignment) {
  endTarget.value = assignment
  endState.end_date = toIsoDate(new Date())
  endState.end_reason = 'other'
  endState.notes = ''
  endOpen.value = true
}

async function submitEnd(event: FormSubmitEvent<EndSchema>) {
  if (!endTarget.value) return
  endSaving.value = true
  try {
    await endAssignment(props.halaqaId, endTarget.value.id, {
      end_date: event.data.end_date,
      end_reason: event.data.end_reason,
      notes: event.data.notes || undefined
    })
    toast.add({ title: t('pages.halaqat.teachers.toastEnded'), color: 'success' })
    endOpen.value = false
    endTarget.value = null
    emit('changed')
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.halaqat.toastError')), color: 'error' })
  } finally {
    endSaving.value = false
  }
}

const actingSchema = computed(() => z.object({
  acting_starts_at: z.string({ error: () => t('validation.required') })
    .min(1, t('validation.required')),
  acting_ends_at: z.string({ error: () => t('validation.required') })
    .min(1, t('validation.required')),
  notes: z.string().optional()
}).refine(d => d.acting_ends_at >= d.acting_starts_at, {
  message: t('pages.halaqat.validationActingRange'),
  path: ['acting_ends_at']
}))

type ActingSchema = z.output<typeof actingSchema.value>

const actingOpen = ref(false)
const actingTarget = ref<ApiTeacherAssignment | null>(null)
const actingState = reactive<{
  acting_starts_at: string
  acting_ends_at: string
  notes: string
}>({
  acting_starts_at: toIsoDate(new Date()),
  acting_ends_at: '',
  notes: ''
})
const actingSaving = ref(false)

function openSetActing(assignment: ApiTeacherAssignment) {
  actingTarget.value = assignment
  actingState.acting_starts_at = toIsoDate(new Date())
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 7)
  actingState.acting_ends_at = toIsoDate(endDate)
  actingState.notes = ''
  actingOpen.value = true
}

async function submitActing(event: FormSubmitEvent<ActingSchema>) {
  if (!actingTarget.value) return
  actingSaving.value = true
  try {
    await setActing(props.halaqaId, actingTarget.value.id, {
      acting_starts_at: event.data.acting_starts_at,
      acting_ends_at: event.data.acting_ends_at,
      notes: event.data.notes || undefined
    })
    toast.add({ title: t('pages.halaqat.teachers.toastActingSet'), color: 'success' })
    actingOpen.value = false
    actingTarget.value = null
    emit('changed')
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.halaqat.toastError')), color: 'error' })
  } finally {
    actingSaving.value = false
  }
}

async function changeRole(assignment: ApiTeacherAssignment, role: 'main' | 'assistant') {
  try {
    await updateAssignment(props.halaqaId, assignment.id, { role })
    toast.add({ title: t('pages.halaqat.teachers.toastUpdated'), color: 'success' })
    emit('changed')
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.halaqat.toastError')), color: 'error' })
  }
}

function rowActions(assignment: ApiTeacherAssignment) {
  if (!props.canManage) return [[]]
  const items: Array<{ label: string, icon: string, color?: 'error', onSelect: () => void }> = []
  if (assignment.role === 'main') {
    items.push({
      label: t('pages.halaqat.teachers.role.assistant'),
      icon: 'i-lucide-shuffle',
      onSelect: () => changeRole(assignment, 'assistant')
    })
  } else if (assignment.role === 'assistant') {
    items.push({
      label: t('pages.halaqat.teachers.role.main'),
      icon: 'i-lucide-shuffle',
      onSelect: () => changeRole(assignment, 'main')
    })
  }
  if (!assignment.acting_as_primary && assignment.role !== 'substitute') {
    items.push({
      label: t('pages.halaqat.teachers.setActing'),
      icon: 'i-lucide-user-cog',
      onSelect: () => openSetActing(assignment)
    })
  }
  items.push({
    label: t('pages.halaqat.teachers.endAssignment'),
    icon: 'i-lucide-log-out',
    color: 'error',
    onSelect: () => openEnd(assignment)
  })
  return [items]
}

function roleColor(role: TeacherRole) {
  return TEACHER_ROLE_COLOR[role]
}
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">
          {{ t('pages.halaqat.teachers.title') }}
        </h3>
        <UButton
          v-if="canManage"
          icon="i-lucide-plus"
          size="sm"
          @click="openAssign"
        >
          {{ t('pages.halaqat.teachers.addTitle') }}
        </UButton>
      </div>
    </template>

    <div v-if="!teachers.length" class="p-6 text-sm text-muted text-center">
      {{ t('pages.halaqat.teachers.noActive') }}
    </div>
    <ul v-else class="divide-y divide-default">
      <li
        v-for="a in teachers"
        :key="a.id"
        class="flex items-center justify-between gap-3 p-4"
      >
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ a.teacher_name }}</span>
            <UBadge variant="subtle" :color="roleColor(a.role)" size="sm">
              {{ t(`pages.halaqat.teachers.role.${a.role}`) }}
            </UBadge>
            <UBadge v-if="a.acting_as_primary" variant="subtle" color="warning" size="sm">
              {{ t('pages.halaqat.actingBadge') }}
            </UBadge>
          </div>
          <p class="text-xs text-muted">
            {{ t('pages.halaqat.teachers.startDate') }}: {{ formatDate(a.start_date) }}
            <span v-if="a.acting_as_primary && a.acting_ends_at" class="ms-2">
              · {{ t('pages.halaqat.acting.actingTo') }}: {{ formatDate(a.acting_ends_at) }}
            </span>
          </p>
        </div>
        <UDropdownMenu v-if="canManage" :items="rowActions(a)">
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

  <UModal
    v-model:open="assignOpen"
    :title="t('pages.halaqat.teachers.addTitle')"
    :ui="{ content: 'sm:max-w-md rounded-2xl' }"
  >
    <UButton class="sr-only" tabindex="-1" />
    <template #body>
      <UForm
        id="teacher-assign-form"
        :schema="assignSchema"
        :state="assignState"
        class="space-y-4"
        @submit="submitAssign"
      >
        <UFormField
          :label="t('pages.halaqat.teachers.fieldTeacher')"
          name="teacher_user_id"
          required
          :error="teachersError ?? undefined"
        >
          <USelect
            v-model="assignState.teacher_user_id"
            :items="teacherSelectItems"
            value-key="value"
            :loading="teachersLoading"
            :disabled="teachersLoading"
            class="w-full"
          />
          <template v-if="teachersError" #help>
            <UButton
              size="xs"
              variant="link"
              color="primary"
              class="px-0"
              @click="loadTeacherOptions"
            >
              {{ t('common.tryAgain') }}
            </UButton>
          </template>
        </UFormField>
        <UFormField :label="t('pages.halaqat.teachers.fieldRole')" name="role" required>
          <USelect
            v-model="assignState.role"
            :items="roleSelectItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('pages.halaqat.teachers.fieldStartDate')" name="start_date" required>
          <UInput v-model="assignState.start_date" type="date" class="w-full" />
        </UFormField>
        <UFormField :label="t('pages.halaqat.teachers.fieldNotes')" name="notes">
          <UTextarea v-model="assignState.notes" class="w-full" />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton variant="soft" color="neutral" :disabled="assignSaving" @click="assignOpen = false">
          {{ t('pages.halaqat.cancel') }}
        </UButton>
        <UButton type="submit" form="teacher-assign-form" :loading="assignSaving">
          {{ t('pages.halaqat.save') }}
        </UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="endOpen"
    :title="t('pages.halaqat.teachers.endTitle')"
    :ui="{ content: 'sm:max-w-md rounded-2xl' }"
  >
    <UButton class="sr-only" tabindex="-1" />
    <template #body>
      <UForm
        id="teacher-end-form"
        :schema="endSchema"
        :state="endState"
        class="space-y-4"
        @submit="submitEnd"
      >
        <UFormField :label="t('pages.halaqat.teachers.fieldEndDate')" name="end_date" required>
          <UInput v-model="endState.end_date" type="date" class="w-full" />
        </UFormField>
        <UFormField :label="t('pages.halaqat.teachers.fieldEndReason')" name="end_reason" required>
          <USelect
            v-model="endState.end_reason"
            :items="endReasonItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('pages.halaqat.teachers.fieldNotes')" name="notes">
          <UTextarea v-model="endState.notes" class="w-full" />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton variant="soft" color="neutral" :disabled="endSaving" @click="endOpen = false">
          {{ t('pages.halaqat.cancel') }}
        </UButton>
        <UButton type="submit" form="teacher-end-form" color="error" :loading="endSaving">
          {{ t('pages.halaqat.teachers.endAssignment') }}
        </UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="actingOpen"
    :title="t('pages.halaqat.teachers.setActing')"
    :ui="{ content: 'sm:max-w-md rounded-2xl' }"
  >
    <UButton class="sr-only" tabindex="-1" />
    <template #body>
      <UForm
        id="teacher-acting-form"
        :schema="actingSchema"
        :state="actingState"
        class="space-y-4"
        @submit="submitActing"
      >
        <UFormField :label="t('pages.halaqat.acting.fieldStartsAt')" name="acting_starts_at" required>
          <UInput v-model="actingState.acting_starts_at" type="date" class="w-full" />
        </UFormField>
        <UFormField :label="t('pages.halaqat.acting.fieldEndsAt')" name="acting_ends_at" required>
          <UInput v-model="actingState.acting_ends_at" type="date" class="w-full" />
        </UFormField>
        <UFormField :label="t('pages.halaqat.teachers.fieldNotes')" name="notes">
          <UTextarea v-model="actingState.notes" class="w-full" />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton variant="soft" color="neutral" :disabled="actingSaving" @click="actingOpen = false">
          {{ t('pages.halaqat.cancel') }}
        </UButton>
        <UButton type="submit" form="teacher-acting-form" :loading="actingSaving">
          {{ t('pages.halaqat.save') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
