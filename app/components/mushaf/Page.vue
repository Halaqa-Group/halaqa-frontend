<script setup lang="ts">
import { synthesizeLines } from '~/utils/mushaf'
import { MUSHAF_HOVERED_GROUP } from '~/utils/mushaf-hover'
import type { MarkGroups, RecitationMarks, VerseEdge, VerseLock, WordKey } from '~/types/recitation'

const props = defineProps<{
  pageNumber: number
  highlight?: (verseKey: string) => boolean
  marks?: RecitationMarks
  groups?: MarkGroups
  pendingVerse?: string | null
  lockedAt?: VerseLock
  spotEdgeAt?: VerseEdge
  flashAt?: VerseEdge
  onWordTap?: (wordKey: WordKey, verseKey: string) => void
}>()

// Which drag-selected block is hovered, shared with every child line so the
// whole run lights up together (a block can span several lines). See MushafLine.
const hoveredGroup = ref<string | null>(null)
provide(MUSHAF_HOVERED_GROUP, hoveredGroup)

const { page, loading, error } = useMushafPage(() => props.pageNumber)

// A missing mushaf asset is not a connectivity problem — telling the user to
// check their wifi sends them chasing the wrong thing. `useMushafPage` tags
// those failures; anything else keeps the generic network wording.
const errorDetail = computed(() =>
  error.value?.message.startsWith('Mushaf ')
    ? 'ملفات المصحف غير متوفرة على الخادم. أبلغ المسؤول عن هذه المشكلة.'
    : 'تأكد من اتصالك بالشبكة ثم أعد المحاولة.'
)

const renderedLines = computed(() => {
  if (!page.value) return []
  return synthesizeLines(page.value)
})

const SKELETON_DELAY_MS = 120
const showSkeleton = ref(false)
let skeletonTimer: ReturnType<typeof setTimeout> | null = null

function clearSkeletonTimer() {
  if (!skeletonTimer) return
  clearTimeout(skeletonTimer)
  skeletonTimer = null
}

watch(
  [loading, page],
  ([isLoading, pageData]) => {
    if (pageData) {
      clearSkeletonTimer()
      showSkeleton.value = false
      return
    }
    if (isLoading) {
      if (showSkeleton.value || skeletonTimer) return
      skeletonTimer = setTimeout(() => {
        showSkeleton.value = true
        skeletonTimer = null
      }, SKELETON_DELAY_MS)
    } else {
      clearSkeletonTimer()
      showSkeleton.value = false
    }
  },
  { immediate: true }
)

onBeforeUnmount(clearSkeletonTimer)
</script>

<template>
  <div class="mushaf-page" dir="rtl">
    <div class="mushaf-page__inner">
      <template v-if="error && !page">
        <div class="mushaf-page__error" dir="rtl">
          <UIcon name="i-lucide-triangle-alert" class="size-6 text-error" />
          <p class="mushaf-page__error-title">
            تعذّر عرض الصفحة {{ pageNumber }}
          </p>
          <p class="mushaf-page__error-detail">
            {{ errorDetail }}
          </p>
          <p class="mushaf-page__error-tech" dir="ltr">
            {{ error.message }}
          </p>
        </div>
      </template>

      <template v-else-if="page">
        <MushafLine
          v-for="line in renderedLines"
          :key="line.n"
          :line="line"
          :page-number="pageNumber"
          :highlight="highlight"
          :marks="marks"
          :groups="groups"
          :pending-verse="pendingVerse"
          :locked-at="lockedAt"
          :spot-edge-at="spotEdgeAt"
          :flash-at="flashAt"
          :on-word-tap="onWordTap"
        />
      </template>

      <template v-else-if="showSkeleton">
        <div class="mushaf-page__skeleton">
          <div v-for="i in 15" :key="i" class="mushaf-page__skeleton-line" />
        </div>
      </template>

      <template v-else>
        <div class="mushaf-page__placeholder" aria-hidden="true" />
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

.mushaf-page__placeholder {
  min-height: calc(15 * 2.4em + 14 * 0.25rem);
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
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  text-align: center;
}

.mushaf-page__error-title {
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-on-surface, #1c1917);
  margin: 0;
}

.mushaf-page__error-detail {
  font-size: 0.875rem;
  color: var(--color-on-surface-variant, #78716c);
  margin: 0;
}

.mushaf-page__error-tech {
  font-size: 0.7rem;
  color: var(--color-on-surface-variant, #78716c);
  opacity: 0.6;
  margin: 0;
  font-family: monospace;
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
