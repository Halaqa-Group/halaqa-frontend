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

// ── Quick fill: set common prayer/time values once, push to all selected days
const quickFill = reactive<{
  prayer_slot: PrayerSlot | null
  start_time: string
  end_time: string
}>({
  prayer_slot: null,
  start_time: '',
  end_time: ''
})

const hasQuickFillValues = computed(() =>
  quickFill.prayer_slot !== null
  || quickFill.start_time !== ''
  || quickFill.end_time !== ''
)

function applyQuickFill() {
  if (props.readOnly || !hasQuickFillValues.value) return
  model.value = model.value.map(r => ({
    day_of_week: r.day_of_week,
    prayer_slot: quickFill.prayer_slot,
    start_time: quickFill.start_time,
    end_time: quickFill.end_time
  }))
}

// ── Quick day-set presets (Arab school week is Sat → Wed)
const SCHOOL_DAYS = [0, 1, 2, 3, 4] // Sat, Sun, Mon, Tue, Wed

function selectSchoolDays() {
  if (props.readOnly) return
  const existing = new Map(model.value.map(r => [r.day_of_week, r]))
  model.value = SCHOOL_DAYS.map(day =>
    existing.get(day)
    ?? { day_of_week: day, prayer_slot: null, start_time: '', end_time: '' }
  )
}

function clearAllDays() {
  if (props.readOnly) return
  model.value = []
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

    <!-- Quick actions: presets + bulk-fill, only visible when editing -->
    <div
      v-if="!readOnly"
      class="rounded-lg border border-dashed border-default bg-elevated/40 p-3 space-y-3"
    >
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-1.5 text-xs font-medium text-muted">
          <UIcon name="i-lucide-zap" class="size-3.5" />
          {{ t('pages.halaqat.scheduleQuickActions') }}
        </div>
        <div class="flex items-center gap-1">
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-calendar-check"
            @click="selectSchoolDays"
          >
            {{ t('pages.halaqat.scheduleSelectSchoolDays') }}
          </UButton>
          <UButton
            v-if="orderedRows.length > 0"
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-eraser"
            @click="clearAllDays"
          >
            {{ t('pages.halaqat.scheduleClearDays') }}
          </UButton>
        </div>
      </div>

      <div
        v-if="orderedRows.length > 1"
        class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
      >
        <USelect
          v-model="quickFill.prayer_slot"
          :items="prayerItems"
          value-key="value"
          :placeholder="t('pages.halaqat.schedulePrayerSlot')"
        />
        <UInput
          v-model="quickFill.start_time"
          type="time"
          :placeholder="t('pages.halaqat.scheduleStartTime')"
        />
        <UInput
          v-model="quickFill.end_time"
          type="time"
          :placeholder="t('pages.halaqat.scheduleEndTime')"
        />
        <UButton
          variant="soft"
          color="primary"
          icon="i-lucide-wand-sparkles"
          :disabled="!hasQuickFillValues"
          @click="applyQuickFill"
        >
          {{ t('pages.halaqat.scheduleApplyToAll') }}
        </UButton>
      </div>
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
