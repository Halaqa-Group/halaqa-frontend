<script setup lang="ts">
import * as z from 'zod'
import { createReusableTemplate, useMediaQuery } from '@vueuse/core'
import type { FormSubmitEvent } from '#ui/types'
import type { CalendarDate } from '@internationalized/date'
import { DateFormatter, getLocalTimeZone, parseDate, today } from '@internationalized/date'
import { normalizeDigits } from '~/composables/useValidation'
import { NAME_PART_MAX_LENGTH, CAPACITY_UNITS, DEFAULT_CAPACITY_UNIT, type StudentCapacityUnit } from '~/data/constants'
import { UNIT_TOTALS } from '~/utils/quran-structure'
import { COUNTRY_DIAL_CODES, DEFAULT_DIAL_CODE, dialCodeFlag } from '~/data/country-dial-codes'
import type { ApiStudent, MemorizationDirection } from '~/types'

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

// Centered modal on desktop, bottom drawer on mobile — the body + footer are
// shared between the two shells via reusable templates.
const isDesktop = useMediaQuery('(min-width: 640px)')
const [DefineBody, ReuseBody] = createReusableTemplate()
const [DefineFooter, ReuseFooter] = createReusableTemplate()
const { halaqat, fetchHalaqat, isLoading: halaqatLoading } = useHalaqat()
const { palestinianId } = useValidation()
const { lockStudentBio } = usePermissions()
const { unitItems } = useCapacityUnits()

const isEditMode = computed(() => props.mode === 'edit')
const api = useApi()
const toast = useToast()
const apiError = useApiError()
const { t, locale } = useI18n()

// National number only — the dial code lives in its own field, and the API caps
// the two together at E.164's 15 digits.
const PHONE_DIGITS_PATTERN = /^\d{4,15}$/

/** ASCII digits, no separators, no national trunk zero — what the API stores. */
function normalizePhone(input: string) {
  return normalizeDigits(input).replace(/^0+/, '')
}

// A teacher's PATCH body is limited to capacities + notes; sending bio fields
// as a teacher is a 400, so lock them rather than let the form submit them.
const lockBio = computed(() => lockStudentBio.value && isEditMode.value)

const df = computed(() => new DateFormatter(locale.value, { dateStyle: 'medium' }))

function formatDate(value: string) {
  if (!value) return ''
  try {
    return df.value.format(parseDate(value).toDate(getLocalTimeZone()))
  } catch {
    return ''
  }
}

const GUARDIAN_RELATIONS = ['father', 'mother', 'grandfather', 'grandmother', 'uncle', 'aunt', 'sibling', 'other'] as const
type GuardianRelation = typeof GUARDIAN_RELATIONS[number]

interface GuardianRow {
  mode: 'email' | 'userId'
  email: string
  userId: number | null
  relation: GuardianRelation
  isPrimary: boolean
  canPickup: boolean
}

// The four parts are each required and capped at 50 chars server-side; `name` is
// derived there and rejected if sent.
const NAME_PART_FIELDS = [
  { key: 'firstName', apiKey: 'first_name', labelKey: 'label.first_name' },
  { key: 'secondName', apiKey: 'second_name', labelKey: 'label.second_name' },
  { key: 'thirdName', apiKey: 'third_name', labelKey: 'label.third_name' },
  { key: 'familyName', apiKey: 'family_name', labelKey: 'label.family_name' }
] as const

const schema = computed(() => {
  const namePart = z.string({ error: () => t('validation.required') })
    .trim()
    .min(1, t('validation.required'))
    .max(NAME_PART_MAX_LENGTH, t('validation.max', { max: NAME_PART_MAX_LENGTH }))
  return z.object({
    firstName: namePart,
    secondName: namePart,
    thirdName: namePart,
    familyName: namePart,
    gender: z.enum(['male', 'female'] as const),
    status: z.enum(['active', 'inactive', 'graduated'] as const),
    idNumber: palestinianId({ required: !isEditMode.value }),
    // Optional, but once a number is typed it must be a plausible national
    // number — the API rejects anything outside 4..15 digits.
    phoneCountryCode: z.string(),
    phone: z.string().refine(
      v => !v || PHONE_DIGITS_PATTERN.test(normalizePhone(v)),
      { message: t('validation.contact_format') }
    ),
    dob: z.string(),
    joinDate: z.string(),
    memorizationDirection: z.enum(['ascending', 'descending'] as const),
    memPages: z.number().min(0),
    memUnit: z.enum(CAPACITY_UNITS),
    nearPages: z.number().min(0),
    nearUnit: z.enum(CAPACITY_UNITS),
    farPages: z.number().min(0),
    farUnit: z.enum(CAPACITY_UNITS),
    notes: z.string(),
    photoUrl: z.string(),
    halaqaIds: z.array(z.number())
  }).superRefine((data, ctx) => {
    // The ceiling on each capacity is the whole-Quran total for its chosen unit.
    for (const [valueKey, unitKey] of [
      ['memPages', 'memUnit'],
      ['nearPages', 'nearUnit'],
      ['farPages', 'farUnit']
    ] as const) {
      const max = UNIT_TOTALS[data[unitKey]]
      if (data[valueKey] > max) {
        ctx.addIssue({ code: 'custom', path: [valueKey], message: t('validation.max', { max }) })
      }
    }
  })
})

