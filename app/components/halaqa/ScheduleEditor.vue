<script setup lang="ts">
import type { ApiScheduleEntry, PrayerSlot } from '~/types'
import {
  HALAQA_DAY_KEYS,
  HALAQA_DAY_ORDER
} from '~/utils/halaqa'
import type { ScheduleEntryPayload } from '~/composables/useHalaqat'

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
const { setSchedule } = useHalaqaSchedule()

interface Row {
  day_of_week: number
  prayer_slot: PrayerSlot | null
  start_time: string
  end_time: string
}

const rows = ref<Row[]>([])
const warnings = ref<string[]>([])
const saving = ref(false)

function fromApi(entries: ApiScheduleEntry[]): Row[] {
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

const canAddRow = computed(() => rows.value.length < HALAQA_DAY_ORDER.length)

function addRow() {
  const used = new Set(rows.value.map(r => r.day_of_week))
  const next = HALAQA_DAY_ORDER.find(d => !used.has(d))
  if (next === undefined) return
  rows.value.push({
    day_of_week: next,
    prayer_slot: null,
    start_time: '',
    end_time: ''
  })
}

function removeRow(index: number) {
  rows.value.splice(index, 1)
}

function buildPayload(): ScheduleEntryPayload[] {
  return rows.value.map(r => ({
    day_of_week: r.day_of_week,
    prayer_slot: r.prayer_slot ?? undefined,
    start_time: r.start_time ? `${r.start_time}:00` : undefined,
    end_time: r.end_time ? `${r.end_time}:00` : undefined
  }))
}

async function save() {
  const days = rows.value.map(r => r.day_of_week)
  if (new Set(days).size !== days.length) {
    toast.add({ title: t('pages.halaqat.validationDays'), color: 'error' })
    return
  }
  saving.value = true
  try {
    const result = await setSchedule(props.halaqaId, buildPayload())
    warnings.value = result.warnings ?? []
    rows.value = fromApi(result.schedule)
    toast.add({ title: t('pages.halaqat.toastUpdated'), color: 'success' })
    emit('saved', result.schedule)
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
  <div class="space-y-4">
    <div class="space-y-2">
      <div
        v-for="(row, i) in rows"
        :key="i"
        class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end"
      >
        <USelect
          v-model="row.day_of_week"
          :items="dayItems"
          value-key="value"
          :disabled="readOnly"
        />
        <USelect
          v-model="row.prayer_slot"
          :items="prayerItems"
          value-key="value"
          :disabled="readOnly"
        />
        <UInput
          v-model="row.start_time"
          type="time"
          :placeholder="t('pages.halaqat.scheduleStartTime')"
          :disabled="readOnly"
        />
        <UInput
          v-model="row.end_time"
          type="time"
          :placeholder="t('pages.halaqat.scheduleEndTime')"
          :disabled="readOnly"
        />
        <UButton
          v-if="!readOnly"
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          square
          :aria-label="t('common.delete')"
          @click="removeRow(i)"
        />
      </div>
      <p v-if="rows.length === 0" class="text-sm text-muted">
        {{ t('pages.halaqat.scheduleNoEntries') }}
      </p>
    </div>

    <div v-if="warnings.length" class="rounded-md border border-warning-200 bg-warning-50 p-3 text-sm text-warning-700 space-y-1">
      <p class="font-medium">{{ t('pages.halaqat.scheduleConflictWarnings') }}</p>
      <ul class="list-disc ms-5">
        <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
      </ul>
    </div>

    <div v-if="!readOnly" class="flex items-center justify-between">
      <UButton
        v-if="canAddRow"
        variant="soft"
        color="neutral"
        icon="i-lucide-plus"
        @click="addRow"
      >
        {{ t('pages.halaqat.scheduleAddDay') }}
      </UButton>
      <span v-else />

      <UButton :loading="saving" @click="save">
        {{ t('pages.halaqat.save') }}
      </UButton>
    </div>
  </div>
</template>
