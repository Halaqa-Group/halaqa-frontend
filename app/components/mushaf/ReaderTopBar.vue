<script setup lang="ts">
import { mushafNumber } from '~/utils/mushaf'

// The reader's top edge, cut down to what a printed mushaf puts in its header:
// where you are in the book. Everything about the *session* — who is reciting,
// which lesson, what has already been recorded today — hides behind the middle
// button, so the page itself owns the screen.
defineProps<{
  surahName: string
  juz: number | null
  /** Read-only sessions (parent, approved record) get a quieter header. */
  muted?: boolean
}>()

const emit = defineEmits<{
  back: []
  menu: []
}>()
</script>

<template>
  <header class="reader-bar" dir="rtl">
    <div class="reader-bar__group">
      <button
        type="button"
        class="reader-bar__icon"
        aria-label="رجوع"
        @click="emit('back')"
      >
        <UIcon name="i-lucide-chevron-right" class="size-5" />
      </button>
      <span class="reader-bar__surah">{{ surahName }}</span>
    </div>

    <button
      type="button"
      class="reader-bar__icon reader-bar__icon--center"
      aria-label="تفاصيل الجلسة"
      @click="emit('menu')"
    >
      <UIcon name="i-lucide-layout-grid" class="size-5" />
    </button>

    <div class="reader-bar__group reader-bar__group--end">
      <span v-if="juz" class="reader-bar__badge" :class="{ 'reader-bar__badge--muted': muted }">
        <UIcon name="i-lucide-bookmark" class="size-3.5" />
        الجزء {{ mushafNumber(juz) }}
      </span>
    </div>
  </header>
</template>

<style scoped>
.reader-bar {
  display: grid;
  /* Three tracks rather than space-between, so the middle button stays optically
     centred however long the surah name runs. */
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  padding-top: calc(0.4rem + env(safe-area-inset-top));
  background: var(--color-mushaf-chrome);
  color: var(--color-mushaf-fg);
  border-bottom: 1px solid var(--color-mushaf-border);
  font-family: 'Thmanyah Sans', serif;
  flex-shrink: 0;
}

.reader-bar__group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}

.reader-bar__group--end {
  justify-content: flex-end;
}

.reader-bar__surah {
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reader-bar__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* 40px keeps every control in the chrome at a real touch target. */
  width: 40px;
  height: 40px;
  border-radius: 10px;
  color: var(--color-mushaf-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.12s, color 0.12s;
}

.reader-bar__icon:hover {
  background: rgb(var(--mushaf-ink-rgb) / 0.06);
  color: var(--color-mushaf-fg);
}

.reader-bar__icon--center {
  color: var(--color-mushaf-accent);
}

.reader-bar__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgb(var(--mushaf-ink-rgb) / 0.12);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-mushaf-accent);
  white-space: nowrap;
}

.reader-bar__badge--muted {
  color: var(--color-mushaf-muted);
}
</style>
