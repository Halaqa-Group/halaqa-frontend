<script setup lang="ts">
import type { ApiScheduleEntry } from '~/types'
import type { ScheduleEntryPayload } from '~/composables/useHalaqat'
import HalaqaScheduleDays, { type ScheduleDayRow } from '~/components/halaqa/ScheduleDays.vue'

const props = defineProps<{
  halaqaId: number
  initial: ApiScheduleEntry[]
  readOnly?: boolean
}>()

const emit = defineEmits<{
  saved: [schedule: ApiScheduleEntry[]]
}>()

const { t } = useI18n()
const toast = useToast()
const apiError = useApiError()
const { setSchedule } = useHalaqaSchedule()

const rows = ref<ScheduleDayRow[]>([])
const warnings = ref<string[]>([])
const saving = ref(false)

function fromApi(entries: ApiScheduleEntry[]): ScheduleDayRow[] {
  return entries
    .slice()
    .sort((a, b) => a.day_of_week - b.day_of_week)
    .map(e => ({
      day_of_week: e.day_of_week,
      prayer_slot: e.prayer_slot,
      start_time: e.start_time ? e.start_time.slice(0, 5) : '',
      end_time: e.end_time ? e.end_time.slice(0, 5) : ''
    }))
}

watch(() => props.initial, (next) => {
  rows.value = fromApi(next)
}, { immediate: true })

function buildPayload(): ScheduleEntryPayload[] {
  return rows.value.map(r => ({
    day_of_week: r.day_of_week,
    prayer_slot: r.prayer_slot ?? undefined,
    start_time: r.start_time ? `${r.start_time}:00` : undefined,
    end_time: r.end_time ? `${r.end_time}:00` : undefined
  }))
}

async function save() {
  saving.value = true
  try {
    const result = await setSchedule(props.halaqaId, buildPayload())
    warnings.value = result.warnings ?? []
    rows.value = fromApi(result.schedule)
    toast.add({ title: t('pages.halaqat.toastUpdated'), color: 'success' })
    emit('saved', result.schedule)
  } catch (e: unknown) {
    toast.add({
      title: apiError.format(e, t('pages.halaqat.toastError')),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <HalaqaScheduleDays v-model="rows" :read-only="readOnly" />

    <div
      v-if="warnings.length"
      class="rounded-md border border-warning-200 bg-warning-50 p-3 text-sm text-warning-700 space-y-1"
    >
      <p class="font-medium">{{ t('pages.halaqat.scheduleConflictWarnings') }}</p>
      <ul class="list-disc ms-5">
        <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
      </ul>
    </div>

    <div v-if="!readOnly" class="flex justify-end">
      <UButton :loading="saving" @click="save">
        {{ t('pages.halaqat.save') }}
      </UButton>
    </div>
  </div>
</template>
