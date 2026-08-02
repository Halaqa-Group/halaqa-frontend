<script setup lang="ts">
import { expandPlan, UNIT_TOTALS, type PlanUnit, type PlanDirection, type VerseRange } from '~/utils/quran-structure'
import { TRACK_ICON, type AchievementTrack } from '~/utils/achievement'
import { PLAN_TRACKS, type CreatePlanItemDto } from '~/composables/useWeeklyPlan'
import { defaultSessionRange } from '~/utils/plan'
import { SURAH_NAMES } from '~/data/constants'

type TrackType = 'Hifz' | 'Near' | 'Far'
type Target = 'this' | 'all' | 'selected'
type Policy = 'skip' | 'replace'

const { t } = useI18n()
const toast = useToast()
const apiError = useApiError()
const {
  wizardOpen, activeDays, applyTrackGeneration,
  students, selectedStudentId, selectedStudentDirection, applyPlanToStudents, isSaving
} = useWeeklyPlan()
const { boundariesFor, unitAvailable } = useQuranStructure()

const UNITS: PlanUnit[] = ['page', 'juz', 'hizb', 'quarter', 'surah']

interface TrackConfig {
  enabled: boolean
  surah: number
  verse: number
  amount: number
  unit: PlanUnit
  direction: PlanDirection
}
// Memorization opens on the student's own `memorization_direction`: `desc` (the API
// default, عكس اتجاه المصحف) anchors at the first ayah of An-Nas and walks surahs
// downwards reading each forwards; `asc` anchors at Al-Fatihah. Only the Hifz track
// exposes the switch — a review track (قريبة/بعيدة) always walks with the mushaf.
function defaults(enabled: boolean, direction: PlanDirection = 'asc'): TrackConfig {
  const range = defaultSessionRange(direction)
  return { enabled, surah: range.start_surah, verse: range.start_verse, amount: 1, unit: 'page', direction }
}
const config = reactive<Record<TrackType, TrackConfig>>({
  Hifz: defaults(true, selectedStudentDirection.value),
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
    // Re-seeded on every open: the direction belongs to the student who's selected
    // now, not whoever was selected the last time the wizard ran.
    Object.assign(config.Hifz, defaults(true, selectedStudentDirection.value))
    Object.assign(config.Near, defaults(false))
    Object.assign(config.Far, defaults(false))
    target.value = 'this'
    targetStudentIds.value = []
    policy.value = 'skip'
  }
})

function unitMax(unit: PlanUnit): number {
  return UNIT_TOTALS[unit]
}

const MIN_BOUNDARY_RATIO = 0.9
function boundariesReady(unit: PlanUnit): boolean {
  return boundariesFor(unit).length >= Math.floor(UNIT_TOTALS[unit] * MIN_BOUNDARY_RATIO)
}

watch(config, () => {
  for (const track of PLAN_TRACKS as TrackType[]) {
    const cfg = config[track]
    const max = unitMax(cfg.unit)
    if (!Number.isFinite(cfg.amount) || cfg.amount < 1) cfg.amount = 1
    else if (cfg.amount > max) cfg.amount = max
  }
}, { deep: true })

const unitItems = computed(() =>
  UNITS.map(u => ({
    label: t(`pages.planner.units.${u}`),
    value: u,
    disabled: !unitAvailable(u)
  }))
)

// Direction belongs to memorization only — a review track just sweeps the mushaf
// forwards by the chosen unit. Either way a day carries its full مقدار in one session,
// reading straight through ختام السورة into the surah after it.
function expandFor(track: TrackType, cfg: TrackConfig, days: number): VerseRange[][] {
  if (!boundariesReady(cfg.unit)) return []
  return expandPlan(`${cfg.surah}:${cfg.verse}`, cfg.amount, boundariesFor(cfg.unit), days, {
    direction: track === 'Hifz' ? cfg.direction : 'asc'
  })
}

function setDirection(track: TrackType, dir: PlanDirection) {
  const cfg = config[track]
  if (cfg.direction === dir) return
  cfg.direction = dir
  // Both directions read each surah forwards, so the anchor is always its first
  // ayah — عكس اتجاه المصحف only changes which surah comes next, not the reading order.
  cfg.verse = 1
}

function surahName(n: number): string | undefined {
  return SURAH_NAMES[n]
}

function directionOptions(cfg: TrackConfig) {
  return [
    { value: 'asc' as PlanDirection, from: surahName(cfg.surah), to: surahName(cfg.surah + 1), label: t('pages.planner.wizard.direction.asc') },
    { value: 'desc' as PlanDirection, from: surahName(cfg.surah), to: surahName(cfg.surah - 1), label: t('pages.planner.wizard.direction.desc') }
  ]
}

function ayahLabel(surah: number, verse: number): string {
  return `${surahName(surah) ?? surah} ${verse}`
}

