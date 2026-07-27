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
         marking, and it can be dismissed by dragging it back down. -->
    <UDrawer
      v-model:open="expanded"
      :ui="{ overlay: 'z-[60]', content: 'z-[60]' }"
      title="إنهاء التسميع"
    >
      <template #body>
        <div class="reader-sheet__body" dir="rtl">
          <div v-if="hasNav" class="reader-sheet__nav">
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
              صفحة {{ mushafNumber(position) }} من {{ mushafNumber(totalPages) }}
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

          <slot />
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
  gap: 0.6rem;
  font-family: 'Thmanyah Sans', serif;
  color: var(--color-mushaf-fg);
  padding-bottom: env(safe-area-inset-bottom);
}

.reader-sheet__nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding-top: 0.5rem;
}

.reader-sheet__nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
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
  color: var(--color-mushaf-muted);
  min-width: 8rem;
  text-align: center;
}
</style>
