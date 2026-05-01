<script setup lang="ts">
import type { DayData } from '~/types'

const props = defineProps<{
  data: DayData
  weekStart: Date
  dayIndex: number
}>()

const emit = defineEmits<{
  requestCopyDay: [dayId: string]
}>()

const { isEditMode, isRestDay, toggleRestDay } = useSchedule()
const { t } = useI18n()

const dayDate = computed(() => {
  const d = new Date(props.weekStart)
  d.setDate(d.getDate() + props.dayIndex)
  d.setHours(0, 0, 0, 0)
  return d
})

const isToday = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return dayDate.value.getTime() === today.getTime()
})

const restDay = computed(() => isRestDay(props.data.id))
</script>

<template>
  <div
    class="rounded-xl px-4 py-4 flex items-start gap-4 border transition-all relative"
    :class="[
      restDay
        ? 'border-track-far/30 bg-track-far-bg/30'
        : isToday
          ? 'border-primary/30 bg-primary-container/40'
          : 'border-dotted border-outline-variant/50 bg-transparent'
    ]"
  >
    <!-- Day info column -->
    <div class="w-[150px] shrink-0 flex flex-col gap-2 self-start border-e border-dotted border-outline-variant/50 pe-4">
      <div class="flex items-baseline gap-2">
        <h3
          class="font-bold text-lg leading-tight"
          :class="isToday ? 'text-primary' : 'text-on-surface'"
        >
          {{ data.day }}
        </h3>
        <span
          v-if="isToday"
          class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-primary text-on-primary"
        >
          {{ $t('pages.planner.weekList.today') }}
        </span>
      </div>

      <!-- Rest day toggle (edit mode) -->
      <label
        v-if="isEditMode"
        class="flex items-center gap-2 mt-1 cursor-pointer select-none"
      >
        <USwitch
          :model-value="restDay"
          @update:model-value="toggleRestDay(data.id)"
        />
        <span
          class="text-xs font-semibold"
          :class="restDay ? 'text-track-far' : 'text-on-surface-variant'"
        >
          {{ $t('pages.planner.row.restDay') }}
        </span>
      </label>

      <!-- Rest day badge (view mode) -->
      <span
        v-else-if="restDay"
        class="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-track-far-bg text-track-far self-start"
      >
        <UIcon name="i-lucide-coffee" class="w-3 h-3" />
        {{ $t('pages.planner.row.restDayActive') }}
      </span>

      <!-- Copy-day-down action -->
      <UButton
        v-if="isEditMode && !restDay"
        variant="ghost"
        color="neutral"
        size="xs"
        icon="i-lucide-copy"
        class="rounded-full px-2 self-start text-on-surface-variant hover:text-primary hover:bg-primary/5"
        :aria-label="$t('pages.planner.row.copyToAllDays')"
        @click="emit('requestCopyDay', data.id)"
      >
        <span class="text-[11px]">{{ $t('pages.planner.row.copyToAllDays') }}</span>
      </UButton>
    </div>

    <!-- Three lesson columns -->
    <div class="flex-1 flex gap-6 relative">
      <PlannerDayColumn
        :items="data.lessons.mem"
        :day-id="data.id"
        category="mem"
        :is-edit-mode="isEditMode"
        :is-rest-day="restDay"
      />
      <PlannerDayColumn
        :items="data.lessons.near"
        :day-id="data.id"
        category="near"
        :is-edit-mode="isEditMode"
        :is-rest-day="restDay"
      />
      <PlannerDayColumn
        :items="data.lessons.far"
        :day-id="data.id"
        category="far"
        :is-edit-mode="isEditMode"
        :is-rest-day="restDay"
      />

      <!-- Rest day overlay -->
      <div
        v-if="restDay"
        class="absolute inset-0 flex items-center justify-center rounded-xl bg-track-far-bg/85 backdrop-blur-[2px] pointer-events-none border border-track-far/20"
      >
        <span class="text-base font-bold text-track-far flex items-center gap-2">
          <UIcon name="i-lucide-coffee" class="w-5 h-5" />
          {{ $t('pages.planner.row.restDayActive') }}
        </span>
      </div>
    </div>
  </div>
</template>
