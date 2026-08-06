<script setup lang="ts">
import { createReusableTemplate, useMediaQuery } from '@vueuse/core'
import { dateOfDayLabel } from '~/utils/plan'
import { PLAN_TRACKS } from '~/composables/useWeeklyPlan'

type TrackType = 'Hifz' | 'Near' | 'Far'

const props = defineProps<{
  day: number
  // A single track (opened from a matrix cell) — or omitted to show every track's
  // sessions for the day (opened from a day-roster card). Either way the modal
  // renders the same: a date header over one bordered section per track.
  track?: TrackType
  editable: boolean
  // 'add' appends a blank session to edit right away (the "+" affordances);
  // 'list' just opens the cell's sessions. Only meaningful for a single track.
  initialView?: 'list' | 'add'
}>()
const open = defineModel<boolean>('open', { required: true })

const { t, locale } = useI18n()
const { dateOfDay, getCells, isLoading } = useWeeklyPlan()

// Modal on desktop, bottom-sheet drawer on phones — the shared body/footer are
// defined once and reused in both shells.
const isDesktop = useMediaQuery('(min-width: 640px)')
const [DefineBody, ReuseBody] = createReusableTemplate()
const [DefineFooter, ReuseFooter] = createReusableTemplate()

const dateLabel = computed(() => dateOfDayLabel(dateOfDay(props.day), locale.value))

// Placeholder track boxes while the day-card's plan loads: an editable plan will
// surface all three tracks, a read-only one only a couple.
const skeletonCount = computed(() => (props.editable ? PLAN_TRACKS.length : 2))

// One track when opened from a matrix cell; every track when opened from a day
// card. An editable plan surfaces all tracks (so an empty one can be filled); a
// read-only plan only shows the tracks that actually carry sessions.
const tracks = computed<TrackType[]>(() => {
  if (props.track) return [props.track]
  return props.editable ? [...PLAN_TRACKS] : PLAN_TRACKS.filter(track => getCells(props.day, track).length > 0)
})
</script>

<template>
  <DefineBody>
    <div class="space-y-5">
      <span class="block text-sm font-medium">{{ dateLabel }}</span>

      <!-- Day-card entry point may still be fetching the student's plan: skeleton
           mirrors the real layout — one bordered box per track, each with a track
           badge over a session row — so nothing shifts when the data lands. -->
      <div v-if="!track && isLoading" class="space-y-4">
        <div
          v-for="n in skeletonCount"
          :key="n"
          class="rounded-xl border border-default p-4 space-y-3"
        >
          <USkeleton class="h-5 w-16 rounded-full" />
          <div class="rounded-xl border border-default bg-elevated p-3 space-y-2.5">
            <div class="flex items-center justify-between gap-2">
              <USkeleton class="h-4 w-32 rounded" />
              <USkeleton class="h-5 w-14 rounded-full" />
            </div>
            <USkeleton class="h-3 w-24 rounded" />
            <USkeleton class="h-8 w-full rounded-md" />
          </div>
        </div>
      </div>

      <p v-else-if="!tracks.length" class="text-sm text-muted text-center py-6">
        {{ t('pages.planner.cellDialog.empty') }}
      </p>

      <div v-else class="space-y-4">
        <div
          v-for="tk in tracks"
          :key="tk"
          class="rounded-xl border border-default p-4"
        >
          <PlannerCellSessions
            :day="day"
            :track="tk"
            :editable="editable"
            :initial-view="track ? initialView : undefined"
            @close="open = false"
          />
        </div>
      </div>
    </div>
  </DefineBody>

  <DefineFooter>
    <div class="flex justify-end w-full">
      <UButton variant="soft" color="neutral" @click="open = false">
        {{ t('common.close') }}
      </UButton>
    </div>
  </DefineFooter>

  <UModal
    v-if="isDesktop"
    v-model:open="open"
    :title="t('pages.planner.cellDialog.title')"
    :ui="{ content: 'sm:max-w-xl rounded-2xl' }"
  >
    <template #body>
      <ReuseBody />
    </template>
    <template #footer>
      <ReuseFooter />
    </template>
  </UModal>

  <UDrawer
    v-else
    v-model:open="open"
    :title="t('pages.planner.cellDialog.title')"
    :ui="{ content: 'rounded-t-3xl overflow-hidden', container: 'max-h-[90vh]' }"
  >
    <template #body>
      <ReuseBody />
    </template>
    <template #footer>
      <ReuseFooter />
    </template>
  </UDrawer>
</template>
