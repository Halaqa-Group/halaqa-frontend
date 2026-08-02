<script setup lang="ts">
import type { ReportWeights } from '~/types'
import { REPORT_WEIGHTS_DEFAULTS } from '~/types'

/**
 * Per-halaqa track weights for the daily evaluation report. Separate from the
 * error-weight `evaluation_settings` — these split a student's daily score across
 * hifz / near / far / ethics. The four MUST sum to exactly 100; the backend
 * rejects anything else with a 400, so we block the save until they do.
 */
const props = defineProps<{
  halaqaId: number
  initial: ReportWeights | null | undefined
  readOnly?: boolean
}>()

const emit = defineEmits<{ saved: [weights: ReportWeights] }>()

const { t } = useI18n()
const toast = useToast()
const apiError = useApiError()
const { updateHalaqa } = useHalaqat()

type WeightKey = keyof ReportWeights

const WEIGHTS: Array<{ key: WeightKey, labelKey: string }> = [
  { key: 'hifz_weight', labelKey: 'tracks.hifz' },
  { key: 'near_weight', labelKey: 'tracks.near' },
  { key: 'far_weight', labelKey: 'tracks.far' },
  { key: 'ethics_weight', labelKey: 'pages.dailyReport.ethics' }
]

// Nullable because UInputNumber emits null when the field is cleared.
const form = reactive<Record<WeightKey, number | null>>({ ...REPORT_WEIGHTS_DEFAULTS })
const baseline = ref<ReportWeights>({ ...REPORT_WEIGHTS_DEFAULTS })
const saving = ref(false)

function apply(w: ReportWeights) {
  for (const { key } of WEIGHTS) form[key] = w[key]
}

watch(() => props.initial, (next) => {
  const w = next ?? REPORT_WEIGHTS_DEFAULTS
  baseline.value = { ...w }
  apply(w)
}, { immediate: true, deep: true })

const invalidKeys = computed(() =>
  WEIGHTS.filter(({ key }) => {
    const v = form[key]
    return typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100
  }).map(({ key }) => key)
)
const total = computed(() =>
  WEIGHTS.reduce((sum, { key }) => sum + (typeof form[key] === 'number' ? (form[key] as number) : 0), 0)
)
// Guard against float drift (e.g. 33.33 × 3) — compare rounded to 2 decimals.
const sumsTo100 = computed(() => Math.round(total.value * 100) === 10000)
const isValid = computed(() => invalidKeys.value.length === 0 && sumsTo100.value)
const isDirty = computed(() => WEIGHTS.some(({ key }) => form[key] !== baseline.value[key]))
const isDefault = computed(() =>
  WEIGHTS.every(({ key }) => form[key] === REPORT_WEIGHTS_DEFAULTS[key])
)

function reset() {
  apply(baseline.value)
}
function useDefaults() {
  apply({ ...REPORT_WEIGHTS_DEFAULTS })
}

async function save() {
  if (!isValid.value || saving.value) return
  saving.value = true
  const payload: ReportWeights = {
    hifz_weight: form.hifz_weight as number,
    near_weight: form.near_weight as number,
    far_weight: form.far_weight as number,
    ethics_weight: form.ethics_weight as number
  }
  try {
    const updated = await updateHalaqa(props.halaqaId, { report_weights: payload })
    const saved = updated.report_weights ?? payload
    baseline.value = { ...saved }
    apply(saved)
    toast.add({ title: t('pages.halaqat.toastUpdated'), color: 'success' })
    emit('saved', saved)
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.halaqat.toastError')), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h3 class="font-semibold mb-1">
        {{ t('pages.halaqat.details.reportWeights') }}
      </h3>
      <p class="text-xs text-muted">
        {{ t('pages.halaqat.details.reportWeightsHint') }}
      </p>
    </div>

    <div v-if="readOnly" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div
        v-for="w in WEIGHTS"
        :key="w.key"
        class="rounded-lg border border-default bg-elevated px-3 py-2.5"
      >
        <p class="text-xs text-muted truncate">
          {{ t(w.labelKey) }}
        </p>
        <p class="text-xl font-bold tabular-nums mt-0.5">
          {{ form[w.key] }}
        </p>
      </div>
    </div>

    <template v-else>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <UFormField
          v-for="w in WEIGHTS"
          :key="w.key"
          :label="t(w.labelKey)"
          :error="invalidKeys.includes(w.key) ? t('pages.halaqat.details.weightRange') : undefined"
        >
          <UInputNumber
            v-model="form[w.key]"
            :min="0"
            :max="100"
            :disabled="saving"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          class="text-xs font-medium"
          :class="sumsTo100 ? 'text-success' : 'text-error'"
        >
          <UIcon
            :name="sumsTo100 ? 'i-lucide-check-circle' : 'i-lucide-alert-circle'"
            class="inline size-3.5 -mt-0.5"
          />
          {{ t('pages.halaqat.details.weightsTotal', { total: total }) }}
        </p>
        <div class="flex items-center gap-2 sm:ms-auto shrink-0">
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            :disabled="saving || isDefault"
            @click="useDefaults"
          >
            {{ t('pages.halaqat.details.restoreDefaults') }}
          </UButton>
          <UButton
            v-if="isDirty"
            variant="soft"
            color="neutral"
            size="sm"
            :disabled="saving"
            @click="reset"
          >
            {{ t('common.cancel') }}
          </UButton>
          <UButton :loading="saving" :disabled="!isDirty || !isValid" @click="save">
            {{ t('pages.halaqat.save') }}
          </UButton>
        </div>
      </div>
    </template>
  </div>
</template>