type StudentForm = z.infer<typeof schema.value>

function emptyState(): StudentForm {
  return {
    firstName: '',
    secondName: '',
    thirdName: '',
    familyName: '',
    gender: 'male',
    status: 'active',
    idNumber: '',
    phoneCountryCode: DEFAULT_DIAL_CODE,
    phone: '',
    dob: '',
    joinDate: today(getLocalTimeZone()).toString(),
    // `descending` (من الناس للخلف) is the API default and the common huffaz path.
    memorizationDirection: 'descending',
    memPages: 1,
    memUnit: DEFAULT_CAPACITY_UNIT,
    nearPages: 5,
    nearUnit: DEFAULT_CAPACITY_UNIT,
    farPages: 10,
    farUnit: DEFAULT_CAPACITY_UNIT,
    notes: '',
    photoUrl: '',
    halaqaIds: []
  }
}

const state = reactive<StudentForm>(emptyState())

// Switching to a unit with a smaller ceiling clamps the current value down so it
// never sits above the max the input now allows.
watch(
  [() => state.memUnit, () => state.nearUnit, () => state.farUnit],
  () => {
    state.memPages = Math.min(state.memPages, UNIT_TOTALS[state.memUnit])
    state.nearPages = Math.min(state.nearPages, UNIT_TOTALS[state.nearUnit])
    state.farPages = Math.min(state.farPages, UNIT_TOTALS[state.farUnit])
  }
)

const guardians = ref<GuardianRow[]>([])
const submitting = ref(false)
const showIdLockConfirm = ref(false)
const idLockResolve = ref<((val: boolean) => void) | null>(null)

function dateModel(field: 'dob' | 'joinDate') {
  return computed<CalendarDate | undefined>({
    get: () => (state[field] ? parseDate(state[field]) : undefined),
    set: (v) => {
      state[field] = v ? v.toString() : ''
    }
  })
}
const dobDate = dateModel('dob')
const joinDate = dateModel('joinDate')

const halaqaItems = computed(() =>
  halaqat.value.map(h => ({ label: h.name, value: h.id }))
)

const genderItems = computed(() => [
  { label: t('pages.students.addModal.genderMale'), value: 'male' },
  { label: t('pages.students.addModal.genderFemale'), value: 'female' }
])

const dialCodeItems = computed(() =>
  COUNTRY_DIAL_CODES.map(c => ({
    value: c.dial,
    // The dial code is LTR text inside an RTL list, so it is bracketed to keep
    // the sign glued to its digits.
    label: `${dialCodeFlag(c.iso)} ${locale.value === 'ar' ? c.nameAr : c.nameEn} (${c.dial})`
  }))
)

const statusItems = computed(() => [
  { label: t('pages.students.addModal.statusActive'), value: 'active' },
  { label: t('pages.students.addModal.statusInactive'), value: 'inactive' },
  { label: t('pages.students.addModal.statusGraduated'), value: 'graduated' }
])

const relationItems = computed(() =>
  GUARDIAN_RELATIONS.map(r => ({ value: r, label: t(`pages.students.guardians.relations.${r}`) }))
)

const directionItems = computed<{ value: MemorizationDirection, label: string }[]>(() => [
  { value: 'ascending', label: t('pages.students.addModal.directionWith') },
  { value: 'descending', label: t('pages.students.addModal.directionAgainst') }
])

