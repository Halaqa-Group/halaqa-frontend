<script setup lang="ts">
import * as z from 'zod'
import { createReusableTemplate, useMediaQuery } from '@vueuse/core'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { ApiTeacherAssignment, ApiTeacherOption } from '~/types'

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
const { substitute, extend, endActing } = useHalaqaActing()
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

const acting = computed(() =>
  props.teachers.find(t => t.acting_as_primary) ?? null
)

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const subSchema = computed(() => z.object({
  teacher_user_id: z.number({ error: () => t('pages.halaqat.validationTeacher') })
    .int()
    .positive(t('pages.halaqat.validationTeacher')),
  acting_starts_at: z.string({ error: () => t('validation.required') })
    .min(1, t('validation.required')),
  acting_ends_at: z.string({ error: () => t('validation.required') })
    .min(1, t('validation.required')),
  notes: z.string().optional()
}).refine(d => d.acting_ends_at >= d.acting_starts_at, {
  message: t('pages.halaqat.validationActingRange'),
  path: ['acting_ends_at']
}))

type SubSchema = z.output<typeof subSchema.value>

const subOpen = ref(false)

// Centered modal on desktop, bottom drawer on mobile — body + footer are shared
// between the two shells via reusable templates.
const isDesktop = useMediaQuery('(min-width: 640px)')
const [DefineBody, ReuseBody] = createReusableTemplate()
const [DefineFooter, ReuseFooter] = createReusableTemplate()
const [DefineExtBody, ReuseExtBody] = createReusableTemplate()
const [DefineExtFooter, ReuseExtFooter] = createReusableTemplate()
const subState = reactive<{
  teacher_user_id: number | null
  acting_starts_at: string
  acting_ends_at: string
  notes: string
}>({
  teacher_user_id: null,
  acting_starts_at: toIsoDate(new Date()),
  acting_ends_at: '',
  notes: ''
})
const subSaving = ref(false)

async function openSub() {
  subState.teacher_user_id = null
  subState.acting_starts_at = toIsoDate(new Date())
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 7)
  subState.acting_ends_at = toIsoDate(endDate)
  subState.notes = ''
  subOpen.value = true
  await loadTeacherOptions()
}

const teacherSelectItems = computed(() => [
  { label: t('pages.halaqat.fieldTeacherPlaceholder'), value: null },
  ...teacherOptions.value.map(o => ({ label: o.name, value: o.id }))
])

async function submitSub(event: FormSubmitEvent<SubSchema>) {
  subSaving.value = true
  try {
    await substitute(props.halaqaId, {
      teacher_user_id: event.data.teacher_user_id,
      acting_starts_at: event.data.acting_starts_at,
      acting_ends_at: event.data.acting_ends_at,
      notes: event.data.notes || undefined
    })
    toast.add({ title: t('pages.halaqat.acting.toastSubstituted'), color: 'success' })
    subOpen.value = false
    emit('changed')
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.halaqat.toastError')), color: 'error' })
  } finally {
    subSaving.value = false
  }
}

const extSchema = computed(() => z.object({
  acting_ends_at: z.string({ error: () => t('validation.required') })
    .min(1, t('validation.required'))
}))

type ExtSchema = z.output<typeof extSchema.value>

const extOpen = ref(false)
const extState = reactive<{ acting_ends_at: string }>({ acting_ends_at: '' })
const extSaving = ref(false)

function openExt() {
  extState.acting_ends_at = acting.value?.acting_ends_at ?? toIsoDate(new Date())
  extOpen.value = true
}

async function submitExt(event: FormSubmitEvent<ExtSchema>) {
  extSaving.value = true
  try {
    await extend(props.halaqaId, { acting_ends_at: event.data.acting_ends_at })
    toast.add({ title: t('pages.halaqat.acting.toastExtended'), color: 'success' })
    extOpen.value = false
    emit('changed')
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.halaqat.toastError')), color: 'error' })
  } finally {
    extSaving.value = false
  }
}

