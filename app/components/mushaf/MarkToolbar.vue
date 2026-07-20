<script setup lang="ts">
import type { MarkCounts, Severity } from '~/types/recitation'
import { SEVERITY_LEVELS } from '~/types/recitation'

const props = defineProps<{
  counts: MarkCounts
  canSubmit?: boolean
  submitting?: boolean
  // When the recitation's achievement is already approved, the primary action
  // toggles to "unapprove" instead of "approve".
  approved?: boolean
}>()

const emit = defineEmits<{
  clear: []
  submit: []
}>()

const submitLabel = computed(() => {
  if (props.submitting) return props.approved ? 'جارٍ الإلغاء…' : 'جارٍ الاعتماد…'
  return props.approved ? 'إلغاء الاعتماد' : 'اعتماد'
})
// An unapprove is always available; only the approve action needs marks/spots.
const submitDisabled = computed(() =>
  props.approved ? props.submitting : (!props.canSubmit || props.submitting)
)

// Tap a word on the mushaf to cycle its severity down the spectrum
// (red → orange → yellow → green → clear). The toolbar is a live legend of
// how many words sit at each level, not a mode selector.
const levels = SEVERITY_LEVELS

function countFor(key: Severity): number {
  return props.counts[key]
}
</script>

<template>
  <div class="mark-toolbar" dir="rtl">
    <div class="mark-toolbar__legend">
      <span
        v-for="lvl in levels"
        :key="lvl.key"
        class="mark-toolbar__level"
        :class="{ 'mark-toolbar__level--empty': countFor(lvl.key) === 0 }"
        :style="{ '--level-rgb': lvl.rgb }"
        :title="lvl.label"
      >
        <span class="mark-toolbar__swatch" />
        <span class="mark-toolbar__level-label">{{ lvl.label }}</span>
        <span v-if="countFor(lvl.key) > 0" class="mark-toolbar__level-count">{{ countFor(lvl.key) }}</span>
      </span>
    </div>

    <div class="mark-toolbar__actions">
      <button
        type="button"
        class="mark-toolbar__btn mark-toolbar__btn--ghost"
        :disabled="counts.total === 0 || approved"
        :aria-label="'مسح'"
        @click="emit('clear')"
      >
        <UIcon name="i-lucide-eraser" class="size-4" />
        <span class="mark-toolbar__btn-label">مسح</span>
      </button>

      <button
        type="button"
        class="mark-toolbar__btn"
        :class="approved ? 'mark-toolbar__btn--warning' : 'mark-toolbar__btn--primary'"
        :disabled="submitDisabled"
        :aria-label="submitLabel"
        @click="emit('submit')"
      >
        <UIcon
          :name="submitting ? 'i-lucide-loader-2' : (approved ? 'i-lucide-undo-2' : 'i-lucide-check')"
          :class="['size-4', submitting && 'mark-toolbar__spinner']"
        />
        <span class="mark-toolbar__btn-label">{{ submitLabel }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.mark-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  background: white;
  border: 1px solid #e7e5e4;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  flex-wrap: wrap;
}

.mark-toolbar__legend {
  display: flex;
  gap: 0.3rem;
  flex: 1 1 auto;
  min-width: 0;
  flex-wrap: wrap;
}

.mark-toolbar__level {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  border: 1.5px solid rgb(var(--level-rgb) / 0.45);
  background: rgb(var(--level-rgb) / 0.1);
  font-size: 0.8rem;
  font-weight: 600;
  color: rgb(var(--level-rgb));
  font-family: 'Thmanyah Sans', serif;
  min-height: 40px;
  transition: opacity 0.12s;
}

.mark-toolbar__level--empty {
  opacity: 0.5;
}

.mark-toolbar__swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: rgb(var(--level-rgb));
  flex-shrink: 0;
}

.mark-toolbar__level-count {
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
  tab-size: 1;
  font-variant-numeric: tabular-nums;
}

.mark-toolbar__actions {
  display: flex;
  gap: 0.3rem;
  flex: 0 0 auto;
}

.mark-toolbar__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.7rem;
  border-radius: 8px;
  border: 1.5px solid transparent;
  font-size: 0.85rem;
  font-weight: 500;
  font-family: 'Thmanyah Sans', serif;
  cursor: pointer;
  transition: background-color 0.12s, border-color 0.12s, color 0.12s, opacity 0.12s;
  min-height: 40px;
  white-space: nowrap;
}

.mark-toolbar__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.mark-toolbar__btn--ghost {
  color: #57534e;
  background: transparent;
}
.mark-toolbar__btn--ghost:not(:disabled):hover {
  background: rgba(0, 0, 0, 0.05);
}

.mark-toolbar__btn--primary {
  color: white;
  background: #16a34a;
}
.mark-toolbar__btn--primary:not(:disabled):hover {
  background: #15803d;
}

.mark-toolbar__btn--warning {
  color: white;
  background: #d97706;
}
.mark-toolbar__btn--warning:not(:disabled):hover {
  background: #b45309;
}

.mark-toolbar__spinner {
  animation: mark-toolbar-spin 1s linear infinite;
}
@keyframes mark-toolbar-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 560px) {
  .mark-toolbar__level-label {
    display: none;
  }
  .mark-toolbar__level {
    padding: 0.45rem 0.5rem;
    gap: 0.3rem;
  }
}

@media (max-width: 480px) {
  .mark-toolbar {
    padding: 0.45rem 0.5rem;
    gap: 0.3rem;
  }
  .mark-toolbar__btn-label {
    display: none;
  }
  .mark-toolbar__btn {
    padding: 0.45rem 0.55rem;
  }
}
</style>
