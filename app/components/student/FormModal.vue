<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import { CalendarDate, DateFormatter, getLocalTimeZone, parseDate, today } from '@internationalized/date'
import { normalizeDigits } from '~/composables/useValidation'
import type { ApiStudent } from '~/types'

const props = withDefaults(defineProps<{
  mode: 'add' | 'edit'
  student?: ApiStudent | null
  loading?: boolean
}>(), {
  student: null,
  loading: false
})
const emit = defineEmits<{ close: [boolean] }>()

const { createStudent, updateStudent } = useStudents()
const { halaqat, fetchHalaqat, isLoading: halaqatLoading } = useHalaqat()
const { email, phone, palestinianId } = useValidation()
const { user } = useAuth()

const isEditMode = computed(() => props.mode === 'edit')
const api = useApi()
const toast = useToast()
const { t, locale } = useI18n()

// Backend rejects bio edits from teachers (UpdateStudentByTeacherDto restricts
// to capacity + notes). Lock the inputs in edit mode so the UX matches.
const isTeacherOnly = computed(() => {
  const roles = user.value?.roles ?? []
  return roles.includes('teacher')
    && !roles.includes('principal')
    && !roles.includes('vice_principal')
})
const lockBio = computed(() => isTeacherOnly.value && isEditMode.value)

const df = computed(() => new DateFormatter(locale.value, { dateStyle: 'medium' }))

function formatDate(value: string) {
  if (!value) return ''
  try {
    return df.value.format(parseDate(value).toDate(getLocalTimeZone()))
  } catch {
    return ''
  }
}

function makeDateModel(field: 'dob' | 'joinDate') {
  return computed<CalendarDate | undefined>({
    get: () => (state[field] ? parseDate(state[field]) : undefined),
    set: (v) => { state[field] = v ? v.toString() : '' }
  })
}

const schema = computed(() => z.object({
  name: z.string({ error: () => t('validation.required') }).trim().min(1, t('validation.required')),
  gender: z.enum(['male', 'female'] as const),
  status: z.enum(['active', 'inactive', 'graduated'] as const),
  idNumber: palestinianId({ required: !isEditMode.value }),
  dob: z.string(),
  joinDate: z.string(),
  email: email(),
  phone: phone(),
  fatherName: z.string(),
  motherName: z.string(),
  fatherEmail: email(),
  motherEmail: email(),
  memPages: z.number().min(0),
  nearPages: z.number().min(0),
  farPages: z.number().min(0),
  notes: z.string(),
  halaqaIds: z.array(z.number())
}))

type StudentForm = z.infer<typeof schema.value>

function emptyState(): StudentForm {
  return {
    name: '',
    gender: 'male',
    status: 'active',
    idNumber: '',
    dob: '',
    joinDate: today(getLocalTimeZone()).toString(),
    email: '',
    phone: '',
    fatherName: '',
    motherName: '',
    fatherEmail: '',
    motherEmail: '',
    memPages: 0,
    nearPages: 0,
    farPages: 0,
    notes: '',
    halaqaIds: []
  }
}

const state = reactive<StudentForm>(emptyState())
const submitting = ref(false)

const dobDate = makeDateModel('dob')
const joinDate = makeDateModel('joinDate')

const halaqaItems = computed(() =>
  halaqat.value.map(h => ({ label: h.name, value: h.id }))
)

const genderItems = computed(() => [
  { label: t('pages.students.addModal.genderMale'), value: 'male' },
  { label: t('pages.students.addModal.genderFemale'), value: 'female' }
])

const statusItems = computed(() => [
  { label: t('pages.students.addModal.statusActive'), value: 'active' },
  { label: t('pages.students.addModal.statusInactive'), value: 'inactive' },
  { label: t('pages.students.addModal.statusGraduated'), value: 'graduated' }
])

const metrics = computed(() => [
  { key: 'memPages', icon: 'i-lucide-book-open', label: t('pages.students.addModal.memPages') },
  { key: 'nearPages', icon: 'i-lucide-history', label: t('pages.students.addModal.nearPages') },
  { key: 'farPages', icon: 'i-lucide-repeat', label: t('pages.students.addModal.farPages') }
] as const)

onMounted(() => {
  if (halaqat.value.length === 0) fetchHalaqat()
})

