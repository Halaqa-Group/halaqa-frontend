<script setup lang="ts">
import { mushafNumber } from '~/utils/mushaf'

// The reader's bottom edge. Collapsed it says only where the reader is and how the
// recitation is scoring so far — the printed mushaf's footer, plus the one number
// the teacher watches. The committing actions (مسح، اعتماد) stay behind
// «إنهاء التسميع»: marking is continuous and should never be one mis-tap away from
// wiping or approving the session.
//
// `#context` is the exception — it renders above the bar and is always visible, for
// controls that steer marking itself (the اختبار spot/mark mode). Hiding those would
// make the mushaf unusable while the sheet is shut.
const props = defineProps<{
  page?: number
  hizb?: number | null
  /** Live percentage. Omit to hide the chip entirely. */
  score?: number
  syncStatus?: 'idle' | 'saving' | 'saved' | 'error'
  syncLabel?: string
  /** Marks on screen that the backend has not confirmed yet. */
  syncPending?: boolean
  showSync?: boolean
  /** Position within the lesson's pages, for the expanded nav row. */
  position?: number
  totalPages?: number
  canPrev?: boolean
  canNext?: boolean
  /** False for parent / approved views: no way to open the action drawer. */
  showFinish?: boolean
}>()

const expanded = defineModel<boolean>('expanded', { default: false })

const emit = defineEmits<{
  prev: []
  next: []
}>()

// Same bands as MarkToolbar and the achievement form's score preview.
const scoreTone = computed(() => {
  const v = props.score ?? 100
  return v >= 90 ? 'good' : v >= 75 ? 'fair' : 'poor'
})

const syncIcon = computed(() => {
  if (props.syncStatus === 'saving') return 'i-lucide-loader-2'
  if (props.syncStatus === 'error') return 'i-lucide-cloud-off'
  return props.syncPending ? 'i-lucide-cloud' : 'i-lucide-cloud-check'
})

const hasNav = computed(() => (props.totalPages ?? 0) > 1)
</script>

<template>
  <div class="reader-sheet-root">
    <section class="reader-sheet" dir="rtl">
      <div v-if="$slots.context" class="reader-sheet__context">
        <slot name="context" />
      </div>

      <div class="reader-sheet__bar">
        <p class="reader-sheet__pos tabular-nums">
          <span v-if="page">صفحة {{ mushafNumber(page) }}</span>
          <span v-if="page && hizb" class="reader-sheet__dot">·</span>
          <span v-if="hizb">الحزب {{ mushafNumber(hizb) }}</span>
        </p>

        <div class="reader-sheet__end">
          <UIcon
            v-if="showSync"
            :name="syncIcon"
            class="reader-sheet__sync size-4"
            :class="[
              syncStatus === 'saving' && 'reader-sheet__sync--spin',
              syncStatus === 'error' && 'reader-sheet__sync--error',
              syncStatus !== 'error' && !syncPending && 'reader-sheet__sync--ok'
            ]"
            :title="syncLabel"
          />

          <span
            v-if="score != null"
            class="reader-sheet__score"
            :class="`reader-sheet__score--${scoreTone}`"
          >{{ score }}%</span>

          <button
            v-if="showFinish"
            type="button"
            class="reader-sheet__finish"
            :class="{ 'reader-sheet__finish--open': expanded }"
            @click="expanded = !expanded"
          >
            <UIcon :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'" class="size-4" />
            <span>{{ expanded ? 'متابعة التسميع' : 'إنهاء التسميع' }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- The actions live in a drawer rather than an in-bar panel: it dims the page
         behind it, so committing the session reads as a deliberate step away from
         marking, and it can be dismissed by dragging it back down.
         The wide top radius is deliberate: the sheet should read as a sheet lifting
         off the mushaf, not as a panel butted against its edge. It overrides the
         theme's `rounded-t-lg`, which lives in a compound variant and can only be
         beaten from the instance's own `ui`. -->
    <UDrawer
      v-model:open="expanded"
      :ui="{ overlay: 'z-[60]', content: 'z-[60] rounded-t-3xl overflow-hidden', container: 'gap-3' }"
      title="إنهاء التسميع"
      description="راجع الإعدادات والأخطاء قبل الاعتماد"
    >
      <template #body>
        <div class="reader-sheet__body" dir="rtl">
          <!-- Page nav sits first: it is the only row here that steers the mushaf,
               and the teacher may want a last look before committing. Label at the
               start edge, control at the end — the shape every row in the sheet
               keeps, whether it comes from here or from the slot. -->
          <div v-if="hasNav" class="reader-sheet__row">
            <span class="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
              <UIcon name="i-lucide-book-open" class="size-3.5" />
              الصفحة
            </span>
            <div class="reader-sheet__pager">
              <button
                type="button"
                class="reader-sheet__nav-btn"
                :disabled="!canPrev"
                aria-label="الصفحة السابقة"
                @click="emit('prev')"
              >
                <UIcon name="i-lucide-chevron-right" class="size-4" />
              </button>
              <span class="reader-sheet__nav-pos tabular-nums">
                {{ mushafNumber(position) }} من {{ mushafNumber(totalPages) }}
              </span>
              <button
                type="button"
                class="reader-sheet__nav-btn"
                :disabled="!canNext"
                aria-label="الصفحة التالية"
                @click="emit('next')"
              >
                <UIcon name="i-lucide-chevron-left" class="size-4" />
              </button>
            </div>
          </div>

          <!-- Each slotted block is one section, hairline-separated, so the sheet
               reads as a short list of decisions rather than a stack of controls. -->
          <slot />
        </div>
      </template>

      <!-- The committing actions get the drawer's footer: pinned below the
           sections, never mixed in with the settings they act on. -->
      <template v-if="$slots.actions" #footer>
        <div class="reader-sheet__actions" dir="rtl">
          <slot name="actions" />
        </div>
      </template>
    </UDrawer>
  </div>
</template>

<style scoped>
.reader-sheet {
  position: relative;
  z-index: 21;
  display: flex;
  flex-direction: column;
  background: var(--color-mushaf-chrome);
  border-top: 1px solid var(--color-mushaf-border);
  color: var(--color-mushaf-fg);
  font-family: 'Thmanyah Sans', serif;
  padding-bottom: env(safe-area-inset-bottom);
  flex-shrink: 0;
}

.reader-sheet__context {
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid var(--color-mushaf-border);
}

.reader-sheet__bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  min-height: 48px;
}

