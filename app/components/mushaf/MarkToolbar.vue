<script setup lang="ts">
// The session's actions, and nothing else: the error tally it acts on is a
// separate row of the sheet (MushafMarkSummary), so a count can never be misread
// as a button.
const props = defineProps<{
  // Whether the page on screen has anything to erase — «مسح» clears that page,
  // not the whole lesson.
  canClear?: boolean
  canSubmit?: boolean
  submitting?: boolean
  // An explicit «حفظ» is in flight — the session is being stored without being
  // approved.
  saving?: boolean
  // When the recitation's achievement is already approved, the primary action
  // toggles to "unapprove" instead of "approve".
  approved?: boolean
  // Two rows instead of one, for the desktop rail: the row is ~21rem there, and
  // three buttons abreast would clip their labels. اعتماد takes the first row on
  // its own — it is the one being aimed at — and the other two share the second.
  stacked?: boolean
}>()

const emit = defineEmits<{
  // Erase the marks on the page being read, and only those.
  clear: []
  // Store the session and leave it pending — the recitation is kept, not signed
  // off. Sits beside اعتماد so ending the session is never all-or-nothing.
  save: []
  submit: []
}>()

const submitLabel = computed(() => {
  if (props.submitting) return props.approved ? 'جارٍ الإلغاء…' : 'جارٍ الاعتماد…'
  return props.approved ? 'إلغاء الاعتماد' : 'اعتماد'
})

const busy = computed(() => !!props.submitting || !!props.saving)

// An unapprove is always available; only the approve action needs marks/spots.
const submitDisabled = computed(() =>
  props.approved ? busy.value : (!props.canSubmit || busy.value)
)

// Saving keeps the record pending, so it is offered wherever an approve would
// be — but never on an approved record, which rejects updates until it is
// unapproved.
const saveDisabled = computed(() => props.approved || !props.canSubmit || busy.value)
</script>

<template>
  <!-- One row, full width, ordered by weight: clearing at the start edge, the
       ending of the session at the end. -->
  <div class="mark-toolbar" :class="{ 'mark-toolbar--stacked': stacked }" dir="rtl">
    <button
      type="button"
      class="mark-toolbar__btn mark-toolbar__btn--ghost"
      :disabled="!canClear || approved || busy"
      aria-label="مسح أخطاء هذه الصفحة"
      title="مسح أخطاء هذه الصفحة"
      @click="emit('clear')"
    >
      <UIcon name="i-lucide-eraser" class="size-4" />
      <span class="mark-toolbar__btn-label">مسح الصفحة</span>
    </button>

    <!-- Save without approving: the record is kept for review, and the teacher
         stays on the mushaf. -->
    <button
      type="button"
      class="mark-toolbar__btn mark-toolbar__btn--outline"
      :disabled="saveDisabled"
      :aria-label="saving ? 'جارٍ الحفظ…' : 'حفظ'"
      @click="emit('save')"
    >
      <UIcon
        :name="saving ? 'i-lucide-loader-2' : 'i-lucide-save'"
        :class="['size-4', saving && 'mark-toolbar__spinner']"
      />
      <span class="mark-toolbar__btn-label">{{ saving ? 'جارٍ الحفظ…' : 'حفظ' }}</span>
    </button>

    <button
      type="button"
      class="mark-toolbar__btn mark-toolbar__btn--wide"
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
</template>

<style scoped>
/* Sits flush inside the reader's bottom sheet — the sheet is the surface, so the
   bar brings no card of its own. The three buttons share the row: مسح and حفظ at
   equal width, اعتماد half again as wide, because it is the one being aimed at. */
.mark-toolbar {
  display: flex;
  align-items: stretch;
  gap: 0.4rem;
  width: 100%;
  color: var(--color-mushaf-fg);
}

.mark-toolbar__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  flex: 1 1 0;
  min-width: 0;
  padding: 0.5rem 0.6rem;
  border-radius: 10px;
  border: 1.5px solid transparent;
  font-size: 0.85rem;
  font-weight: 500;
  font-family: 'Thmanyah Sans', serif;
  cursor: pointer;
  transition: background-color 0.12s, border-color 0.12s, color 0.12s, opacity 0.12s;
  min-height: 44px;
  white-space: nowrap;
}

.mark-toolbar__btn--wide {
  flex: 1.6 1 0;
}

/* `order` rather than reordering the markup: the DOM keeps مسح → حفظ → اعتماد,
   which is the order a keyboard should tab them in either way. */
.mark-toolbar--stacked {
  flex-wrap: wrap;
}
.mark-toolbar--stacked .mark-toolbar__btn--wide {
  order: -1;
  flex: 1 0 100%;
}
.mark-toolbar--stacked .mark-toolbar__btn--ghost {
  flex: 1 1 0;
}

.mark-toolbar__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Content-width, not an equal third: «مسح الصفحة» is the longest label and the
   least-wanted action — it takes what it needs and leaves the row to the two that
   end the session. */
.mark-toolbar__btn--ghost {
  flex: 0 0 auto;
  color: var(--color-mushaf-muted);
  background: transparent;
  border-color: rgb(var(--mushaf-ink-rgb) / 0.14);
}
.mark-toolbar__btn--ghost:not(:disabled):hover {
  background: rgb(var(--mushaf-ink-rgb) / 0.06);
}

/* Between مسح and اعتماد in weight: a real action, but not the one that ends
   the session. */
.mark-toolbar__btn--outline {
  color: var(--color-mushaf-fg);
  background: transparent;
  border-color: rgb(var(--mushaf-ink-rgb) / 0.3);
}
.mark-toolbar__btn--outline:not(:disabled):hover {
  background: rgb(var(--mushaf-ink-rgb) / 0.06);
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

@media (max-width: 420px) {
  /* No room for three labels on a phone: the eraser keeps only its icon (its
     title/aria still name the page), the two that end the session keep their
     words. */
  .mark-toolbar__btn--ghost .mark-toolbar__btn-label {
    display: none;
  }
}
</style>
