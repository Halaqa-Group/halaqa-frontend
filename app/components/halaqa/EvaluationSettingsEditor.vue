<script setup lang="ts">
import type { EvaluationSettings } from '~/utils/score'
import {
  DEFAULT_EVALUATION_SETTINGS,
  computePercentageScore,
  normalizeEvaluationSettings
} from '~/utils/score'
import { invalidateEvaluationSettings } from '~/composables/useAchievements'

const props = defineProps<{
  halaqaId: number
  initial: Record<string, unknown> | null
  readOnly?: boolean
}>()

const emit = defineEmits<{
  saved: [settings: Record<string, unknown> | null]
}>()

const { t } = useI18n()
const toast = useToast()
const apiError = useApiError()
const { updateHalaqa } = useHalaqat()

type WeightKey = keyof EvaluationSettings

const WEIGHTS: Array<{ key: WeightKey, labelKey: string }> = [
  { key: 'mistake_weight', labelKey: 'pages.achievements.mistakes' },
  { key: 'warning_weight', labelKey: 'pages.achievements.warnings' },
  { key: 'tajweed_weight', labelKey: 'pages.achievements.tajweedErrors' },
  { key: 'harakat_weight', labelKey: 'pages.achievements.harakat' }
]

// Nullable because UInputNumber emits null when the field is cleared.
const form = reactive<Record<WeightKey, number | null>>({ ...DEFAULT_EVALUATION_SETTINGS })
// The last server-known state, so "dirty" survives a save without a refetch.
const baseline = ref<EvaluationSettings>({ ...DEFAULT_EVALUATION_SETTINGS })
const saving = ref(false)

function apply(settings: EvaluationSettings) {
  for (const { key } of WEIGHTS) form[key] = settings[key]
}

watch(() => props.initial, (next) => {
  const normalized = normalizeEvaluationSettings(next)
  baseline.value = normalized
  apply(normalized)
}, { immediate: true, deep: true })

// Guard the range here rather than trusting the widget's min/max alone — a
// cleared or typed-over field can sit outside it.
const invalidKeys = computed(() =>
  WEIGHTS.filter(({ key }) => {
    const v = form[key]
    return typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100
  }).map(({ key }) => key)
)
const isValid = computed(() => invalidKeys.value.length === 0)
const isDirty = computed(() => WEIGHTS.some(({ key }) => form[key] !== baseline.value[key]))
const isDefault = computed(() =>
  WEIGHTS.every(({ key }) => form[key] === DEFAULT_EVALUATION_SETTINGS[key])
)

// Concrete feedback on what the weights mean: the score a student lands on
// after exactly one error of each type.
const sampleScore = computed(() => {
  if (!isValid.value) return null
  return computePercentageScore({
    mistakes_count: 1,
    warnings_count: 1,
    tajweed_errors_count: 1,
    harakat_errors_count: 1
  }, form)
})

function reset() {
  apply(baseline.value)
}

function useDefaults() {
  apply({ ...DEFAULT_EVALUATION_SETTINGS })
}

async function save() {
  if (!isValid.value || saving.value) return
  saving.value = true
  // PATCH replaces the stored object wholesale, so send all four weights.
  // isValid already proved each one is a number in range; normalize just
  // narrows the nullable form type back to EvaluationSettings.
  const payload: Record<string, unknown> = { ...normalizeEvaluationSettings(form) }
  try {
    const updated = await updateHalaqa(props.halaqaId, { evaluation_settings: payload })
    const normalized = normalizeEvaluationSettings(updated.evaluation_settings)
    baseline.value = normalized
    apply(normalized)
    // Achievements score against a per-session cache of these weights.
    invalidateEvaluationSettings(props.halaqaId, updated.evaluation_settings)
    toast.add({ title: t('pages.halaqat.toastUpdated'), color: 'success' })
    emit('saved', updated.evaluation_settings)
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
        {{ t('pages.halaqat.details.evaluationSettings') }}
      </h3>
      <p class="text-xs text-muted">
        {{ t('pages.halaqat.details.evaluationSettingsHint') }}
      </p>
    </div>

    <div v-if="readOnly" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div
        v-for="w in WEIGHTS"
        :key="w.key"
        class="rounded-lg border border-default bg-elevated px-3 py-2.5"
      >
        <p class="text-xs text-muted truncate">
          {{ t(w.labelKey) }}
        </p>
        <p class="text-xl font-bold tabular-nums mt-0.5">
          −{{ form[w.key] }}
        </p>
      </div>
    </div>

    <template v-else>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
        <p v-if="sampleScore !== null" class="text-xs text-muted">
          {{ t('pages.halaqat.details.evaluationSample', { score: sampleScore }) }}
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
