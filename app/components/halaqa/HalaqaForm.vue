<script setup lang="ts">
import type {
  ApiHalaqaListItem,
  ApiTeacherOption,
  HalaqaType
} from '~/types'
import { HALAQA_TYPES } from '~/utils/halaqa'
import type { ScheduleEntryPayload } from '~/composables/useHalaqat'
import HalaqaScheduleDays, { type ScheduleDayRow } from '~/components/halaqa/ScheduleDays.vue'

const props = defineProps<{
  editing: ApiHalaqaListItem | null
}>()

const emit = defineEmits<{
  saved: []
  cancel: []
}>()

const { t } = useI18n()
const toast = useToast()
const { createHalaqa, updateHalaqa, fetchTeachers } = useHalaqat()

const isEdit = computed(() => props.editing != null)

// Real teachers in the caller's school — fetched on mount from
// GET /users?role=teacher&status=active. Errors are surfaced inline so the
// user can retry rather than silently seeing an empty dropdown.
const teachers = ref<ApiTeacherOption[]>([])
const teachersLoading = ref(false)
const teachersError = ref<string | null>(null)

async function loadTeachers() {
  if (isEdit.value) return // edit form doesn't show the teacher field
  teachersLoading.value = true
  teachersError.value = null
  try {
    teachers.value = await fetchTeachers()
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message
    teachersError.value = typeof msg === 'string' ? msg : t('pages.halaqat.toastError')
    teachers.value = []
  } finally {
    teachersLoading.value = false
  }
}

onMounted(loadTeachers)

const form = reactive<{
  name: string
  type: HalaqaType
  primary_teacher_user_id: number | null
  schedule: ScheduleDayRow[]
}>({
  name: '',
  type: 'Memorization',
  primary_teacher_user_id: null,
  schedule: []
})

watch(() => props.editing, (next) => {
  if (next) {
    form.name = next.name
    form.type = next.type
  } else {
    form.name = ''
    form.type = 'Memorization'
    form.primary_teacher_user_id = null
    form.schedule = []
  }
}, { immediate: true })

const saving = ref(false)

const typeItems = computed(() =>
  HALAQA_TYPES.map(value => ({
    label: t(`pages.halaqat.types.${value}`),
    value
  }))
)

const teacherItems = computed(() => [
  { label: t('pages.halaqat.fieldPrimaryTeacherPlaceholder'), value: null },
  ...teachers.value.map(u => ({ label: u.name, value: u.id }))
])

function buildSchedulePayload(): ScheduleEntryPayload[] | undefined {
  if (form.schedule.length === 0) return undefined
  return form.schedule.map(r => ({
    day_of_week: r.day_of_week,
    prayer_slot: r.prayer_slot ?? undefined,
    start_time: r.start_time ? `${r.start_time}:00` : undefined,
    end_time: r.end_time ? `${r.end_time}:00` : undefined
  }))
}

async function submit() {
  if (!form.name.trim()) {
    toast.add({ title: t('pages.halaqat.validationName'), color: 'error' })
    return
  }
  saving.value = true
  try {
    if (isEdit.value && props.editing) {
      await updateHalaqa(props.editing.id, {
        name: form.name.trim(),
        type: form.type
      })
      toast.add({ title: t('pages.halaqat.toastUpdated'), color: 'success' })
    } else {
      await createHalaqa({
        name: form.name.trim(),
        type: form.type,
        primary_teacher_user_id: form.primary_teacher_user_id ?? undefined,
        schedule: buildSchedulePayload()
      })
      toast.add({ title: t('pages.halaqat.toastCreated'), color: 'success' })
    }
    emit('saved')
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message
    toast.add({
      title: typeof msg === 'string' ? msg : t('pages.halaqat.toastError'),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <UFormField :label="t('pages.halaqat.fieldName')" name="name" required>
      <UInput
        v-model="form.name"
        :placeholder="t('pages.halaqat.fieldNamePlaceholder')"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="t('pages.halaqat.fieldType')" name="type" required>
      <USelect
        v-model="form.type"
        :items="typeItems"
        value-key="value"
        class="w-full"
      />
    </UFormField>

    <template v-if="!isEdit">
      <UFormField
        :label="t('pages.halaqat.fieldPrimaryTeacher')"
        name="primary_teacher"
        :error="teachersError ?? undefined"
      >
        <USelect
          v-model="form.primary_teacher_user_id"
          :items="teacherItems"
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
            @click="loadTeachers"
          >
            {{ t('common.tryAgain') }}
          </UButton>
        </template>
      </UFormField>

      <UFormField
        :label="t('pages.halaqat.fieldSchedule')"
        :hint="t('pages.halaqat.fieldScheduleHint')"
        name="schedule"
      >
        <HalaqaScheduleDays v-model="form.schedule" />
      </UFormField>
    </template>

    <div class="flex items-center justify-end gap-2 pt-2">
      <UButton
        variant="soft"
        color="neutral"
        :disabled="saving"
        @click="emit('cancel')"
      >
        {{ t('pages.halaqat.cancel') }}
      </UButton>
      <UButton :loading="saving" @click="submit">
        {{ t('pages.halaqat.save') }}
      </UButton>
    </div>
  </div>
</template>