// What the teacher sees before approving: the exact span the generated week will
// cover. Every day is read forwards now — even عكس اتجاه المصحف — so the span runs
// from the first day's opening ayah to the last day's closing ayah.
const previews = computed(() => {
  const out: Partial<Record<TrackType, { from: string, to: string, days: number }>> = {}
  for (const track of PLAN_TRACKS as TrackType[]) {
    const cfg = config[track]
    if (!cfg.enabled) continue
    const days = expandFor(track, cfg, activeDays.value.length)
    const firstDay = days[0]
    const lastDay = days[days.length - 1]
    const first = firstDay?.[0]
    const last = lastDay?.[lastDay.length - 1]
    if (!first || !last) continue
    out[track] = { from: ayahLabel(first.start_surah, first.start_verse), to: ayahLabel(last.end_surah, last.end_verse), days: days.length }
  }
  return out
})

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
    const plan = expandFor(track, cfg, days.length)
    plan.forEach((ranges, i) => {
      const day = days[i]
      if (day === undefined) return
      // A straddling عكس اتجاه المصحف day becomes several same-day sessions, ordered
      // as the mushaf reads them.
      ranges.forEach((r, order) => {
        items.push({
          day_of_week: day,
          track_type: track,
          order,
          start_surah: r.start_surah,
          start_verse: r.start_verse,
          end_surah: r.end_surah,
          end_verse: r.end_verse
        })
      })
    })
  }
  return items
}

async function submit() {
  if (!anyEnabled.value) {
    toast.add({ description: t('pages.planner.wizard.noTrack'), color: 'warning' })
    return
  }

  if (!isMulti.value) {
    if (!selectedStudentId.value) {
      toast.add({ description: t('pages.planner.selectStudent'), color: 'warning' })
      return
    }
    let generatedAny = false
    let incomplete = false
    for (const track of PLAN_TRACKS as TrackType[]) {
      const cfg = config[track]
      if (!cfg.enabled) continue
      if (!boundariesReady(cfg.unit)) {
        incomplete = true
        continue
      }
      applyTrackGeneration(track, expandFor(track, cfg, dayCount.value))
      generatedAny = true
    }
    if (!generatedAny) {
      toast.add({
        description: incomplete ? t('pages.planner.wizard.assetsIncomplete') : t('pages.planner.wizard.noData'),
        color: 'warning'
      })
      return
    }
    wizardOpen.value = false
    toast.add({ description: t('pages.planner.wizard.generatedToast'), color: 'success' })
    return
  }

  const ids = resolvedStudentIds.value
  if (ids.length === 0) {
    toast.add({ description: t('pages.planner.wizard.noStudents'), color: 'warning' })
    return
  }
  const items = buildItems()
  if (items.length === 0) {
    const incomplete = (PLAN_TRACKS as TrackType[]).some(tk => config[tk].enabled && !boundariesReady(config[tk].unit))
    toast.add({
      description: incomplete ? t('pages.planner.wizard.assetsIncomplete') : t('pages.planner.wizard.noData'),
      color: 'warning'
    })
    return
  }
  try {
    const res = await applyPlanToStudents(items, ids, policy.value)
    wizardOpen.value = false
    toast.add({
      description: t('pages.planner.wizard.applyResult', {
        created: res.created, skipped: res.skipped, replaced: res.replaced, failed: res.failed
      }),
      color: res.failed > 0 ? 'warning' : 'success'
    })
  } catch (e: any) {
    toast.add({ title: apiError.format(e, t('pages.planner.saveErrorTitle')), color: 'error' })
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
              <PlannerAyahSelect
                v-model:surah="config[track].surah"
                v-model:verse="config[track].verse"
                snap-to="first"
              />
            </UFormField>

            <UFormField
              v-if="track === 'Hifz'"
              :label="t('pages.planner.wizard.direction.label')"
              :help="t('pages.planner.wizard.direction.help')"
            >
              <div class="flex gap-1 rounded-md border border-default p-0.5">
                <UButton
                  v-for="opt in directionOptions(config[track])"
                  :key="opt.value"
                  :variant="config[track].direction === opt.value ? 'soft' : 'ghost'"
                  color="primary"
                  size="sm"
                  class="flex-1 justify-center"
                  @click="setDirection(track, opt.value)"
                >
                  <span class="inline-flex items-center gap-1.5 min-w-0">
                    <template v-if="opt.to">
                      <span class="truncate">{{ opt.from }}</span>
                      <UIcon name="i-lucide-arrow-right" class="w-4 h-4 shrink-0 rtl:rotate-180" />
                      <span class="truncate">{{ opt.to }}</span>
                    </template>
                    <template v-else>
                      <UIcon name="i-lucide-arrow-right" class="w-4 h-4 shrink-0 rtl:rotate-180" />
                      <span class="truncate">{{ opt.label }}</span>
                    </template>
                  </span>
                </UButton>
              </div>
            </UFormField>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField
                :label="t('pages.planner.wizard.dailyAmount')"
                :hint="t('pages.planner.wizard.maxAmount', { count: unitMax(config[track].unit) })"
              >
                <UInputNumber
                  v-model="config[track].amount"
                  :min="1"
                  :max="unitMax(config[track].unit)"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('pages.planner.wizard.unit')">
                <USelect v-model="config[track].unit" :items="unitItems" value-key="value" class="w-full" />
              </UFormField>
            </div>

            <div
              v-if="previews[track]"
              class="rounded-lg bg-elevated px-3 py-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm"
            >
              <span class="text-muted text-xs">{{ t('pages.planner.wizard.preview.label') }}</span>
              <span class="font-semibold">{{ previews[track]!.from }}</span>
              <UIcon name="i-lucide-arrow-right" class="w-4 h-4 text-primary rtl:rotate-180" />
              <span class="font-semibold">{{ previews[track]!.to }}</span>
              <span class="text-muted text-xs">{{ t('pages.planner.wizard.preview.days', { count: previews[track]!.days }) }}</span>
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
