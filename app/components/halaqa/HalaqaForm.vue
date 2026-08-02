<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type {
  ApiHalaqaListItem,
  ApiTeacherOption,
  HalaqaType
} from '~/types'

// Every halaqa is a memorization (حفظ) circle, so the type picker is gone from
// the form and this is sent on every create and update.
const HALAQA_TYPE: HalaqaType = 'Memorization'

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
  primary_teacher_user_id: z.number().nullable().optional()
}))

type Schema = z.output<typeof schema.value>

const state = reactive<{
  name: string
  primary_teacher_user_id: number | null
}>({
  name: '',
  primary_teacher_user_id: null
})

watch(() => props.editing, (next) => {
  if (next) {
    state.name = next.name
  } else {
    state.name = ''
    state.primary_teacher_user_id = null
  }
}, { immediate: true })

const saving = ref(false)

const teacherItems = computed(() => [
  { label: t('pages.halaqat.fieldPrimaryTeacherPlaceholder'), value: null },
  ...teachers.value.map(u => ({ label: u.name, value: u.id }))
])

async function onSubmit(event: FormSubmitEvent<Schema>) {
  // Block a duplicate submit while one is already in flight (a double-tap before
  // the button's :disabled binding paints) — a write must not be aborted, only
  // deduplicated, so a plain re-entrancy guard is the right tool here.
  if (saving.value) return
  saving.value = true
  try {
    if (isEdit.value && props.editing) {
      await updateHalaqa(props.editing.id, {
        name: event.data.name,
        type: HALAQA_TYPE
      })
      toast.add({ title: t('pages.halaqat.toastUpdated'), color: 'success' })
    } else {
      await createHalaqa({
        name: event.data.name,
        type: HALAQA_TYPE,
        primary_teacher_user_id: state.primary_teacher_user_id ?? undefined
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
    </template>
  </UForm>
</template>