watch(() => props.student, (student) => {
  if (!student) return
  state.name = student.name
  state.gender = student.gender ?? 'male'
  state.status = student.status
  state.idNumber = student.id_number ?? ''
  state.dob = student.dob ? student.dob.slice(0, 10) : ''
  state.joinDate = student.join_date ? student.join_date.slice(0, 10) : today(getLocalTimeZone()).toString()
  state.email = student.email ?? ''
  state.phone = ''
  state.memPages = Number(student.daily_hifz_pages_capacity) || 0
  state.nearPages = Number(student.daily_near_pages_capacity) || 0
  state.farPages = Number(student.daily_far_pages_capacity) || 0
  state.notes = student.notes ?? ''
  state.halaqaIds = []
  state.fatherName = ''
  state.motherName = ''
  state.fatherEmail = ''
  state.motherEmail = ''
}, { immediate: true })

function resetState() {
  Object.assign(state, emptyState())
}

async function handleSubmit(_event: FormSubmitEvent<StudentForm>) {
  if (submitting.value) return
  submitting.value = true
  try {
    if (isEditMode.value && props.student) {
      // Teachers can only patch capacity + notes; backend rejects bio fields
      // with 400. Skip building the bio patch entirely when locked.
      const bioPatch: Record<string, any> = {}
      if (!lockBio.value) {
        const originalId = props.student.id_number ?? ''
        const currentId = normalizeDigits(state.idNumber)
        const idChanged = currentId !== originalId
        if (idChanged) {
          if (currentId) {
            bioPatch.id_number = currentId
            if (originalId) bioPatch.force_id_number_change = true
          } else {
            bioPatch.id_number = null
            bioPatch.force_id_number_change = true
          }
        }
        bioPatch.name = state.name.trim()
        bioPatch.gender = state.gender
        bioPatch.status = state.status
        bioPatch.dob = state.dob || null
        bioPatch.join_date = state.joinDate
        if (state.email.trim()) bioPatch.email = state.email.trim()
        else bioPatch.email = null
        if (state.phone.trim()) bioPatch.phone = state.phone.trim()
      }

      await updateStudent(props.student.id, {
        ...bioPatch,
        daily_hifz_pages_capacity: state.memPages,
        daily_near_pages_capacity: state.nearPages,
        daily_far_pages_capacity: state.farPages,
        notes: state.notes.trim() || null
      })
      toast.add({ title: t('pages.students.addModal.editSuccess'), color: 'success' })
      emit('close', false)
      return
    }

    const newStudent = await createStudent({
      name: state.name.trim(),
      gender: state.gender,
      id_number: normalizeDigits(state.idNumber),
      ...(state.dob ? { dob: state.dob } : {}),
      join_date: state.joinDate,
      ...(state.email.trim() ? { email: state.email.trim() } : {}),
      ...(state.phone.trim() ? { phone: state.phone.trim() } : {}),
      daily_hifz_pages_capacity: state.memPages,
      daily_near_pages_capacity: state.nearPages,
      daily_far_pages_capacity: state.farPages,
      guardians: [
        ...(state.fatherEmail.trim()
          ? [{
            email: state.fatherEmail.trim(),
            name: state.fatherName.trim() || undefined,
            relation: 'father',
            is_primary: true,
            can_pickup: true
          }]
          : []),
        ...(state.motherEmail.trim()
          ? [{
            email: state.motherEmail.trim(),
            name: state.motherName.trim() || undefined,
            relation: 'mother',
            is_primary: false,
            can_pickup: true
          }]
          : [])
      ],
      ...(state.notes.trim() ? { notes: state.notes.trim() } : {})
    })

    let enrollFailed = 0
    if (state.halaqaIds.length > 0 && newStudent.id) {
      const results = await Promise.allSettled(
        state.halaqaIds.map(halaqaId =>
          api('/enrollments', {
            method: 'POST',
            body: {
              student_id: newStudent.id,
              halaqa_id: halaqaId,
              enrollment_date: state.joinDate
            }
          })
        )
      )
      enrollFailed = results.filter(r => r.status === 'rejected').length
    }

    if (enrollFailed > 0) {
      toast.add({
        title: t('pages.students.addModal.addedTitle'),
        description: enrollFailed === state.halaqaIds.length
          ? t('pages.students.addModal.enrollAllFailed')
          : t('pages.students.addModal.enrollPartialFailed', { failed: enrollFailed, total: state.halaqaIds.length }),
        color: 'warning'
      })
    } else {
      const count = state.halaqaIds.length
      toast.add({
        title: t('pages.students.addModal.successTitle'),
        description: count > 0 ? (count === 1 ? t('pages.students.addModal.enrolledInOne') : t('pages.students.addModal.enrolledInMany', { count })) : undefined,
        color: 'success'
      })
    }

    emit('close', false)
  } catch (e: any) {
    const raw = e?.data?.message
    const fallback = isEditMode.value
      ? t('pages.students.addModal.editError')
      : t('pages.students.addModal.saveError')
    const message = Array.isArray(raw) ? raw.join('، ') : (raw || fallback)
    toast.add({ title: message, color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal :ui="{ content: 'sm:max-w-4xl overflow-hidden' }">
    <template #content>
      <div class="flex flex-col" style="max-height: 90vh;">
        <!-- Header (fixed) -->
        <div class="flex justify-between items-center px-8 py-6 shrink-0 border-b border-default">
          <h3 class="text-xl font-bold text-primary">
            {{ isEditMode ? $t('pages.students.addModal.editTitle') : $t('pages.students.addModal.title') }}
          </h3>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="lg"
            square
            :ui="{ base: 'rounded-full' }"
            @click="emit('close', false)" />
        </div>

        <!-- Loading state when fetching student for edit -->
        <div v-if="loading" class="flex-1 flex items-center justify-center py-24">
          <UIcon name="i-lucide-loader-circle" class="w-10 h-10 animate-spin text-primary" />
        </div>

        <!-- Scrollable form body -->
        <UForm
          v-else
          :state="state"
          :schema="schema"
          class="flex-1 overflow-y-auto px-8 py-8 space-y-10"
          @submit="handleSubmit">
          <UAlert
            v-if="lockBio"
            color="info"
            variant="soft"
            icon="i-lucide-info"
            :title="$t('pages.students.addModal.teacherEditHint')" />

          <!-- Section: Halaqa enrollment (multi-select, add mode only) -->
          <UFormField
            v-if="!isEditMode"
            :label="$t('pages.students.addModal.halaqaLabel')"
            name="halaqaIds"
            :hint="halaqatLoading ? $t('pages.students.addModal.halaqaLoading') : $t('pages.students.addModal.halaqaHint')">
            <USelectMenu
              v-model="state.halaqaIds"
              :items="halaqaItems"
              value-key="value"
              multiple
              :loading="halaqatLoading"
              :disabled="halaqatLoading"
              :placeholder="$t('pages.students.addModal.halaqaPlaceholder')"
              icon="i-lucide-layers"
              class="w-full" />
          </UFormField>

          <!-- Section: Photo upload + basic info -->
          <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
            <!-- Photo upload zone -->
            <div
              class="md:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-default bg-primary/5 cursor-pointer transition-all group hover:border-primary/50">
              <div class="w-24 h-24 rounded-full bg-default shadow-sm flex items-center justify-center mb-4 overflow-hidden">
                <UIcon
                  name="i-lucide-camera"
                  class="w-10 h-10 text-muted transition-colors group-hover:text-primary" />
              </div>
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                {{ $t('pages.students.addModal.photoTitle') }}
              </p>
              <p class="text-[10px] mt-1 text-dimmed">
                {{ $t('pages.students.addModal.photoHint') }}
              </p>
            </div>

            <!-- Basic info grid -->
            <div class="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField :label="$t('pages.students.addModal.fullName')" name="name" class="sm:col-span-2">
                <UInput
                  v-model="state.name"
                  :placeholder="$t('pages.students.addModal.fullNamePlaceholder')"
                  :disabled="lockBio"
                  class="w-full" />
              </UFormField>
              <UFormField :label="$t('pages.students.addModal.gender')" name="gender">
                <USelect
                  v-model="state.gender"
                  :items="genderItems"
                  :disabled="lockBio"
                  class="w-full" />
              </UFormField>
              <UFormField :label="$t('pages.students.addModal.idNumber')" name="idNumber">
                <UInput
                  v-model="state.idNumber"
                  :placeholder="$t('pages.students.addModal.idNumberPlaceholder')"
                  inputmode="numeric"
                  dir="ltr"
                  :disabled="lockBio"
                  class="w-full" />
              </UFormField>
              <UFormField :label="$t('pages.students.addModal.dob')" name="dob">
                <UPopover :disabled="lockBio">
                  <UButton
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-calendar"
                    :disabled="lockBio"
                    class="w-full justify-start font-normal">
                    {{ state.dob ? formatDate(state.dob) : $t('pages.students.addModal.pickDate') }}
                  </UButton>
                  <template #content>
                    <UCalendar v-model="dobDate" class="p-2" />
                  </template>
                </UPopover>
              </UFormField>
              <UFormField :label="$t('pages.students.addModal.joinDate')" name="joinDate">
                <UPopover :disabled="lockBio">
                  <UButton
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-calendar"
                    :disabled="lockBio"
                    class="w-full justify-start font-normal">
                    {{ state.joinDate ? formatDate(state.joinDate) : $t('pages.students.addModal.pickDate') }}
                  </UButton>
                  <template #content>
                    <UCalendar v-model="joinDate" class="p-2" />
                  </template>
                </UPopover>
              </UFormField>
              <UFormField :label="$t('pages.students.addModal.phone')" name="phone">
                <UInput v-model="state.phone" type="tel" dir="ltr" placeholder="+970599123456" :disabled="lockBio" class="w-full" />
              </UFormField>
              <UFormField :label="$t('pages.students.addModal.email')" name="email">
                <UInput v-model="state.email" type="email" dir="ltr" :disabled="lockBio" class="w-full" />
              </UFormField>
              <UFormField
                v-if="isEditMode"
                :label="$t('pages.students.addModal.status')"
                name="status"
                class="sm:col-span-2">
                <USelect v-model="state.status" :items="statusItems" :disabled="lockBio" class="w-full" />
              </UFormField>
            </div>
          </div>

          <!-- Section: Parent info (add mode only) -->
          <div v-if="!isEditMode" class="space-y-6">
            <div class="flex items-center gap-2 border-e-4 pe-3 border-primary">
              <h4 class="font-bold text-base text-primary">
                {{ $t('pages.students.addModal.guardiansTitle') }}
              </h4>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <!-- Father column -->
              <div class="space-y-4">
                <UFormField :label="$t('pages.students.addModal.fatherName')" name="fatherName">
                  <UInput v-model="state.fatherName" class="w-full" />
                </UFormField>
                <UFormField :label="$t('pages.students.addModal.fatherEmail')" name="fatherEmail">
                  <UInput v-model="state.fatherEmail" type="email" dir="ltr" class="w-full" />
                </UFormField>
              </div>
              <!-- Mother column -->
              <div class="space-y-4">
                <UFormField :label="$t('pages.students.addModal.motherName')" name="motherName">
                  <UInput v-model="state.motherName" class="w-full" />
                </UFormField>
                <UFormField :label="$t('pages.students.addModal.motherEmail')" name="motherEmail">
                  <UInput v-model="state.motherEmail" type="email" dir="ltr" class="w-full" />
                </UFormField>
              </div>
            </div>
          </div>

          <!-- Section: Academic metrics -->
          <div class="space-y-6">
            <div class="flex items-center gap-2 border-e-4 pe-3 border-secondary">
              <h4 class="font-bold text-base text-secondary">
                {{ $t('pages.students.addModal.metricsTitle') }}
              </h4>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <UCard
                v-for="metric in metrics"
                :key="metric.key"
                :ui="{ root: 'rounded-2xl', body: 'p-5' }">
                <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-3 text-muted">
                  <UIcon :name="metric.icon" class="w-4 h-4 shrink-0 text-secondary" />
                  {{ metric.label }}
                </label>
                <UInputNumber
                  v-model="state[metric.key as keyof StudentForm] as number"
                  :min="0"
                  placeholder="0"
                  size="xl"
                  class="w-full"
                  :ui="{ base: 'text-lg font-bold text-center text-primary' }" />
              </UCard>
            </div>
          </div>

          <!-- Section: Notes -->
          <div class="space-y-4 pb-4">
            <UFormField :label="$t('pages.students.addModal.notesLabel')" name="notes">
              <UTextarea
                v-model="state.notes"
                :rows="3"
                :placeholder="$t('pages.students.addModal.notesPlaceholder')"
                class="w-full"
                :ui="{ base: 'resize-none' }" />
            </UFormField>
          </div>

          <!-- Footer (inside UForm so submit button works) -->
          <div class="px-0 py-2 flex items-center justify-end gap-4 border-t border-default pt-6">
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              size="xl"
              class="font-bold rounded-full px-8"
              @click="emit('close', false)">
              {{ $t('pages.students.addModal.cancel') }}
            </UButton>
            <UButton
              type="submit"
              size="xl"
              :loading="submitting"
              :disabled="submitting"
              class="font-bold rounded-full px-10">
              {{ isEditMode ? $t('pages.students.addModal.editSubmit') : $t('pages.students.addModal.submit') }}
            </UButton>
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
