<script setup lang="ts">
import { dateOfDayLabel } from '~/utils/plan'
import { PLAN_TRACKS } from '~/composables/useWeeklyPlan'

type TrackType = 'Hifz' | 'Near' | 'Far'

const props = defineProps<{
  day: number
  editable: boolean
}>()
const open = defineModel<boolean>('open', { required: true })

const { t, locale } = useI18n()
const { dateOfDay, getCells, isLoading } = useWeeklyPlan()

const dateLabel = computed(() => dateOfDayLabel(dateOfDay(props.day), locale.value))

// Editable plans expose every track so a teacher can add to an empty one; a
// read-only (approved) plan only surfaces the tracks that actually carry sessions.
const visibleTracks = computed<TrackType[]>(() =>
  props.editable ? PLAN_TRACKS : PLAN_TRACKS.filter(track => getCells(props.day, track).length > 0)
)
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

        <div v-if="isLoading" class="flex justify-center py-10">
          <UIcon name="i-lucide-loader-circle" class="w-7 h-7 animate-spin text-primary" />
        </div>

        <p v-else-if="!visibleTracks.length" class="text-sm text-muted text-center py-6">
          {{ t('pages.planner.cellDialog.empty') }}
        </p>

        <div v-else class="space-y-4">
          <div
            v-for="track in visibleTracks"
            :key="track"
            class="rounded-xl border border-default p-4"
          >
            <PlannerCellSessions
              :day="day"
              :track="track"
              :editable="editable"
              @close="open = false"
            />
          </div>
        </div>
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
