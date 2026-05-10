<script setup lang="ts">
import type {
  ApiHalaqaListItem,
  ApiTeacherOption,
  HalaqaType,
  PrayerSlot
} from '~/types'
import {
  HALAQA_DAY_KEYS,
  HALAQA_DAY_ORDER,
  HALAQA_TYPES
} from '~/utils/halaqa'
import type { ScheduleEntryPayload } from '~/composables/useHalaqat'

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

interface ScheduleRow {
  day_of_week: number
  prayer_slot: PrayerSlot | null
  start_time: string
  end_time: string
}

const form = reactive<{
  name: string
  type: HalaqaType
  primary_teacher_user_id: number | null
  schedule: ScheduleRow[]
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

const dayItems = computed(() =>
  HALAQA_DAY_ORDER.map(d => ({
    label: t(`pages.halaqat.dayLong.${HALAQA_DAY_KEYS[d]}`),
    value: d as number
  }))
)

const PRAYER_SLOTS: PrayerSlot[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
const prayerItems = computed(() => [
  { label: t('pages.halaqat.filters.all'), value: null },
  ...PRAYER_SLOTS.map(value => ({ label: t(`pages.halaqat.prayer.${value}`), value }))
])

function addScheduleRow() {
  const used = new Set(form.schedule.map(r => r.day_of_week))
  const next = HALAQA_DAY_ORDER.find(d => !used.has(d)) ?? 0
  form.schedule.push({
    day_of_week: next,
    prayer_slot: null,
    start_time: '',
    end_time: ''
  })
}

function removeScheduleRow(index: number) {
  form.schedule.splice(index, 1)
}

function validateForm(): string | null {
  if (!form.name.trim()) return t('pages.halaqat.validationName')
  if (!isEdit.value) {
    const days = form.schedule.map(r => r.day_of_week)
    if (new Set(days).size !== days.length) {
      return t('pages.halaqat.validationDays')
    }
  }
  return null
}

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
  const err = validateForm()
  if (err) {
    toast.add({ title: err, color: 'error' })
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
        <div class="space-y-2">
          <div
            v-for="(row, i) in form.schedule"
            :key="i"
            class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end"
          >
            <USelect
              v-model="row.day_of_week"
              :items="dayItems"
              value-key="value"
              :label="i === 0 ? t('pages.halaqat.scheduleDay') : undefined"
            />
            <USelect
              v-model="row.prayer_slot"
              :items="prayerItems"
              value-key="value"
              :label="i === 0 ? t('pages.halaqat.schedulePrayerSlot') : undefined"
            />
            <UInput
              v-model="row.start_time"
              type="time"
              :placeholder="t('pages.halaqat.scheduleStartTime')"
            />
            <UInput
              v-model="row.end_time"
              type="time"
              :placeholder="t('pages.halaqat.scheduleEndTime')"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              square
              :aria-label="t('common.delete')"
              @click="removeScheduleRow(i)"
            />
          </div>
          <p v-if="form.schedule.length === 0" class="text-sm text-muted">
            {{ t('pages.halaqat.scheduleNoEntries') }}
          </p>
          <UButton
            variant="soft"
            color="neutral"
            icon="i-lucide-plus"
            @click="addScheduleRow"
          >
            {{ t('pages.halaqat.scheduleAddDay') }}
          </UButton>
        </div>
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
