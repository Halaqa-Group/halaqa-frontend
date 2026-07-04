<script setup lang="ts">
import { SURAH_NAMES } from '~/data/constants'
import { makeRangePredicate } from '~/utils/mushaf'
import type { RecitationMarks, WordKey } from '~/types/recitation'

const props = defineProps<{
  startSurah: number
  startVerse: number
  endSurah: number
  endVerse: number
  marks?: RecitationMarks
  onWordTap?: (wordKey: WordKey, verseKey: string) => void
}>()

const { pageFor, loading: metaLoading, error: metaError } = useVerseToPage()

const startPage = computed(() => pageFor(`${props.startSurah}:${props.startVerse}`))
const endPage = computed(() => pageFor(`${props.endSurah}:${props.endVerse}`))

const pages = computed(() => {
  const s = startPage.value
  const e = endPage.value
  if (!s || !e || e < s) return []
  const out: number[] = []
  for (let p = s; p <= e; p++) out.push(p)
  return out
})

const highlight = computed(() =>
  makeRangePredicate(props.startSurah, props.startVerse, props.endSurah, props.endVerse)
)

// ── Page-by-page navigation ───────────────────────────────────────────────────
const current = ref(0)
const currentPage = computed<number | undefined>(() => pages.value[current.value])
const hasMultiple = computed(() => pages.value.length > 1)
const canPrev = computed(() => current.value > 0)
const canNext = computed(() => current.value < pages.value.length - 1)
function prev() {
  if (canPrev.value) current.value--
}
function next() {
  if (canNext.value) current.value++
}

watch(pages, (list) => {
  current.value = 0
  for (const p of list) prefetchMushafPage(p)
}, { immediate: true })

const pageEl = ref<HTMLElement | null>(null)
useSwipe(pageEl, {
  threshold: 40,
  onSwipeEnd(_e, direction) {
    if (direction === 'left') next()
    else if (direction === 'right') prev()
  }
})

const rangeLabel = computed(() => {
  const startName = SURAH_NAMES[props.startSurah] ?? `سورة ${props.startSurah}`
  if (props.startSurah === props.endSurah) {
    return `${startName} ${props.startVerse}–${props.endVerse}`
  }
  const endName = SURAH_NAMES[props.endSurah] ?? `سورة ${props.endSurah}`
  return `${startName} ${props.startVerse} ← ${endName} ${props.endVerse}`
})
</script>

<template>
  <div class="mushaf-range-viewer">
    <div v-if="metaLoading" class="mushaf-range-viewer__hint">
      جارٍ تحميل بيانات الصفحات…
    </div>

    <div v-else-if="metaError" class="mushaf-range-viewer__error" dir="ltr">
      Failed to load verse-to-page map: {{ metaError.message }}
    </div>

    <div v-else-if="!pages.length" class="mushaf-range-viewer__error">
      نطاق غير صالح — تأكد من السور والآيات.
    </div>

    <template v-else>
      <div class="mushaf-range-viewer__header" dir="rtl">
        <span class="mushaf-range-viewer__range-label">{{ rangeLabel }}</span>

        <!-- Multi-page: page-by-page nav. Single page: static label. -->
        <div v-if="hasMultiple" class="mushaf-range-viewer__nav">
          <UButton
            icon="i-lucide-chevron-right"
            size="sm"
            color="neutral"
            variant="soft"
            square
            :disabled="!canPrev"
            :aria-label="'الصفحة السابقة'"
            @click="prev"
          />
          <span class="mushaf-range-viewer__pos tabular-nums">صفحة {{ currentPage }} · {{ current + 1 }}/{{ pages.length }}</span>
          <UButton
            icon="i-lucide-chevron-left"
            size="sm"
            color="neutral"
            variant="soft"
            square
            :disabled="!canNext"
            :aria-label="'الصفحة التالية'"
            @click="next"
          />
        </div>
        <span v-else class="mushaf-range-viewer__pages-label">صفحة {{ pages[0] }}</span>
      </div>

      <!-- One page at a time; swipeable on touch devices -->
      <div ref="pageEl" class="mushaf-range-viewer__page">
        <MushafPage
          v-if="currentPage"
          :page-number="currentPage"
          :highlight="highlight"
          :marks="marks"
          :on-word-tap="onWordTap"
        />
      </div>

      <p v-if="hasMultiple" class="mushaf-range-viewer__swipe-hint sm:hidden">
        اسحب يمينًا أو يسارًا للتنقل بين الصفحات
      </p>
    </template>
  </div>
</template>

<style scoped>
.mushaf-range-viewer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mushaf-range-viewer__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
  padding: 0 0.5rem;
  font-family: 'Thmanyah Sans', 'Amiri', serif;
}

.mushaf-range-viewer__range-label {
  font-size: 1rem;
  font-weight: 600;
  color: #1c1917;
  min-width: 0;
}

.mushaf-range-viewer__pages-label {
  font-size: 0.8rem;
  color: #78716c;
  white-space: nowrap;
}

.mushaf-range-viewer__nav {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.mushaf-range-viewer__pos {
  font-size: 0.8rem;
  color: #57534e;
  white-space: nowrap;
}

.mushaf-range-viewer__page {
  touch-action: pan-y;
}

.mushaf-range-viewer__swipe-hint {
  text-align: center;
  font-size: 0.75rem;
  color: #a8a29e;
}

.mushaf-range-viewer__hint,
.mushaf-range-viewer__error {
  text-align: center;
  padding: 1rem;
  color: #78716c;
  font-size: 0.9rem;
}

.mushaf-range-viewer__error {
  color: #b91c1c;
}
</style>
