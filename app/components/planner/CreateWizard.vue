<script setup lang="ts">
/**
 * Plan creation wizard. Configure each of the three tracks once (start ayah,
 * daily amount, and unit) and generate the whole week into the editable matrix
 * in one step — the PDF's "one dialog, choose per track, then schedule the week".
 */
import { expandPlan, type PlanUnit } from '~/utils/quran-structure'
import { TRACK_ICON, type AchievementTrack } from '~/utils/achievement'
import { PLAN_TRACKS } from '~/composables/useWeeklyPlan'

type TrackType = 'Hifz' | 'Near' | 'Far'

const { t } = useI18n()
const toast = useToast()
const { wizardOpen, activeDays, applyTrackGeneration } = useWeeklyPlan()
const { boundariesFor, unitAvailable } = useQuranStructure()

const UNITS: PlanUnit[] = ['page', 'juz', 'hizb', 'quarter', 'surah']

interface TrackConfig {
  enabled: boolean
  surah: number
  verse: number
  amount: number
  unit: PlanUnit
}
function defaults(enabled: boolean): TrackConfig {
  return { enabled, surah: 1, verse: 1, amount: 1, unit: 'page' }
}
const config = reactive<Record<TrackType, TrackConfig>>({
  Hifz: defaults(true),
  Near: defaults(false),
  Far: defaults(false)
})

// Reset to defaults each time the wizard opens.
watch(wizardOpen, (v) => {
  if (v) {
    Object.assign(config.Hifz, defaults(true))
    Object.assign(config.Near, defaults(false))
    Object.assign(config.Far, defaults(false))
  }
})

const amountItems = [
  { label: '1', value: 1 },
  { label: '2', value: 2 }
]
const unitItems = computed(() =>
  UNITS.map(u => ({
    label: t(`pages.planner.units.${u}`),
    value: u,
    disabled: !unitAvailable(u)
  }))
)

const dayCount = computed(() => activeDays.value.length)
const anyEnabled = computed(() => PLAN_TRACKS.some(tk => config[tk as TrackType].enabled))

function generate() {
  if (!anyEnabled.value) {
    toast.add({ title: t('pages.planner.wizard.noTrack'), color: 'warning' })
    return
  }
  const days = dayCount.value
  let generatedAny = false
  for (const track of PLAN_TRACKS as TrackType[]) {
    const cfg = config[track]
    if (!cfg.enabled) continue
    const boundaries = boundariesFor(cfg.unit)
    if (!boundaries.length) continue
    const ranges = expandPlan(`${cfg.surah}:${cfg.verse}`, cfg.amount, boundaries, days)
    applyTrackGeneration(track, ranges)
    generatedAny = true
  }
  if (!generatedAny) {
    toast.add({ title: t('pages.planner.wizard.noData'), color: 'warning' })
    return
  }
  wizardOpen.value = false
  toast.add({ title: t('pages.planner.wizard.generatedToast'), color: 'success' })
}
</script>

<template>
  <UModal
    v-model:open="wizardOpen"
    :title="t('pages.planner.wizard.title')"
    :description="t('pages.planner.wizard.subtitle')"
    :ui="{ content: 'sm:max-w-2xl rounded-2xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <section
          v-for="track in (PLAN_TRACKS as TrackType[])"
          :key="track"
          class="rounded-xl border border-default overflow-hidden"
          :class="config[track].enabled ? 'bg-default' : 'bg-elevated'"
        >
          <!-- Track header + enable -->
          <div class="flex items-center justify-between gap-2 px-4 py-3">
            <span class="inline-flex items-center gap-2 font-semibold">
              <UIcon :name="TRACK_ICON[track as AchievementTrack]" class="w-5 h-5 text-primary" />
              {{ t(`pages.achievements.tracks.${track}`) }}
            </span>
            <USwitch v-model="config[track].enabled" />
          </div>

          <!-- Config (collapses when disabled) -->
          <div v-if="config[track].enabled" class="px-4 pb-4 space-y-4 border-t border-default pt-4">
            <UFormField :label="t('pages.planner.wizard.startAyah')">
              <PlannerAyahSelect v-model:surah="config[track].surah" v-model:verse="config[track].verse" />
            </UFormField>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField :label="t('pages.planner.wizard.dailyAmount')">
                <USelect v-model="config[track].amount" :items="amountItems" value-key="value" class="w-full" />
              </UFormField>
              <UFormField :label="t('pages.planner.wizard.unit')">
                <USelect v-model="config[track].unit" :items="unitItems" value-key="value" class="w-full" />
              </UFormField>
            </div>
          </div>
        </section>

        <p class="text-xs text-muted text-center">
          {{ t('pages.planner.wizard.willSchedule', { days: dayCount }) }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton variant="soft" color="neutral" @click="wizardOpen = false">
          {{ t('common.cancel') }}
        </UButton>
        <UButton icon="i-lucide-wand-sparkles" :disabled="!anyEnabled" @click="generate">
          {{ t('pages.planner.wizard.generate') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