const metrics = computed(() => [
  { key: 'memPages', unitKey: 'memUnit', icon: 'i-lucide-book-open', label: t('pages.students.addModal.memPages') },
  { key: 'nearPages', unitKey: 'nearUnit', icon: 'i-lucide-history', label: t('pages.students.addModal.nearPages') },
  { key: 'farPages', unitKey: 'farUnit', icon: 'i-lucide-repeat', label: t('pages.students.addModal.farPages') }
] as const)

// The +/- steppers jump by whole units; typing still accepts any decimal (1.4,
// 1.5) up to the two places the API stores.
const CAPACITY_STEP = 1

onMounted(() => {
  if (halaqat.value.length === 0) fetchHalaqat()
})

watch(() => props.student, (student) => {
  if (!student) return
  state.firstName = student.first_name ?? ''
  state.secondName = student.second_name ?? ''
  state.thirdName = student.third_name ?? ''
  state.familyName = student.family_name ?? ''
  state.gender = student.gender ?? 'male'
  state.status = student.status
  state.idNumber = student.id_number ?? ''
  state.phoneCountryCode = student.phone_country_code || DEFAULT_DIAL_CODE
  state.phone = student.phone ?? ''
  state.dob = student.dob ? student.dob.slice(0, 10) : ''
  state.joinDate = student.join_date ? student.join_date.slice(0, 10) : today(getLocalTimeZone()).toString()
  state.memorizationDirection = student.memorization_direction ?? 'descending'
  state.memPages = Number(student.daily_hifz_pages_capacity) || 0
  state.memUnit = student.daily_hifz_capacity_unit ?? DEFAULT_CAPACITY_UNIT
  state.nearPages = Number(student.daily_near_pages_capacity) || 0
  state.nearUnit = student.daily_near_capacity_unit ?? DEFAULT_CAPACITY_UNIT
  state.farPages = Number(student.daily_far_pages_capacity) || 0
  state.farUnit = student.daily_far_capacity_unit ?? DEFAULT_CAPACITY_UNIT
  state.notes = student.notes ?? ''
  state.photoUrl = student.photo_url ?? ''
  state.halaqaIds = []
  guardians.value = []
}, { immediate: true })

function addGuardianRow() {
  const isFirst = guardians.value.length === 0
  guardians.value.push({
    mode: 'email',
    email: '',
    userId: null,
    relation: 'father',
    isPrimary: isFirst,
    canPickup: true
  })
}

function removeGuardianRow(idx: number) {
  const wasPrimary = guardians.value[idx]?.isPrimary
  guardians.value.splice(idx, 1)
  if (wasPrimary && guardians.value.length > 0) {
    guardians.value[0]!.isPrimary = true
  }
}

function setPrimary(idx: number) {
  guardians.value.forEach((g, i) => {
    g.isPrimary = i === idx
  })
}

function flashWarnings() {
  const w = api.lastWarnings.value
  if (!w.length) return
  toast.add({
    title: t('pages.students.warnings.title'),
    color: 'warning',
    icon: 'i-lucide-alert-triangle'
  })
}

function askIdLockOverride(): Promise<boolean> {
  return new Promise((resolve) => {
    idLockResolve.value = resolve
    showIdLockConfirm.value = true
  })
}

function resolveIdLockOverride(val: boolean) {
  showIdLockConfirm.value = false
  if (idLockResolve.value) {
    idLockResolve.value(val)
    idLockResolve.value = null
  }
}

function buildCreateGuardiansPayload() {
  return guardians.value
    .filter(g => (g.mode === 'email' ? !!g.email.trim() : !!g.userId))
    .map(g => ({
      ...(g.mode === 'email'
        ? { email: g.email.trim() }
        : { guardian_user_id: g.userId }),
      relation: g.relation,
      is_primary: g.isPrimary,
      can_pickup: g.canPickup
    }))
}

async function enrollIntoHalaqat(studentId: number) {
  if (!state.halaqaIds.length) return { failed: 0, total: 0 }
  const results = await Promise.allSettled(
    state.halaqaIds.map(halaqaId =>
      api(`/halaqat/${halaqaId}/students`, {
        method: 'POST',
        body: {
          student_id: studentId,
          enrollment_date: state.joinDate
        }
      })
    )
  )
  return {
    failed: results.filter(r => r.status === 'rejected').length,
    total: state.halaqaIds.length
  }
}

