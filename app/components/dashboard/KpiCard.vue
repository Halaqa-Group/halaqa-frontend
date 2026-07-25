<script setup lang="ts">
import type { Trend } from '~/utils/dashboard'
import { formatTrendRatio, trendColor, trendIcon } from '~/utils/dashboard'

/**
 * One tile in the dashboard KPI row.
 *
 * A headline number is a stat tile, not a one-bar chart — `value` arrives
 * already formatted by the caller because only the caller knows the unit (a
 * rate, a score out of 100, fractional pages). The tile never re-rounds.
 *
 * `trend` compares against the immediately-preceding window and is colored by
 * direction × `higherIsBetter`, so a falling absence count reads as good news
 * while a falling attendance rate reads as bad.
 */

type KpiTone
  = | 'hifz' | 'near' | 'far'
    | 'ok' | 'warning' | 'conflict' | 'info' | 'overdue' | 'gold'

const props = withDefaults(defineProps<{
  label: string
  /** Pre-formatted for display — see the `formatKpi*` helpers. */
  value: string
  icon: string
  tone?: KpiTone
  hint?: string
  trend?: Trend | null
  /** Whether a rise in this metric is good news. Drives the trend badge colour. */
  higherIsBetter?: boolean
  /** A ratio 0..1 to draw as a meter under the value; omit for count metrics. */
  meter?: number | null
}>(), {
  tone: 'hifz',
  hint: undefined,
  trend: null,
  higherIsBetter: true,
  meter: null
})

// Static maps — Tailwind only sees class names it can find literally in source,
// so these can never be built by interpolation.
const TONE_CHIP: Record<KpiTone, string> = {
  hifz: 'bg-track-hifz-bg text-track-hifz',
  near: 'bg-track-near-bg text-track-near',
  far: 'bg-track-far-bg text-track-far',
  ok: 'bg-status-ok-bg text-status-ok',
  warning: 'bg-status-warning-bg text-status-warning',
  conflict: 'bg-status-conflict-bg text-status-conflict',
  info: 'bg-status-info-bg text-status-info',
  overdue: 'bg-status-overdue-bg text-status-overdue',
  gold: 'bg-rank-gold-bg text-rank-gold'
}

// The meter track is a lighter step of the fill's own ramp, so the bar reads as
// one object at a glance instead of a coloured bar on unrelated grey.
const TONE_TRACK: Record<KpiTone, string> = {
  hifz: 'bg-track-hifz-bg',
  near: 'bg-track-near-bg',
  far: 'bg-track-far-bg',
  ok: 'bg-status-ok-bg',
  warning: 'bg-status-warning-bg',
  conflict: 'bg-status-conflict-bg',
  info: 'bg-status-info-bg',
  overdue: 'bg-status-overdue-bg',
  gold: 'bg-rank-gold-bg'
}

const TONE_FILL: Record<KpiTone, string> = {
  hifz: 'bg-track-hifz',
  near: 'bg-track-near',
  far: 'bg-track-far',
  ok: 'bg-status-ok',
  warning: 'bg-status-warning',
  conflict: 'bg-status-conflict',
  info: 'bg-status-info',
  overdue: 'bg-status-overdue',
  gold: 'bg-rank-gold'
}

const meterWidth = computed(() => {
  if (props.meter === null || props.meter === undefined || !Number.isFinite(props.meter)) return null
  return `${Math.min(100, Math.max(0, props.meter * 100))}%`
})

const trendRatioLabel = computed(() => (props.trend ? formatTrendRatio(props.trend) : ''))
</script>

<template>
  <div class="flex flex-col gap-4 rounded-2xl p-5 bg-surface-container-lowest ring ring-card-border">
    <div class="flex items-start justify-between gap-2">
      <div
        class="flex size-10 shrink-0 items-center justify-center rounded-xl"
        :class="TONE_CHIP[tone]"
      >
        <UIcon :name="icon" class="size-5" />
      </div>

      <UBadge
        v-if="trend"
        :color="trendColor(trend.direction, higherIsBetter)"
        variant="subtle"
        size="sm"
        :icon="trendIcon(trend.direction)"
        :label="trendRatioLabel"
        class="shrink-0"
      />
    </div>

    <div>
      <!-- Proportional figures: tabular-nums is for aligning columns, and it
           makes a large standalone number look loosely spaced. -->
      <p class="text-3xl font-semibold leading-none text-on-surface">
        {{ value }}
      </p>
      <p class="mt-1.5 text-[13px] font-medium text-on-surface-variant">
        {{ label }}
      </p>
    </div>

    <div
      v-if="meterWidth"
      class="h-1.5 overflow-hidden rounded-full"
      :class="TONE_TRACK[tone]"
    >
      <div
        class="h-full rounded-full transition-[width] duration-300"
        :class="TONE_FILL[tone]"
        :style="{ width: meterWidth }"
      />
    </div>

    <p v-if="hint" class="text-xs text-on-surface-variant">
      {{ hint }}
    </p>
  </div>
</template>