.reader-sheet__pos {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-mushaf-muted);
  white-space: nowrap;
  min-width: 0;
  flex: 1 1 auto;
}

.reader-sheet__dot {
  opacity: 0.5;
}

.reader-sheet__end {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 0 0 auto;
}

.reader-sheet__sync {
  color: var(--color-mushaf-muted);
}
.reader-sheet__sync--ok {
  color: var(--color-status-ok);
}
.reader-sheet__sync--error {
  color: var(--color-status-warning);
}
.reader-sheet__sync--spin {
  animation: reader-sheet-spin 1s linear infinite;
}
@keyframes reader-sheet-spin {
  to { transform: rotate(360deg); }
}

.reader-sheet__score {
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  border: 1.5px solid currentColor;
  font-size: 0.85rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.reader-sheet__score--good {
  color: #16a34a;
  background: rgba(22, 163, 74, 0.1);
}
.reader-sheet__score--fair {
  color: #d97706;
  background: rgba(217, 119, 6, 0.1);
}
.reader-sheet__score--poor {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.1);
}

.reader-sheet__finish {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 40px;
  padding: 0 0.7rem;
  border-radius: 10px;
  border: 1px solid rgb(var(--mushaf-ink-rgb) / 0.14);
  background: transparent;
  color: var(--color-mushaf-fg);
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.12s;
}

.reader-sheet__finish:hover {
  background: rgb(var(--mushaf-ink-rgb) / 0.06);
}

.reader-sheet__finish--open {
  background: rgb(var(--mushaf-ink-rgb) / 0.06);
}

/* Inside the drawer's portal, so it is styled here rather than inherited from the
   reader: the drawer body sits outside `.reader`. */
.reader-sheet__body {
  display: flex;
  flex-direction: column;
  font-family: 'Thmanyah Sans', serif;
  color: var(--color-mushaf-fg);
}

/* One rhythm for every section, whoever supplies it: the sheet's own nav row and
   the slotted blocks are spaced and separated by the same rule, so nothing has to
   carry its own margins. `:slotted` is required — slot content is compiled in the
   parent and would otherwise fall outside this component's scope. */
.reader-sheet__body > :slotted(*) {
  padding-block: 0.7rem;
}

.reader-sheet__body > :slotted(*:not(:first-child)) {
  border-top: 1px solid var(--color-mushaf-border);
}

/* The sheet's own row, shaped like the slotted ones: label start, control end. */
.reader-sheet__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-block: 0.2rem 0.7rem;
}

.reader-sheet__pager {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* Full-bleed rule above the actions: the footer is a different kind of thing from
   the sections, so it is separated more firmly than they are from each other. */
.reader-sheet__actions {
  border-top: 1px solid var(--color-mushaf-border);
  margin-inline: -1rem;
  padding: 0.75rem 1rem 0;
  font-family: 'Thmanyah Sans', serif;
  color: var(--color-mushaf-fg);
  padding-bottom: env(safe-area-inset-bottom);
}

.reader-sheet__nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgb(var(--mushaf-ink-rgb) / 0.14);
  background: transparent;
  color: var(--color-mushaf-fg);
  cursor: pointer;
}

.reader-sheet__nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.reader-sheet__nav-pos {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-mushaf-fg);
  /* Wide enough that stepping from ٩ to ١٠ doesn't shuffle the two buttons. */
  min-width: 4.5rem;
  text-align: center;
}
</style>