async function endNow() {
  try {
    await endActing(props.halaqaId)
    toast.add({ title: t('pages.halaqat.acting.toastEnded'), color: 'success' })
    emit('changed')
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.halaqat.toastError')), color: 'error' })
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">
          {{ t('pages.halaqat.acting.title') }}
        </h3>
        <UButton
          v-if="canManage && !acting"
          icon="i-lucide-user-plus"
          size="sm"
          variant="soft"
          color="warning"
          @click="openSub"
        >
          {{ t('pages.halaqat.acting.substitute') }}
        </UButton>
      </div>
    </template>

    <div v-if="!acting" class="text-sm text-muted">
      {{ t('pages.halaqat.acting.none') }}
    </div>
    <div v-else class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="font-medium">{{ acting.teacher_name }}</span>
          <UBadge variant="subtle" color="warning" size="sm">
            {{ t('pages.halaqat.actingBadge') }}
          </UBadge>
        </div>
        <p class="text-xs text-muted">
          {{ t('pages.halaqat.acting.actingFrom') }}: {{ formatDate(acting.acting_starts_at) }}
          <span v-if="acting.acting_ends_at" class="ms-2">
            · {{ t('pages.halaqat.acting.actingTo') }}: {{ formatDate(acting.acting_ends_at) }}
          </span>
        </p>
      </div>
      <div v-if="canManage" class="flex items-center gap-2">
        <UButton variant="soft" color="neutral" icon="i-lucide-calendar-plus" @click="openExt">
          {{ t('pages.halaqat.acting.extend') }}
        </UButton>
        <UButton variant="soft" color="error" icon="i-lucide-x" @click="endNow">
          {{ t('pages.halaqat.acting.end') }}
        </UButton>
      </div>
    </div>
  </UCard>

  <DefineBody>
    <UForm
      id="acting-sub-form"
      :schema="subSchema"
      :state="subState"
      class="space-y-4"
      @submit="submitSub"
    >
      <UFormField
        :label="t('pages.halaqat.teachers.fieldTeacher')"
        name="teacher_user_id"
        required
        :error="teachersError ?? undefined"
      >
        <USelect
          v-model="subState.teacher_user_id"
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
      <UFormField :label="t('pages.halaqat.acting.fieldStartsAt')" name="acting_starts_at" required>
        <UInput v-model="subState.acting_starts_at" type="date" class="w-full" />
      </UFormField>
      <UFormField :label="t('pages.halaqat.acting.fieldEndsAt')" name="acting_ends_at" required>
        <UInput v-model="subState.acting_ends_at" type="date" class="w-full" />
      </UFormField>
      <UFormField :label="t('pages.halaqat.teachers.fieldNotes')" name="notes">
        <UTextarea v-model="subState.notes" class="w-full" />
      </UFormField>
    </UForm>
  </DefineBody>

  <DefineFooter>
    <div class="flex items-center justify-end gap-2 w-full">
      <UButton variant="soft" color="neutral" :disabled="subSaving" @click="subOpen = false">
        {{ t('pages.halaqat.cancel') }}
      </UButton>
      <UButton type="submit" form="acting-sub-form" :loading="subSaving">
        {{ t('pages.halaqat.save') }}
      </UButton>
    </div>
  </DefineFooter>

  <UModal
    v-if="isDesktop"
    v-model:open="subOpen"
    :title="t('pages.halaqat.acting.substituteTitle')"
    :ui="{ content: 'sm:max-w-md rounded-2xl' }"
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
    v-model:open="subOpen"
    :title="t('pages.halaqat.acting.substituteTitle')"
    :ui="{ content: 'rounded-t-3xl overflow-hidden', container: 'max-h-[90vh]' }"
  >
    <template #body>
      <ReuseBody />
    </template>
    <template #footer>
      <ReuseFooter />
    </template>
  </UDrawer>

  <DefineExtBody>
    <UForm
      id="acting-ext-form"
      :schema="extSchema"
      :state="extState"
      class="space-y-4"
      @submit="submitExt"
    >
      <UFormField :label="t('pages.halaqat.acting.fieldEndsAt')" name="acting_ends_at" required>
        <UInput v-model="extState.acting_ends_at" type="date" class="w-full" />
      </UFormField>
    </UForm>
  </DefineExtBody>

  <DefineExtFooter>
    <div class="flex items-center justify-end gap-2 w-full">
      <UButton variant="soft" color="neutral" :disabled="extSaving" @click="extOpen = false">
        {{ t('pages.halaqat.cancel') }}
      </UButton>
      <UButton type="submit" form="acting-ext-form" :loading="extSaving">
        {{ t('pages.halaqat.save') }}
      </UButton>
    </div>
  </DefineExtFooter>

  <UModal
    v-if="isDesktop"
    v-model:open="extOpen"
    :title="t('pages.halaqat.acting.extendTitle')"
    :ui="{ content: 'sm:max-w-md rounded-2xl' }"
  >
    <template #body>
      <ReuseExtBody />
    </template>
    <template #footer>
      <ReuseExtFooter />
    </template>
  </UModal>

  <UDrawer
    v-else
    v-model:open="extOpen"
    :title="t('pages.halaqat.acting.extendTitle')"
    :ui="{ content: 'rounded-t-3xl overflow-hidden', container: 'max-h-[90vh]' }"
  >
    <template #body>
      <ReuseExtBody />
    </template>
    <template #footer>
      <ReuseExtFooter />
    </template>
  </UDrawer>
</template>
