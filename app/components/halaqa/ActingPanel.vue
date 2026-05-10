<script setup lang="ts">
import type { ApiTeacherAssignment, ApiTeacherOption } from '~/types'

const props = defineProps<{
  halaqaId: number
  teachers: ApiTeacherAssignment[]
  canManage: boolean
}>()

const emit = defineEmits<{
  changed: []
}>()

const { t } = useI18n()
const toast = useToast()
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
    const msg = (e as { data?: { message?: string } })?.data?.message
    teachersError.value = typeof msg === 'string' ? msg : t('pages.halaqat.toastError')
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

// ── Substitute (Workflow B) ──────────────────────────────────────────────
const subOpen = ref(false)
const subForm = reactive({
  teacher_user_id: null as number | null,
  acting_starts_at: toIsoDate(new Date()),
  acting_ends_at: '',
  notes: ''
})
const subSaving = ref(false)

async function openSub() {
  subForm.teacher_user_id = null
  subForm.acting_starts_at = toIsoDate(new Date())
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 7)
  subForm.acting_ends_at = toIsoDate(endDate)
  subForm.notes = ''
  subOpen.value = true
  await loadTeacherOptions()
}

const teacherSelectItems = computed(() => [
  { label: t('pages.halaqat.fieldTeacherPlaceholder'), value: null },
  ...teacherOptions.value.map(o => ({ label: o.name, value: o.id }))
])

async function submitSub() {
  if (!subForm.teacher_user_id) {
    toast.add({ title: t('pages.halaqat.validationTeacher'), color: 'error' })
    return
  }
  subSaving.value = true
  try {
    await substitute(props.halaqaId, {
      teacher_user_id: subForm.teacher_user_id,
      acting_starts_at: subForm.acting_starts_at,
      acting_ends_at: subForm.acting_ends_at,
      notes: subForm.notes || undefined
    })
    toast.add({ title: t('pages.halaqat.acting.toastSubstituted'), color: 'success' })
    subOpen.value = false
    emit('changed')
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message
    toast.add({ title: typeof msg === 'string' ? msg : t('pages.halaqat.toastError'), color: 'error' })
  } finally {
    subSaving.value = false
  }
}

// ── Extend ────────────────────────────────────────────────────────────────
const extOpen = ref(false)
const extForm = reactive({ acting_ends_at: '' })
const extSaving = ref(false)

function openExt() {
  extForm.acting_ends_at = acting.value?.acting_ends_at ?? toIsoDate(new Date())
  extOpen.value = true
}

async function submitExt() {
  extSaving.value = true
  try {
    await extend(props.halaqaId, { acting_ends_at: extForm.acting_ends_at })
    toast.add({ title: t('pages.halaqat.acting.toastExtended'), color: 'success' })
    extOpen.value = false
    emit('changed')
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message
    toast.add({ title: typeof msg === 'string' ? msg : t('pages.halaqat.toastError'), color: 'error' })
  } finally {
    extSaving.value = false
  }
}

// ── End acting ────────────────────────────────────────────────────────────
async function endNow() {
  try {
    await endActing(props.halaqaId)
    toast.add({ title: t('pages.halaqat.acting.toastEnded'), color: 'success' })
    emit('changed')
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message
    toast.add({ title: typeof msg === 'string' ? msg : t('pages.halaqat.toastError'), color: 'error' })
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
          {{ t('pages.halaqat.acting.actingFrom') }}: {{ acting.acting_starts_at ?? '—' }}
          <span v-if="acting.acting_ends_at" class="ms-2">
            · {{ t('pages.halaqat.acting.actingTo') }}: {{ acting.acting_ends_at }}
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

  <!-- Substitute modal -->
  <UModal
    v-model:open="subOpen"
    :title="t('pages.halaqat.acting.substituteTitle')"
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
            v-model="subForm.teacher_user_id"
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
        <UFormField :label="t('pages.halaqat.acting.fieldStartsAt')" required>
          <UInput v-model="subForm.acting_starts_at" type="date" class="w-full" />
        </UFormField>
        <UFormField :label="t('pages.halaqat.acting.fieldEndsAt')" required>
          <UInput v-model="subForm.acting_ends_at" type="date" class="w-full" />
        </UFormField>
        <UFormField :label="t('pages.halaqat.teachers.fieldNotes')">
          <UTextarea v-model="subForm.notes" class="w-full" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton variant="soft" color="neutral" :disabled="subSaving" @click="subOpen = false">
          {{ t('pages.halaqat.cancel') }}
        </UButton>
        <UButton :loading="subSaving" @click="submitSub">
          {{ t('pages.halaqat.save') }}
        </UButton>
      </div>
    </template>
  </UModal>

  <!-- Extend modal -->
  <UModal
    v-model:open="extOpen"
    :title="t('pages.halaqat.acting.extendTitle')"
    :ui="{ content: 'sm:max-w-md rounded-2xl' }"
  >
    <UButton class="sr-only" tabindex="-1" />
    <template #body>
      <UFormField :label="t('pages.halaqat.acting.fieldEndsAt')" required>
        <UInput v-model="extForm.acting_ends_at" type="date" class="w-full" />
      </UFormField>
    </template>
    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton variant="soft" color="neutral" :disabled="extSaving" @click="extOpen = false">
          {{ t('pages.halaqat.cancel') }}
        </UButton>
        <UButton :loading="extSaving" @click="submitExt">
          {{ t('pages.halaqat.save') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
