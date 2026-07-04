<script setup lang="ts">
import { expandPlan, type PlanUnit } from '~/utils/quran-structure'
import { TRACK_ICON, type AchievementTrack } from '~/utils/achievement'
import { PLAN_TRACKS, type CreatePlanItemDto } from '~/composables/useWeeklyPlan'

type TrackType = 'Hifz' | 'Near' | 'Far'
type Target = 'this' | 'all' | 'selected'
type Policy = 'skip' | 'replace'

const { t } = useI18n()
const toast = useToast()
const {
  wizardOpen, activeDays, applyTrackGeneration,
  students, selectedStudentId, applyPlanToStudents, isSaving
} = useWeeklyPlan()
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

const target = ref<Target>('this')
const targetStudentIds = ref<number[]>([])
const policy = ref<Policy>('skip')

const studentItems = computed(() => students.value.map(s => ({ label: s.name, value: s.id })))
const targetOptions = computed(() => [
  { value: 'this' as Target, label: t('pages.planner.wizard.target.this') },
  { value: 'all' as Target, label: t('pages.planner.wizard.target.all') },
  { value: 'selected' as Target, label: t('pages.planner.wizard.target.selected') }
])
const policyOptions = computed(() => [
  { value: 'skip' as Policy, label: t('pages.planner.wizard.conflict.skip') },
  { value: 'replace' as Policy, label: t('pages.planner.wizard.conflict.replace') }
])

const resolvedStudentIds = computed<number[]>(() => {
  if (target.value === 'this') return selectedStudentId.value ? [selectedStudentId.value] : []
  if (target.value === 'all') return students.value.map(s => s.id)
  return targetStudentIds.value
})

watch(wizardOpen, (v) => {
  if (v) {
    Object.assign(config.Hifz, defaults(true))
    Object.assign(config.Near, defaults(false))
    Object.assign(config.Far, defaults(false))
    target.value = 'this'
    targetStudentIds.value = []
    policy.value = 'skip'
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
const isMulti = computed(() => target.value !== 'this')

const canSubmit = computed(() => anyEnabled.value && resolvedStudentIds.value.length > 0)
const submitLabel = computed(() =>
  isMulti.value
    ? t('pages.planner.wizard.applyToN', { count: resolvedStudentIds.value.length })
    : t('pages.planner.wizard.generate')
)

function buildItems(): CreatePlanItemDto[] {
  const days = activeDays.value
  const items: CreatePlanItemDto[] = []
  for (const track of PLAN_TRACKS as TrackType[]) {
    const cfg = config[track]
    if (!cfg.enabled) continue
    const boundaries = boundariesFor(cfg.unit)
    if (!boundaries.length) continue
    const ranges = expandPlan(`${cfg.surah}:${cfg.verse}`, cfg.amount, boundaries, days.length)
    ranges.forEach((r, i) => {
      const day = days[i]
      if (day === undefined) return
      items.push({
        day_of_week: day,
        track_type: track,
        start_surah: r.start_surah,
        start_verse: r.start_verse,
        end_surah: r.end_surah,
        end_verse: r.end_verse
      })
    })
  }
  return items
}

async function submit() {
  if (!anyEnabled.value) {
    toast.add({ title: t('pages.planner.wizard.noTrack'), color: 'warning' })
    return
  }

  if (!isMulti.value) {
    if (!selectedStudentId.value) {
      toast.add({ title: t('pages.planner.selectStudent'), color: 'warning' })
      return
    }
    let generatedAny = false
    for (const track of PLAN_TRACKS as TrackType[]) {
      const cfg = config[track]
      if (!cfg.enabled) continue
      const boundaries = boundariesFor(cfg.unit)
      if (!boundaries.length) continue
      const ranges = expandPlan(`${cfg.surah}:${cfg.verse}`, cfg.amount, boundaries, dayCount.value)
      applyTrackGeneration(track, ranges)
      generatedAny = true
    }
    if (!generatedAny) {
      toast.add({ title: t('pages.planner.wizard.noData'), color: 'warning' })
      return
    }
    wizardOpen.value = false
    toast.add({ title: t('pages.planner.wizard.generatedToast'), color: 'success' })
    return
  }

  const ids = resolvedStudentIds.value
  if (ids.length === 0) {
    toast.add({ title: t('pages.planner.wizard.noStudents'), color: 'warning' })
    return
  }
  const items = buildItems()
  if (items.length === 0) {
    toast.add({ title: t('pages.planner.wizard.noData'), color: 'warning' })
    return
  }
  try {
    const res = await applyPlanToStudents(items, ids, policy.value)
    wizardOpen.value = false
    toast.add({
      title: t('pages.planner.wizard.applyResult', {
        created: res.created, skipped: res.skipped, replaced: res.replaced, failed: res.failed
      }),
      color: res.failed > 0 ? 'warning' : 'success'
    })
  } catch (e: any) {
    toast.add({ title: t('pages.planner.saveErrorTitle'), description: e?.data?.message || e?.message, color: 'error' })
  }
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
        <div class="rounded-xl border border-default p-4 space-y-3">
          <UFormField :label="t('pages.planner.wizard.target.label')">
            <div class="flex gap-1 rounded-md border border-default p-0.5">
              <UButton
                v-for="opt in targetOptions"
                :key="opt.value"
                :variant="target === opt.value ? 'soft' : 'ghost'"
                color="primary"
                size="sm"
                class="flex-1 justify-center"
                @click="target = opt.value"
              >
                {{ opt.label }}
              </UButton>
            </div>
          </UFormField>

          <UFormField v-if="target === 'selected'" :label="t('pages.planner.wizard.pickStudents')">
            <USelectMenu
              v-model="targetStudentIds"
              :items="studentItems"
              value-key="value"
              multiple
              searchable
              :placeholder="t('pages.planner.wizard.pickStudents')"
              class="w-full"
            />
          </UFormField>

          <UFormField v-if="isMulti" :label="t('pages.planner.wizard.conflict.label')">
            <div class="flex gap-1 rounded-md border border-default p-0.5">
              <UButton
                v-for="opt in policyOptions"
                :key="opt.value"
                :variant="policy === opt.value ? 'soft' : 'ghost'"
                :color="opt.value === 'replace' ? 'warning' : 'primary'"
                size="sm"
                class="flex-1 justify-center"
                @click="policy = opt.value"
              >
                {{ opt.label }}
              </UButton>
            </div>
          </UFormField>
        </div>

        <section
          v-for="track in (PLAN_TRACKS as TrackType[])"
          :key="track"
          class="rounded-xl border border-default overflow-hidden"
          :class="config[track].enabled ? 'bg-default' : 'bg-elevated'"
        >
          <div class="flex items-center justify-between gap-2 px-4 py-3">
            <span class="inline-flex items-center gap-2 font-semibold">
              <UIcon :name="TRACK_ICON[track as AchievementTrack]" class="w-5 h-5 text-primary" />
              {{ t(`pages.achievements.tracks.${track}`) }}
            </span>
            <USwitch v-model="config[track].enabled" />
          </div>

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
        <UButton variant="soft" color="neutral" :disabled="isSaving" @click="wizardOpen = false">
          {{ t('common.cancel') }}
        </UButton>
        <UButton icon="i-lucide-wand-sparkles" :disabled="!canSubmit || isSaving" :loading="isSaving" @click="submit">
          {{ submitLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