async function handleSubmit(_event: FormSubmitEvent<StudentForm>) {
  if (submitting.value) return
  submitting.value = true
  try {
    if (isEditMode.value && props.student) {
      const patch: Record<string, any> = {}

      if (!lockBio.value) {
        // Send only the parts that actually changed — the API patches per part
        // and rebuilds the display name itself.
        for (const field of NAME_PART_FIELDS) {
          const next = state[field.key].trim()
          if (next !== (props.student[field.apiKey] ?? '')) {
            patch[field.apiKey] = next
          }
        }
        patch.gender = state.gender
        patch.status = state.status
        patch.dob = state.dob || null
        patch.join_date = state.joinDate
        patch.photo_url = state.photoUrl.trim() || null

        // Both halves travel together or not at all: nulls clear the number,
        // and the API rejects a dial code with no number behind it.
        const phone = normalizePhone(state.phone)
        const nextCode = phone ? state.phoneCountryCode : null
        const nextPhone = phone || null
        if (
          nextCode !== (props.student.phone_country_code ?? null)
          || nextPhone !== (props.student.phone ?? null)
        ) {
          patch.phone_country_code = nextCode
          patch.phone = nextPhone
        }

        const originalId = props.student.id_number ?? ''
        const currentId = normalizeDigits(state.idNumber)
        const idChanged = currentId !== originalId

        if (idChanged) {
          if (originalId) {
            const confirmed = await askIdLockOverride()
            if (!confirmed) {
              submitting.value = false
              return
            }
            patch.force_id_number_change = true
          }
          patch.id_number = currentId || null
        }
      }

      patch.memorization_direction = state.memorizationDirection
      patch.daily_hifz_pages_capacity = state.memPages
      patch.daily_hifz_capacity_unit = state.memUnit
      patch.daily_near_pages_capacity = state.nearPages
      patch.daily_near_capacity_unit = state.nearUnit
      patch.daily_far_pages_capacity = state.farPages
      patch.daily_far_capacity_unit = state.farUnit
      patch.notes = state.notes.trim() || null

      await updateStudent(props.student.id, patch)
      flashWarnings()
      toast.add({ title: t('pages.students.addModal.editSuccess'), color: 'success' })
      modalOpen.value = false
      return
    }

    const phone = normalizePhone(state.phone)
    const created = await createStudent({
      first_name: state.firstName.trim(),
      second_name: state.secondName.trim(),
      third_name: state.thirdName.trim(),
      family_name: state.familyName.trim(),
      gender: state.gender,
      id_number: normalizeDigits(state.idNumber),
      ...(phone ? { phone_country_code: state.phoneCountryCode, phone } : {}),
      ...(state.dob ? { dob: state.dob } : {}),
      join_date: state.joinDate,
      memorization_direction: state.memorizationDirection,
      daily_hifz_pages_capacity: state.memPages,
      daily_hifz_capacity_unit: state.memUnit,
      daily_near_pages_capacity: state.nearPages,
      daily_near_capacity_unit: state.nearUnit,
      daily_far_pages_capacity: state.farPages,
      daily_far_capacity_unit: state.farUnit,
      ...(state.photoUrl.trim() ? { photo_url: state.photoUrl.trim() } : {}),
      ...(state.notes.trim() ? { notes: state.notes.trim() } : {}),
      guardians: buildCreateGuardiansPayload()
    })

    flashWarnings()

    const newStudent = created.data
    const { failed } = await enrollIntoHalaqat(newStudent.id)
    if (failed > 0) {
      toast.add({
        title: t('pages.students.addModal.addedTitle'),
        color: 'warning'
      })
    } else {
      toast.add({
        title: t('pages.students.addModal.successTitle'),
        color: 'success'
      })
    }

    modalOpen.value = false
  } catch (e: any) {
    const fallback = isEditMode.value
      ? t('pages.students.addModal.editError')
      : t('pages.students.addModal.saveError')
    toast.add({ title: apiError.format(e, fallback), color: 'error' })
  } finally {
    submitting.value = false
  }
}

const modalOpen = ref(true)
watch(modalOpen, (open) => {
  if (!open) emit('close', false)
})
</script>

