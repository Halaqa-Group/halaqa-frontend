<script setup lang="ts">
import { synthesizeLines } from '~/utils/mushaf'
import type { RecitationMarks, WordKey } from '~/types/recitation'

const props = defineProps<{
  pageNumber: number
  // Optional — forwarded to MushafLine to dim words outside the active range.
  highlight?: (verseKey: string) => boolean
  // Forwarded to MushafLine: tint state for individual words.
  marks?: RecitationMarks
  // Forwarded to MushafLine: tap handler. When provided, in-range words
  // become clickable and the handler receives the WordKey + verseKey.
  onWordTap?: (wordKey: WordKey, verseKey: string) => void
}>()

const { page, loading, error } = useMushafPage(() => props.pageNumber)

const renderedLines = computed(() => {
  if (!page.value) return []
  return synthesizeLines(page.value)
})
</script>

<template>
  <div class="mushaf-page" dir="rtl">
    <div class="mushaf-page__inner">
      <template v-if="error && !page">
        <div class="mushaf-page__error" dir="ltr">
          <UIcon name="i-lucide-triangle-alert" class="size-5 text-red-500" />
          <span>Failed to load page {{ pageNumber }} — {{ error.message }}</span>
        </div>
      </template>

      <template v-else-if="page">
        <!-- Render the page even when loading=true for a NEW page — keeping
             stale content on screen during nav is less jarring than a skeleton
             flash. The composable's fast-path will avoid loading=true entirely
             for prefetched pages, so this only kicks in on truly cold loads. -->
        <MushafLine
          v-for="line in renderedLines"
          :key="line.n"
          :line="line"
          :page-number="pageNumber"
          :highlight="highlight"
          :marks="marks"
          :on-word-tap="onWordTap"
        />
      </template>

      <template v-else>
        <div class="mushaf-page__skeleton">
          <div v-for="i in 15" :key="i" class="mushaf-page__skeleton-line" />
        </div>
      </template>
    </div>

    <div class="mushaf-page__footer">
      <span class="mushaf-page__footer-label">صفحة {{ pageNumber }}</span>
    </div>
  </div>
</template>

<style scoped>
.mushaf-page {
  --mushaf-bg: #fdfaf2;
  --mushaf-fg: #1c1917;
  --mushaf-border: #d6d3d1;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  background: var(--mushaf-bg);
  color: var(--mushaf-fg);
  border: 1px solid var(--mushaf-border);
  border-radius: 8px;
  padding: clamp(0.75rem, 3.5vw, 2rem) clamp(0.5rem, 3vw, 1.5rem) clamp(0.5rem, 2vw, 1rem);
  container-type: inline-size;
  container-name: mushaf;
}

.mushaf-page__inner {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mushaf-page__skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.mushaf-page__skeleton-line {
  height: 2.4em;
  background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.06), transparent);
  background-size: 200% 100%;
  animation: mushaf-shimmer 1.4s linear infinite;
  border-radius: 4px;
}

@keyframes mushaf-shimmer {
  to { background-position: -200% 0; }
}

.mushaf-page__error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  color: #b91c1c;
  font-size: 0.9rem;
}

.mushaf-page__footer {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--mushaf-border);
  text-align: center;
  font-size: 0.75rem;
  color: #78716c;
}
</style>
