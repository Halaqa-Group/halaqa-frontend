<script setup lang="ts">
import type {
  ApiTeacherAssignment,
  ApiTeacherOption,
  EndReason,
  TeacherRole
} from '~/types'
import { TEACHER_ROLE_COLOR } from '~/utils/halaqa'

const props = defineProps<{
  halaqaId: number
  canManage: boolean
}>()

const emit = defineEmits<{
  changed: []
}>()

const { t } = useI18n()
const toast = useToast()
const {
  listTeachers,
  assignTeacher,
  updateAssignment,
  endAssignment,
  setActing
} = useHalaqaTeachers()
const { fetchTeachers } = useHalaqat()

const teachers = ref<ApiTeacherAssignment[]>([])
const teacherOptions = ref<ApiTeacherOption[]>([])
const loading = ref(false)
const teachersLoading = ref(false)
const teachersError = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    teachers.value = await listTeachers(props.halaqaId)
  } finally {
    loading.value = false
  }
}

// Lazy-load real teachers from the backend each time the assign modal opens —
// keeps the dropdown current after teacher CRUD on the users page.
async function loadTeacherOptions() {
  teachersLoading.value = true
  teachersError.value = null
  try {
    teacherOptions.value = await fetchTeachers()
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message
    teachersError.value = typeof msg === 'string' ? msg : t('pages.halaqat.toastError')
    teacherOptions.value = []
  } finally {
    teachersLoading.value = false
  }
}

onMounted(load)

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Assign modal ──────────────────────────────────────────────────────────
const assignOpen = ref(false)
const assignForm = reactive({
  teacher_user_id: null as number | null,
  role: 'main' as 'main' | 'assistant',
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
  assignForm.teacher_user_id = null
  assignForm.role = 'main'
  assignForm.start_date = toIsoDate(new Date())
  assignForm.notes = ''
  assignOpen.value = true
  await loadTeacherOptions()
}

async function submitAssign() {
  if (!assignForm.teacher_user_id) {
    toast.add({ title: t('pages.halaqat.validationTeacher'), color: 'error' })
    return
  }
  assignSaving.value = true
  try {
    await assignTeacher(props.halaqaId, {
      teacher_user_id: assignForm.teacher_user_id,
      role: assignForm.role,
      start_date: assignForm.start_date,
      notes: assignForm.notes || undefined
    })
    toast.add({ title: t('pages.halaqat.teachers.toastAssigned'), color: 'success' })
    assignOpen.value = false
    await load()
    emit('changed')
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message
    toast.add({ title: typeof msg === 'string' ? msg : t('pages.halaqat.toastError'), color: 'error' })
  } finally {
    assignSaving.value = false
  }
}

// ── End assignment modal ──────────────────────────────────────────────────
const endOpen = ref(false)
const endTarget = ref<ApiTeacherAssignment | null>(null)
const endForm = reactive({
  end_date: toIsoDate(new Date()),
  end_reason: 'other' as EndReason,
  notes: ''
})
const endSaving = ref(false)

const END_REASONS: EndReason[] = ['reassigned', 'left_school', 'vacation', 'retired', 'other']
const endReasonItems = computed(() =>
  END_REASONS.map(value => ({
    label: t(`pages.halaqat.teachers.endReason.${value}`),
    value
  }))
)

function openEnd(assignment: ApiTeacherAssignment) {
  endTarget.value = assignment
  endForm.end_date = toIsoDate(new Date())
  endForm.end_reason = 'other'
  endForm.notes = ''
  endOpen.value = true
}

async function submitEnd() {
  if (!endTarget.value) return
  endSaving.value = true
  try {
    await endAssignment(props.halaqaId, endTarget.value.id, {
      end_date: endForm.end_date,
      end_reason: endForm.end_reason,
      notes: endForm.notes || undefined
    })
    toast.add({ title: t('pages.halaqat.teachers.toastEnded'), color: 'success' })
    endOpen.value = false
    endTarget.value = null
    await load()
    emit('changed')
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message
    toast.add({ title: typeof msg === 'string' ? msg : t('pages.halaqat.toastError'), color: 'error' })
  } finally {
    endSaving.value = false
  }
}

// ── Set acting modal (Workflow A) ─────────────────────────────────────────
const actingOpen = ref(false)
const actingTarget = ref<ApiTeacherAssignment | null>(null)
const actingForm = reactive({
  acting_starts_at: toIsoDate(new Date()),
  acting_ends_at: '',
  notes: ''
})
const actingSaving = ref(false)

function openSetActing(assignment: ApiTeacherAssignment) {
  actingTarget.value = assignment
  actingForm.acting_starts_at = toIsoDate(new Date())
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 7)
  actingForm.acting_ends_at = toIsoDate(endDate)
  actingForm.notes = ''
  actingOpen.value = true
}

