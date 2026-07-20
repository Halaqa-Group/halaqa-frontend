<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
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
}>()

const { t } = useI18n()
const toast = useToast()
const apiError = useApiError()
const { createHalaqa, updateHalaqa, fetchTeachers } = useHalaqat()

const isEdit = computed(() => props.editing != null)

const teachers = ref<ApiTeacherOption[]>([])
const teachersLoading = ref(false)
const teachersError = ref<string | null>(null)

async function loadTeachers() {
  if (isEdit.value) return
  teachersLoading.value = true
  teachersError.value = null
  try {
    teachers.value = await fetchTeachers()
  } catch (e: unknown) {
    teachersError.value = apiError.format(e, t('pages.halaqat.toastError'))
    teachers.value = []
  } finally {
    teachersLoading.value = false
  }
}

onMounted(loadTeachers)

const schema = computed(() => z.object({
  name: z.string({ error: () => t('pages.halaqat.validationName') })
    .trim()
    .min(1, t('pages.halaqat.validationName')),
  type: z.enum(HALAQA_TYPES as unknown as [HalaqaType, ...HalaqaType[]]),
  primary_teacher_user_id: z.number().nullable().optional(),
  schedule: z.array(z.any()).optional()
}))

type Schema = z.output<typeof schema.value>

const state = reactive<{
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
    state.name = next.name
    state.type = next.type
  } else {
    state.name = ''
    state.type = 'Memorization'
    state.primary_teacher_user_id = null
    state.schedule = []
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
  if (state.schedule.length === 0) return undefined
  return state.schedule.map(r => ({
    day_of_week: r.day_of_week,
    prayer_slot: r.prayer_slot ?? undefined,
    start_time: r.start_time ? `${r.start_time}:00` : undefined,
    end_time: r.end_time ? `${r.end_time}:00` : undefined
  }))
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true
  try {
    if (isEdit.value && props.editing) {
      await updateHalaqa(props.editing.id, {
        name: event.data.name,
        type: event.data.type
      })
      toast.add({ title: t('pages.halaqat.toastUpdated'), color: 'success' })
    } else {
      await createHalaqa({
        name: event.data.name,
        type: event.data.type,
        primary_teacher_user_id: state.primary_teacher_user_id ?? undefined,
        schedule: buildSchedulePayload()
      })
      toast.add({ title: t('pages.halaqat.toastCreated'), color: 'success' })
    }
    emit('saved')
  } catch (e: unknown) {
    toast.add({
      title: apiError.format(e, t('pages.halaqat.toastError')),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

defineExpose({ saving })
</script>

<template>
  <UForm
    id="halaqa-form"
    :schema="schema"
    :state="state"
    class="space-y-5"
    @submit="onSubmit"
  >
    <UFormField :label="t('pages.halaqat.fieldName')" name="name" required>
      <UInput
        v-model="state.name"
        :placeholder="t('pages.halaqat.fieldNamePlaceholder')"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="t('pages.halaqat.fieldType')" name="type" required>
      <USelect
        v-model="state.type"
        :items="typeItems"
        value-key="value"
        class="w-full"
      />
    </UFormField>

    <template v-if="!isEdit">
      <UFormField
        :label="t('pages.halaqat.fieldPrimaryTeacher')"
        name="primary_teacher_user_id"
        :error="teachersError ?? undefined"
      >
        <USelect
          v-model="state.primary_teacher_user_id"
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
        <HalaqaScheduleDays v-model="state.schedule" />
      </UFormField>
    </template>
  </UForm>
</template>