<template>
  <DefineBody>
    <div v-if="loading" class="flex items-center justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <UForm
      v-else
      id="student-form"
      :state="state"
      :schema="schema"
      class="space-y-6"
      @submit="handleSubmit"
    >
      <UAlert
        v-if="isEditMode && !lockBio"
        color="neutral"
        variant="soft"
        icon="i-lucide-users"
        :title="t('pages.students.addModal.guardiansEditHint')"
      />

      <UFormField
        v-if="!isEditMode"
        :label="t('pages.students.addModal.halaqaLabel')"
        name="halaqaIds"
        :hint="halaqatLoading ? t('pages.students.addModal.halaqaLoading') : t('pages.students.addModal.halaqaHint')"
      >
        <USelectMenu
          v-model="state.halaqaIds"
          :items="halaqaItems"
          value-key="value"
          multiple
          :loading="halaqatLoading"
          :disabled="halaqatLoading"
          :placeholder="t('pages.students.addModal.halaqaPlaceholder')"
          icon="i-lucide-layers"
          class="w-full"
        />
      </UFormField>

      <div v-if="!lockBio" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField
          v-for="field in NAME_PART_FIELDS"
          :key="field.key"
          :label="t(field.labelKey)"
          :name="field.key"
          required
        >
          <UInput
            v-model="state[field.key]"
            :maxlength="NAME_PART_MAX_LENGTH"
            :disabled="lockBio"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('pages.students.addModal.gender')" name="gender" required>
          <USelect
            v-model="state.gender"
            :items="genderItems"
            value-key="value"
            :disabled="lockBio"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('pages.students.addModal.idNumber')" name="idNumber" :required="!isEditMode">
          <UInput
            v-model="state.idNumber"
            :placeholder="t('pages.students.addModal.idNumberPlaceholder')"
            inputmode="numeric"
            dir="ltr"
            :disabled="lockBio"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('pages.students.addModal.phone')"
          name="phone"
          :hint="t('pages.students.addModal.phoneHint')"
          class="sm:col-span-2"
        >
          <div class="flex gap-2">
            <USelectMenu
              v-model="state.phoneCountryCode"
              :items="dialCodeItems"
              value-key="value"
              :search-input="{ placeholder: t('pages.students.addModal.phoneCountrySearch') }"
              :disabled="lockBio"
              class="w-56 shrink-0"
            />
            <UInput
              v-model="state.phone"
              :placeholder="t('pages.students.addModal.phonePlaceholder')"
              inputmode="tel"
              dir="ltr"
              :disabled="lockBio"
              class="flex-1"
            />
          </div>
        </UFormField>
        <UFormField :label="t('pages.students.addModal.dob')" name="dob">
          <UPopover :disabled="lockBio">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-calendar"
              :disabled="lockBio"
              class="w-full justify-start font-normal"
            >
              {{ state.dob ? formatDate(state.dob) : t('pages.students.addModal.pickDate') }}
            </UButton>
            <template #content>
              <UCalendar v-model="dobDate" class="p-2" />
            </template>
          </UPopover>
        </UFormField>
        <UFormField :label="t('pages.students.addModal.joinDate')" name="joinDate" required>
          <UPopover :disabled="lockBio">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-calendar"
              :disabled="lockBio"
              class="w-full justify-start font-normal"
            >
              {{ state.joinDate ? formatDate(state.joinDate) : t('pages.students.addModal.pickDate') }}
            </UButton>
            <template #content>
              <UCalendar v-model="joinDate" class="p-2" />
            </template>
          </UPopover>
        </UFormField>
        <UFormField :label="t('pages.students.addModal.photoUrl')" name="photoUrl" class="sm:col-span-2">
          <UInput
            v-model="state.photoUrl"
            :placeholder="t('pages.students.addModal.photoUrlPlaceholder')"
            dir="ltr"
            :disabled="lockBio"
            class="w-full"
          />
        </UFormField>
        <UFormField
          v-if="isEditMode"
          :label="t('pages.students.addModal.status')"
          name="status"
          class="sm:col-span-2"
        >
          <USelect
            v-model="state.status"
            :items="statusItems"
            value-key="value"
            :disabled="lockBio"
            class="w-full"
          />
        </UFormField>
      </div>

      <div v-if="!isEditMode" class="space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="font-semibold text-sm">
            {{ t('pages.students.addModal.guardiansTitle') }}
          </h4>
          <UButton
            variant="soft"
            color="primary"
            icon="i-lucide-plus"
            size="sm"
            @click="addGuardianRow"
          >
            {{ t('pages.students.guardians.add') }}
          </UButton>
        </div>
        <p class="text-xs text-muted">
          {{ t('pages.students.addModal.guardiansHint') }}
        </p>

        <div
          v-for="(g, idx) in guardians"
          :key="idx"
          class="rounded-lg border border-default p-4 space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">
              {{ t('pages.students.guardians.row', { n: idx + 1 }) }}
            </span>
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="sm"
              square
              @click="removeGuardianRow(idx)"
            />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField :label="t('pages.students.guardians.email')">
              <UInput v-model="g.email" type="email" dir="ltr" class="w-full" />
            </UFormField>
            <UFormField :label="t('pages.students.guardians.relation')">
              <USelect
                v-model="g.relation"
                :items="relationItems"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </div>
          <div class="flex flex-wrap items-center gap-4 pt-1">
            <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
              <UCheckbox :model-value="g.isPrimary" @update:model-value="setPrimary(idx)" />
              {{ t('pages.students.guardians.isPrimary') }}
            </label>
            <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
              <UCheckbox v-model="g.canPickup" />
              {{ t('pages.students.guardians.canPickup') }}
            </label>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <h4 class="font-semibold text-sm">
          {{ t('pages.students.addModal.metricsTitle') }}
        </h4>
        <UFormField
          :label="t('pages.students.addModal.direction')"
          name="memorizationDirection"
        >
          <USelect
            v-model="state.memorizationDirection"
            :items="directionItems"
            value-key="value"
            icon="i-lucide-book-marked"
            class="w-full"
          />
        </UFormField>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <UFormField
            v-for="metric in metrics"
            :key="metric.key"
            :label="metric.label"
            :name="metric.key"
          >
            <div class="flex gap-2">
              <UInputNumber
                v-model="state[metric.key as keyof StudentForm] as number"
                :min="0"
                :max="UNIT_TOTALS[state[metric.unitKey]]"
                :step="CAPACITY_STEP"
                :step-snapping="false"
                :format-options="{ maximumFractionDigits: 2 }"
                class="flex-1 min-w-0"
              />
              <USelect
                v-model="state[metric.unitKey as keyof StudentForm] as StudentCapacityUnit"
                :items="unitItems"
                value-key="value"
                :aria-label="t('pages.students.addModal.capacityUnitLabel')"
                class="w-24 shrink-0"
              />
            </div>
          </UFormField>
        </div>
      </div>

      <UFormField :label="t('pages.students.addModal.notesLabel')" name="notes">
        <UTextarea
          v-model="state.notes"
          :rows="3"
          :placeholder="t('pages.students.addModal.notesPlaceholder')"
          class="w-full"
        />
      </UFormField>
    </UForm>
  </DefineBody>

  <DefineFooter>
    <div class="flex items-center justify-end gap-2 w-full">
      <UButton
        variant="soft"
        color="neutral"
        :disabled="submitting"
        @click="modalOpen = false"
      >
        {{ t('pages.students.addModal.cancel') }}
      </UButton>
      <UButton
        type="submit"
        form="student-form"
        :loading="submitting"
        :disabled="loading || submitting"
      >
        {{ isEditMode ? t('pages.students.addModal.editSubmit') : t('pages.students.addModal.submit') }}
      </UButton>
    </div>
  </DefineFooter>

  <UModal
    v-if="isDesktop"
    v-model:open="modalOpen"
    :title="isEditMode ? t('pages.students.addModal.editTitle') : t('pages.students.addModal.title')"
    :ui="{ content: 'sm:max-w-3xl rounded-2xl' }"
  >
    <template #body>
      <ReuseBody />
    </template>
    <template #footer>
      <ReuseFooter />
    </template>
  </UModal>

  <UDrawer
    v-else
    v-model:open="modalOpen"
    :title="isEditMode ? t('pages.students.addModal.editTitle') : t('pages.students.addModal.title')"
    :ui="{ content: 'rounded-t-3xl overflow-hidden', container: 'max-h-[90vh]' }"
  >
    <template #body>
      <ReuseBody />
    </template>
    <template #footer>
      <ReuseFooter />
    </template>
  </UDrawer>

  <CommonConfirmDialog
    v-model:open="showIdLockConfirm"
    :title="t('pages.students.idLock.title')"
    :message="t('pages.students.idLock.message')"
    :confirm-label="t('pages.students.idLock.confirm')"
    :cancel-label="t('pages.students.idLock.cancel')"
    destructive
    @update:open="(v) => { if (!v) resolveIdLockOverride(false) }"
    @confirm="resolveIdLockOverride(true)"
  />
</template>