async function submitActing() {
  if (!actingTarget.value) return
  actingSaving.value = true
  try {
    await setActing(props.halaqaId, actingTarget.value.id, {
      acting_starts_at: actingForm.acting_starts_at,
      acting_ends_at: actingForm.acting_ends_at,
      notes: actingForm.notes || undefined
    })
    toast.add({ title: t('pages.halaqat.teachers.toastActingSet'), color: 'success' })
    actingOpen.value = false
    actingTarget.value = null
    await load()
    emit('changed')
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message
    toast.add({ title: typeof msg === 'string' ? msg : t('pages.halaqat.toastError'), color: 'error' })
  } finally {
    actingSaving.value = false
  }
}

// ── Update role ───────────────────────────────────────────────────────────
async function changeRole(assignment: ApiTeacherAssignment, role: 'main' | 'assistant') {
  try {
    await updateAssignment(props.halaqaId, assignment.id, { role })
    toast.add({ title: t('pages.halaqat.teachers.toastUpdated'), color: 'success' })
    await load()
    emit('changed')
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message
    toast.add({ title: typeof msg === 'string' ? msg : t('pages.halaqat.toastError'), color: 'error' })
  }
}

defineExpose({ load })

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

    <div v-if="loading" class="p-6 text-sm text-muted">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="!teachers.length" class="p-6 text-sm text-muted text-center">
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
            {{ t('pages.halaqat.teachers.startDate') }}: {{ a.start_date }}
            <span v-if="a.acting_as_primary && a.acting_ends_at" class="ms-2">
              · {{ t('pages.halaqat.acting.actingTo') }}: {{ a.acting_ends_at }}
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

  <!-- Assign modal -->
  <UModal
    v-model:open="assignOpen"
    :title="t('pages.halaqat.teachers.addTitle')"
    :ui="{ content: 'sm:max-w-md rounded-2xl' }"
  >
    <UButton class="sr-only" tabindex="-1" />
    <template #body>
      <div class="space-y-4">
        <UFormField
          :label="t('pages.halaqat.teachers.fieldTeacher')"
          required
          :error="teachersError ?? undefined"
        >
          <USelect
            v-model="assignForm.teacher_user_id"
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
        <UFormField :label="t('pages.halaqat.teachers.fieldRole')" required>
          <USelect
            v-model="assignForm.role"
            :items="roleSelectItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('pages.halaqat.teachers.fieldStartDate')" required>
          <UInput v-model="assignForm.start_date" type="date" class="w-full" />
        </UFormField>
        <UFormField :label="t('pages.halaqat.teachers.fieldNotes')">
          <UTextarea v-model="assignForm.notes" class="w-full" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton variant="soft" color="neutral" :disabled="assignSaving" @click="assignOpen = false">
          {{ t('pages.halaqat.cancel') }}
        </UButton>
        <UButton :loading="assignSaving" @click="submitAssign">
          {{ t('pages.halaqat.save') }}
        </UButton>
      </div>
    </template>
  </UModal>

  <!-- End assignment modal -->
  <UModal
    v-model:open="endOpen"
    :title="t('pages.halaqat.teachers.endTitle')"
    :ui="{ content: 'sm:max-w-md rounded-2xl' }"
  >
    <UButton class="sr-only" tabindex="-1" />
    <template #body>
      <div class="space-y-4">
        <UFormField :label="t('pages.halaqat.teachers.fieldEndDate')" required>
          <UInput v-model="endForm.end_date" type="date" class="w-full" />
        </UFormField>
        <UFormField :label="t('pages.halaqat.teachers.fieldEndReason')" required>
          <USelect
            v-model="endForm.end_reason"
            :items="endReasonItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('pages.halaqat.teachers.fieldNotes')">
          <UTextarea v-model="endForm.notes" class="w-full" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton variant="soft" color="neutral" :disabled="endSaving" @click="endOpen = false">
          {{ t('pages.halaqat.cancel') }}
        </UButton>
        <UButton color="error" :loading="endSaving" @click="submitEnd">
          {{ t('pages.halaqat.teachers.endAssignment') }}
        </UButton>
      </div>
    </template>
  </UModal>

  <!-- Set acting modal (Workflow A) -->
  <UModal
    v-model:open="actingOpen"
    :title="t('pages.halaqat.teachers.setActing')"
    :ui="{ content: 'sm:max-w-md rounded-2xl' }"
  >
    <UButton class="sr-only" tabindex="-1" />
    <template #body>
      <div class="space-y-4">
        <UFormField :label="t('pages.halaqat.acting.fieldStartsAt')" required>
          <UInput v-model="actingForm.acting_starts_at" type="date" class="w-full" />
        </UFormField>
        <UFormField :label="t('pages.halaqat.acting.fieldEndsAt')" required>
          <UInput v-model="actingForm.acting_ends_at" type="date" class="w-full" />
        </UFormField>
        <UFormField :label="t('pages.halaqat.teachers.fieldNotes')">
          <UTextarea v-model="actingForm.notes" class="w-full" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton variant="soft" color="neutral" :disabled="actingSaving" @click="actingOpen = false">
          {{ t('pages.halaqat.cancel') }}
        </UButton>
        <UButton :loading="actingSaving" @click="submitActing">
          {{ t('pages.halaqat.save') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
