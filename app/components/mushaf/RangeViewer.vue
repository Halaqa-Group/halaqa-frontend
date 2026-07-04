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

watch(pages, (list) => {
  for (const p of list) prefetchMushafPage(p)
}, { immediate: true })

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
        <span class="mushaf-range-viewer__pages-label">
          {{ pages.length === 1 ? `صفحة ${pages[0]}` : `صفحات ${pages[0]}–${pages[pages.length - 1]}` }}
        </span>
      </div>

      <div class="mushaf-range-viewer__stack">
        <MushafPage
          v-for="p in pages"
          :key="p"
          :page-number="p"
          :highlight="highlight"
          :marks="marks"
          :on-word-tap="onWordTap"
        />
      </div>
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
  align-items: baseline;
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
}

.mushaf-range-viewer__pages-label {
  font-size: 0.8rem;
  color: #78716c;
}

.mushaf-range-viewer__stack {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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
