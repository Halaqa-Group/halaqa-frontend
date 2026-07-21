<script setup lang="ts">
import { SURAH_NAMES } from '~/data/constants'
import { makeRangePredicate } from '~/utils/mushaf'
import { SEVERITY_LEVELS } from '~/types/recitation'
import type { MarkGroups, RecitationMarks, Severity, VerseEdge, VerseLock, WordKey } from '~/types/recitation'
import type { DragSelectRequest } from '~/composables/useWordDragSelect'

const props = defineProps<{
  startSurah: number
  startVerse: number
  endSurah: number
  endVerse: number
  marks?: RecitationMarks
  /** Word → block id, so a drag-selected run renders as one connected block. */
  groups?: MarkGroups
  /**
   * Overrides which verses read as "in range" (highlighted, rest dimmed). Defaults
   * to the lesson range; test mark-mode passes the tested-spots predicate so only
   * spot verses stay lit.
   */
  highlightOverride?: (verseKey: string) => boolean
  /** Verse ("surah:ayah") of an armed test-spot start, highlighted until closed. */
  pendingVerse?: string | null
  /** Verses that can't be picked right now — rendered normally, but inert. */
  lockedAt?: VerseLock
  /** Ayah-end ornaments that bound a tested موضع; recoloured in place. */
  spotEdgeAt?: VerseEdge
  onWordTap?: (wordKey: WordKey, verseKey: string) => void
  /** Apply one severity (or unmark, when null) to a drag-selected run of words. */
  onWordsMark?: (keys: WordKey[], severity: Severity | null) => void
}>()

const severityLevels = SEVERITY_LEVELS

const { t } = useI18n()
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
  props.highlightOverride
  ?? makeRangePredicate(props.startSurah, props.startVerse, props.endSurah, props.endVerse)
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

/**
 * Jump to the page holding a given verse and bring it into view. Lets a caller
 * navigate the mushaf from outside — e.g. tapping a موضع chip to go to it.
 */
function goToVerse(verseKey: string) {
  const target = pageFor(verseKey)
  if (!target) return
  const idx = pages.value.indexOf(target)
  if (idx >= 0) current.value = idx
  nextTick(() => {
    pageEl.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

defineExpose({ goToVerse })

// ── Drag-to-select word marking ───────────────────────────────────────────────
// Press-and-drag across a run of words to mark them all at one severity. The
// picker floats at the release point; a plain tap still cycles a single word.
const picker = ref<{ keys: WordKey[], left: number, top: number } | null>(null)

const MENU_W = 208
const MENU_H = 248

function openPicker(req: DragSelectRequest) {
  if (!props.onWordsMark) return
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = req.x - MENU_W / 2
  let top = req.y + 12
  if (top + MENU_H > vh) top = req.y - MENU_H - 12
  left = Math.min(Math.max(8, left), vw - MENU_W - 8)
  top = Math.max(8, top)
  picker.value = { keys: req.keys, left, top }
}

function applyPicker(severity: Severity | null) {
  if (picker.value) props.onWordsMark?.(picker.value.keys, severity)
  picker.value = null
}

const { startedOnWord } = useWordDragSelect({
  container: pageEl,
  enabled: () => !!props.onWordsMark,
  onRequest: openPicker
})

useSwipe(pageEl, {
  threshold: 40,
  onSwipeEnd(_e, direction) {
    // A horizontal gesture that began on a word is a range-selection, not a
    // page swipe — don't navigate.
    if (startedOnWord.value) return
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
          :groups="groups"
          :pending-verse="pendingVerse"
          :locked-at="lockedAt"
          :spot-edge-at="spotEdgeAt"
          :on-word-tap="onWordTap"
        />
      </div>

      <p v-if="hasMultiple" class="mushaf-range-viewer__swipe-hint sm:hidden">
        اسحب يمينًا أو يسارًا للتنقل بين الصفحات
      </p>
    </template>

    <!-- Severity picker for a drag-selected run of words -->
    <Teleport to="body">
      <div v-if="picker">
        <div class="mushaf-picker__backdrop" @click="picker = null" />
        <div
          class="mushaf-picker"
          dir="rtl"
          :style="{ left: `${picker.left}px`, top: `${picker.top}px` }"
        >
          <p class="mushaf-picker__title">
            طبّق على {{ picker.keys.length }} كلمة
            <span v-if="picker.keys.length > 1" class="mushaf-picker__subtitle">تُحتسب خطأً واحدًا</span>
          </p>
          <button
            v-for="lvl in severityLevels"
            :key="lvl.key"
            type="button"
            class="mushaf-picker__item"
            :style="{ '--level-rgb': lvl.rgb }"
            @click="applyPicker(lvl.key)"
          >
            <span class="mushaf-picker__swatch" />
            <span class="mushaf-picker__label">{{ t(lvl.labelKey) }}</span>
          </button>
          <button
            type="button"
            class="mushaf-picker__item mushaf-picker__item--clear"
            @click="applyPicker(null)"
          >
            <UIcon name="i-lucide-eraser" class="size-4" />
            <span class="mushaf-picker__label">إزالة العلامة</span>
          </button>
        </div>
      </div>
    </Teleport>
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

/* ── Drag-select severity picker ─────────────────────────────────────────── */
.mushaf-picker__backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
}

.mushaf-picker {
  position: fixed;
  z-index: 61;
  width: 208px;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.4rem;
  background: white;
  border: 1px solid #e7e5e4;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  font-family: 'Thmanyah Sans', serif;
}

.mushaf-picker__title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #78716c;
  padding: 0.35rem 0.5rem 0.4rem;
  font-variant-numeric: tabular-nums;
}

.mushaf-picker__subtitle {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: #a8a29e;
}

.mushaf-picker__item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.55rem 0.6rem;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgb(var(--level-rgb, 87 83 78));
  text-align: right;
  transition: background-color 0.12s;
}

.mushaf-picker__item:hover {
  background: rgb(var(--level-rgb, 0 0 0) / 0.1);
}

.mushaf-picker__item--clear {
  color: #57534e;
  border-top: 1px solid #f5f5f4;
  border-radius: 0 0 8px 8px;
  margin-top: 0.15rem;
}

.mushaf-picker__item--clear:hover {
  background: rgba(0, 0, 0, 0.05);
}

.mushaf-picker__swatch {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: rgb(var(--level-rgb));
  flex-shrink: 0;
}
</style>
