<script setup lang="ts">
import type { PrayerSlot } from '~/types'
import {
  HALAQA_DAY_KEYS,
  HALAQA_DAY_ORDER
} from '~/utils/halaqa'

export interface ScheduleDayRow {
  day_of_week: number
  prayer_slot: PrayerSlot | null
  start_time: string
  end_time: string
}

const model = defineModel<ScheduleDayRow[]>({ required: true })

const props = defineProps<{
  readOnly?: boolean
}>()

const { t } = useI18n()

const PRAYER_SLOTS: PrayerSlot[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
const prayerItems = computed(() => [
  { label: t('pages.halaqat.filters.all'), value: null },
  ...PRAYER_SLOTS.map(value => ({ label: t(`pages.halaqat.prayer.${value}`), value }))
])

const selectedDays = computed(() => new Set(model.value.map(r => r.day_of_week)))

const orderedRows = computed(() =>
  [...model.value].sort((a, b) => a.day_of_week - b.day_of_week)
)

function isSelected(day: number) {
  return selectedDays.value.has(day)
}

function toggleDay(day: number) {
  if (props.readOnly) return
  if (selectedDays.value.has(day)) {
    model.value = model.value.filter(r => r.day_of_week !== day)
  } else {
    model.value = [
      ...model.value,
      { day_of_week: day, prayer_slot: null, start_time: '', end_time: '' }
    ]
  }
}

function updateRow(day: number, patch: Partial<ScheduleDayRow>) {
  model.value = model.value.map(r =>
    r.day_of_week === day ? { ...r, ...patch } : r
  )
}

function removeRow(day: number) {
  if (props.readOnly) return
  model.value = model.value.filter(r => r.day_of_week !== day)
}

function dayLabel(day: number) {
  const key = HALAQA_DAY_KEYS[day]
  return key ? t(`pages.halaqat.dayLong.${key}`) : ''
}
</script>

<template>
  <div class="space-y-4">
    <!-- Day toggle row -->
    <div class="flex flex-wrap gap-2">
      <UButton
        v-for="d in HALAQA_DAY_ORDER"
        :key="d"
        size="sm"
        type="button"
        :variant="isSelected(d) ? 'solid' : 'outline'"
        :color="isSelected(d) ? 'primary' : 'neutral'"
        :disabled="readOnly"
        @click="toggleDay(d)"
      >
        {{ t(`pages.halaqat.dayLong.${HALAQA_DAY_KEYS[d]}`) }}
      </UButton>
    </div>

    <!-- Per-day cards -->
    <div v-if="orderedRows.length === 0" class="text-sm text-muted">
      {{ t('pages.halaqat.scheduleNoEntries') }}
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="row in orderedRows"
        :key="row.day_of_week"
        class="rounded-lg border border-default bg-elevated p-3"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium">{{ dayLabel(row.day_of_week) }}</span>
          <UButton
            v-if="!readOnly"
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            :aria-label="t('common.delete')"
            @click="removeRow(row.day_of_week)"
          />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <USelect
            :model-value="row.prayer_slot"
            :items="prayerItems"
            value-key="value"
            :placeholder="t('pages.halaqat.schedulePrayerSlot')"
            :disabled="readOnly"
            @update:model-value="updateRow(row.day_of_week, { prayer_slot: $event })"
          />
          <UInput
            :model-value="row.start_time"
            type="time"
            :placeholder="t('pages.halaqat.scheduleStartTime')"
            :disabled="readOnly"
            @update:model-value="updateRow(row.day_of_week, { start_time: String($event) })"
          />
          <UInput
            :model-value="row.end_time"
            type="time"
            :placeholder="t('pages.halaqat.scheduleEndTime')"
            :disabled="readOnly"
            @update:model-value="updateRow(row.day_of_week, { end_time: String($event) })"
          />
        </div>
      </div>
    </div>
  </div>
</template>
