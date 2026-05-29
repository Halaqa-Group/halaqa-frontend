<script setup lang="ts">
import type { MarkCounts, MarkType } from '~/types/recitation'

const props = defineProps<{
  mode: MarkType
  counts: MarkCounts
  // When true, the Save button is enabled and emits `submit`. The actual
  // submit-to-backend behaviour is the parent's responsibility (Phase 4).
  canSubmit?: boolean
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:mode': [MarkType]
  clear: []
  submit: []
}>()

type Mode = {
  key: MarkType
  label: string
  icon: string
  classToken: string
}

const MODES: Mode[] = [
  { key: 'mistake', label: 'خطأ', icon: 'i-lucide-x', classToken: 'mark-toolbar__mode--mistake' },
  { key: 'warning', label: 'تنبيه', icon: 'i-lucide-alert-triangle', classToken: 'mark-toolbar__mode--warning' },
  { key: 'tajweed', label: 'تجويد', icon: 'i-lucide-music-2', classToken: 'mark-toolbar__mode--tajweed' }
]

function pick(m: MarkType) {
  emit('update:mode', m)
}

function countFor(m: MarkType): number {
  if (m === 'mistake') return props.counts.mistake
  if (m === 'warning') return props.counts.warning
  return props.counts.tajweed
}
</script>

<template>
  <div class="mark-toolbar" dir="rtl">
    <div class="mark-toolbar__modes">
      <button
        v-for="m in MODES"
        :key="m.key"
        type="button"
        :class="[
          'mark-toolbar__mode',
          m.classToken,
          { 'mark-toolbar__mode--active': mode === m.key }
        ]"
        :aria-pressed="mode === m.key"
        @click="pick(m.key)"
      >
        <UIcon :name="m.icon" class="mark-toolbar__mode-icon" />
        <span class="mark-toolbar__mode-label">{{ m.label }}</span>
        <span v-if="countFor(m.key) > 0" class="mark-toolbar__mode-count">{{ countFor(m.key) }}</span>
      </button>
    </div>

    <div class="mark-toolbar__actions">
      <button
        type="button"
        class="mark-toolbar__btn mark-toolbar__btn--ghost"
        :disabled="counts.total === 0"
        :aria-label="'مسح'"
        @click="emit('clear')"
      >
        <UIcon name="i-lucide-eraser" class="size-4" />
        <span class="mark-toolbar__btn-label">مسح</span>
      </button>

      <button
        type="button"
        class="mark-toolbar__btn mark-toolbar__btn--primary"
        :disabled="!canSubmit || submitting"
        :aria-label="submitting ? 'جارٍ الحفظ' : 'حفظ'"
        @click="emit('submit')"
      >
        <UIcon
          :name="submitting ? 'i-lucide-loader-2' : 'i-lucide-check'"
          :class="['size-4', submitting && 'mark-toolbar__spinner']"
        />
        <span class="mark-toolbar__btn-label">{{ submitting ? 'جارٍ الحفظ…' : 'حفظ' }}</span>
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
  /* Wrap when the row can't hold all chips + actions side-by-side. */
  flex-wrap: wrap;
}

.mark-toolbar__modes {
  display: flex;
  gap: 0.3rem;
  /* Allow chips to flex within available space */
  flex: 1 1 auto;
  min-width: 0;
  flex-wrap: wrap;
}

.mark-toolbar__mode {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.7rem;
  border-radius: 8px;
  border: 1.5px solid transparent;
  background: transparent;
  font-size: 0.85rem;
  font-weight: 500;
  color: #57534e;
  font-family: 'Thmanyah Sans', serif;
  cursor: pointer;
  transition: background-color 0.12s, border-color 0.12s, color 0.12s;
  /* Min touch target on mobile */
  min-height: 40px;
}

.mark-toolbar__mode:hover {
  background: rgba(0, 0, 0, 0.03);
}

.mark-toolbar__mode-icon {
  width: 16px;
  height: 16px;
}

.mark-toolbar__mode-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.08);
  font-size: 0.7rem;
  font-weight: 600;
}

/* Selected-state colourings — match the in-mushaf word tints. */
.mark-toolbar__mode--mistake.mark-toolbar__mode--active {
  background: rgba(220, 38, 38, 0.12);
  border-color: rgba(220, 38, 38, 0.55);
  color: #b91c1c;
}
.mark-toolbar__mode--mistake.mark-toolbar__mode--active .mark-toolbar__mode-count {
  background: rgba(220, 38, 38, 0.22);
  color: #991b1b;
}

.mark-toolbar__mode--warning.mark-toolbar__mode--active {
  background: rgba(234, 88, 12, 0.12);
  border-color: rgba(234, 88, 12, 0.55);
  color: #c2410c;
}
.mark-toolbar__mode--warning.mark-toolbar__mode--active .mark-toolbar__mode-count {
  background: rgba(234, 88, 12, 0.22);
  color: #9a3412;
}

.mark-toolbar__mode--tajweed.mark-toolbar__mode--active {
  background: rgba(22, 163, 74, 0.12);
  border-color: rgba(22, 163, 74, 0.55);
  color: #15803d;
}
.mark-toolbar__mode--tajweed.mark-toolbar__mode--active .mark-toolbar__mode-count {
  background: rgba(22, 163, 74, 0.22);
  color: #166534;
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

.mark-toolbar__spinner {
  animation: mark-toolbar-spin 1s linear infinite;
}
@keyframes mark-toolbar-spin {
  to { transform: rotate(360deg); }
}

/* Narrow viewports (small phones) — hide the text labels on mode chips
   and action buttons; rely on icons + colour + count badges. Avoids the
   "Save button cropped off-screen" problem at 320–414px widths. */
@media (max-width: 480px) {
  .mark-toolbar {
    padding: 0.45rem 0.5rem;
    gap: 0.3rem;
  }
  .mark-toolbar__mode-label,
  .mark-toolbar__btn-label {
    display: none;
  }
  .mark-toolbar__mode {
    padding: 0.45rem 0.55rem;
    gap: 0.25rem;
  }
  .mark-toolbar__btn {
    padding: 0.45rem 0.55rem;
  }
  /* The count badge stays — it's the most useful info per chip. */
  .mark-toolbar__mode-count {
    margin-inline-start: 0.1rem;
  }
}
</style>
