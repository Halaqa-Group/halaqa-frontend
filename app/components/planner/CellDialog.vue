<script setup lang="ts">
import { dateOfDayLabel } from '~/utils/plan'

type TrackType = 'Hifz' | 'Near' | 'Far'

const props = defineProps<{
  day: number
  track: TrackType
  editable: boolean
  // 'add' appends a blank session to edit right away (the "+" affordances);
  // 'list' just opens the cell's sessions.
  initialView?: 'list' | 'add'
}>()
const open = defineModel<boolean>('open', { required: true })

const { t, locale } = useI18n()
const { dateOfDay } = useWeeklyPlan()

const dateLabel = computed(() => dateOfDayLabel(dateOfDay(props.day), locale.value))
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('pages.planner.cellDialog.title')"
    :ui="{ content: 'sm:max-w-xl rounded-2xl' }"
  >
    <template #body>
      <div class="space-y-5">
        <span class="text-sm font-medium">{{ dateLabel }}</span>
        <PlannerCellSessions
          :day="day"
          :track="track"
          :editable="editable"
          :initial-view="initialView"
          @close="open = false"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton variant="soft" color="neutral" @click="open = false">
          {{ t('common.close') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
