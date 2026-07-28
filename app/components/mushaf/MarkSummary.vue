<script setup lang="ts">
import type { MarkCounts, Severity } from '~/types/recitation'
import { SEVERITY_LEVELS } from '~/types/recitation'

// The running tally, as one more labelled row of the reader's sheet — kept apart
// from the buttons that end the session: what was marked is something to read,
// not something to press.
const props = defineProps<{
  counts: MarkCounts
  // Running mark for the current marks, already divided by the lesson's page
  // span. Omit to hide the readout.
  score?: number
}>()

const { t } = useI18n()

const levels = SEVERITY_LEVELS

function countFor(key: Severity): number {
  return props.counts[key]
}

// Same bands as the sheet's collapsed bar and the achievement form's preview.
const scoreTone = computed(() => {
  const v = props.score ?? 100
  return v >= 90 ? 'good' : v >= 75 ? 'fair' : 'poor'
})
</script>

<template>
  <div class="mark-summary" dir="rtl">
    <span class="mark-summary__label">
      <UIcon name="i-lucide-circle-alert" class="size-3.5" />
      الأخطاء
    </span>

    <div class="mark-summary__legend">
      <div
        v-if="score != null"
        class="mark-summary__score"
        :class="`mark-summary__score--${scoreTone}`"
        :title="t('pages.achievements.table.score')"
      >
        <span class="mark-summary__score-value">{{ score }}%</span>
        <span class="mark-summary__score-label">{{ t('pages.achievements.table.score') }}</span>
      </div>

      <span
        v-for="lvl in levels"
        :key="lvl.key"
        class="mark-summary__level"
        :class="{ 'mark-summary__level--empty': countFor(lvl.key) === 0 }"
        :style="{ '--level-rgb': lvl.rgb }"
        :title="t(lvl.labelKey)"
      >
        <span>{{ t(lvl.labelKey) }}</span>
        <span v-if="countFor(lvl.key) > 0" class="mark-summary__level-count">{{ countFor(lvl.key) }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Label at the start edge, values at the end — the shape every row in the sheet
   keeps. Wraps under the label rather than clipping the chips. */
.mark-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 0.75rem;
  flex-wrap: wrap;
  width: 100%;
  color: var(--color-mushaf-fg);
  font-family: 'Thmanyah Sans', serif;
}

.mark-summary__label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-mushaf-muted);
  flex: 0 0 auto;
}

.mark-summary__legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.3rem;
  min-width: 0;
  flex-wrap: wrap;
}

.mark-summary__level {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.55rem;
  border-radius: 8px;
  border: 1.5px solid rgb(var(--level-rgb) / 0.45);
  background: rgb(var(--level-rgb) / 0.1);
  font-size: 0.78rem;
  font-weight: 600;
  color: rgb(var(--level-rgb));
  min-height: 32px;
  transition: opacity 0.12s;
}

.mark-summary__level--empty {
  opacity: 0.5;
}

.mark-summary__level-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: rgb(var(--level-rgb) / 0.22);
  font-size: 0.7rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.mark-summary__score {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.1;
  padding: 0.2rem 0.6rem;
  border-radius: 8px;
  border: 1.5px solid currentColor;
  min-height: 32px;
  flex: 0 0 auto;
}

.mark-summary__score-value {
  font-size: 1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.mark-summary__score-label {
  font-size: 0.62rem;
  font-weight: 600;
  opacity: 0.75;
}

.mark-summary__score--good {
  color: #16a34a;
  background: rgba(22, 163, 74, 0.1);
}
.mark-summary__score--fair {
  color: #d97706;
  background: rgba(217, 119, 6, 0.1);
}
.mark-summary__score--poor {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.1);
}

@media (max-width: 560px) {
  /* The label is the chip's only content besides the count — tighten the padding
     rather than dropping either. */
  .mark-summary__level {
    padding: 0.3rem 0.45rem;
    gap: 0.3rem;
  }
}
</style>
