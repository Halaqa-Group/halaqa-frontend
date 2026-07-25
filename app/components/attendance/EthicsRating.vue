<script setup lang="ts">
import { ETHICS_RATING_MAX, ETHICS_RATING_MIN } from '~/data/constants'

const props = withDefaults(defineProps<{
  rating: number
  /** Renders as plain text with no click targets — used in read-only views. */
  readonly?: boolean
  compact?: boolean
  disabled?: boolean
}>(), {
  readonly: false,
  compact: false,
  disabled: false
})

const emit = defineEmits<{
  set: [rating: number]
}>()

const { t } = useI18n()

const marks = Array.from(
  { length: ETHICS_RATING_MAX - ETHICS_RATING_MIN + 1 },
  (_, i) => ETHICS_RATING_MIN + i
)

// The full mark is the default a seeded row carries, so it stays neutral;
// anything lowered reads as a deliberate deduction and is coloured for it.
const tone = computed(() => {
  if (props.rating >= 5) return 'text-success-500'
  if (props.rating >= 4) return 'text-primary-500'
  if (props.rating >= 3) return 'text-warning-500'
  return 'text-error-500'
})

const label = computed(() =>
  t('pages.attendance.ethics.valueLabel', { rating: props.rating, max: ETHICS_RATING_MAX })
)
</script>

<template>
  <div
    v-if="readonly"
    class="inline-flex items-center gap-1"
    :title="label"
    :aria-label="label"
  >
    <UIcon name="i-lucide-star" class="w-3.5 h-3.5 shrink-0" :class="tone" />
    <span class="text-xs font-medium tabular-nums" :class="tone">{{ rating }}/{{ ETHICS_RATING_MAX }}</span>
  </div>

  <div
    v-else
    class="inline-flex items-center gap-0.5"
    :class="disabled ? 'opacity-60' : ''"
    role="radiogroup"
    :aria-label="t('pages.attendance.ethics.label')"
  >
    <button
      v-for="mark in marks"
      :key="mark"
      type="button"
      class="rounded transition-colors"
      :class="[
        compact ? 'p-0.5' : 'p-1',
        disabled ? 'cursor-not-allowed' : 'hover:bg-elevated',
        mark <= rating ? tone : 'text-muted'
      ]"
      role="radio"
      :aria-checked="mark === rating"
      :title="t('pages.attendance.ethics.setTo', { rating: mark })"
      :aria-label="t('pages.attendance.ethics.setTo', { rating: mark })"
      :disabled="disabled"
      @click="emit('set', mark)"
    >
      <UIcon name="i-lucide-star" class="w-4 h-4 shrink-0" :class="mark <= rating ? '' : 'opacity-40'" />
    </button>
  </div>
</template>
