<script setup lang="ts">
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
  /** Ornaments to pulse briefly, to point out a موضع just navigated to. */
  flashAt?: VerseEdge
  onWordTap?: (wordKey: WordKey, verseKey: string) => void
  /** Apply one severity (or unmark, when null) to a drag-selected run of words. */
  onWordsMark?: (keys: WordKey[], severity: Severity | null) => void
}>()

const severityLevels = SEVERITY_LEVELS

const { t } = useI18n()
const { pageFor } = useVerseToPage()

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
const canPrev = computed(() => current.value > 0)
const canNext = computed(() => current.value < pages.value.length - 1)
function prev() {
  if (canPrev.value) current.value--
}
function next() {
  if (canNext.value) current.value++
}

// Only reset the position. The whole range used to be prefetched here — for a
// long revision that is dozens of page JSONs + fonts on arrival. `useMushafPage`
// loads the page being shown and warms its immediate neighbours on idle, which
// is all a prev/next/swipe can reach.
watch(pages, () => {
  current.value = 0
}, { immediate: true })

const pageEl = ref<HTMLElement | null>(null)

// Words carry `data-word-key="surah:ayah"`, so the verse itself can be scrolled
// to rather than the page that contains it — centring the tall page container
// just lands the reader in the middle of it, nowhere near the verse.
const SCROLL_RETRY_MS = 80
const SCROLL_MAX_TRIES = 20
let scrollTimer: ReturnType<typeof setTimeout> | null = null

function clearScrollTimer() {
  if (!scrollTimer) return
  clearTimeout(scrollTimer)
  scrollTimer = null
}

function scrollToVerse(verseKey: string, attempt = 0) {
  const root = pageEl.value
  if (!root) return
  // First match is word 1 of that verse — the words render in reading order.
  const el = root.querySelector<HTMLElement>(`[data-word-key="${verseKey}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  // A page switch loads its words asynchronously; wait for them rather than
  // scrolling to a page that hasn't rendered its text yet.
  if (attempt < SCROLL_MAX_TRIES) {
    scrollTimer = setTimeout(() => scrollToVerse(verseKey, attempt + 1), SCROLL_RETRY_MS)
  } else {
    root.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

/**
 * Jump to the page holding a given verse and bring THAT VERSE into view. Lets a
 * caller navigate the mushaf from outside — e.g. tapping a موضع chip.
 */
function goToVerse(verseKey: string) {
  const target = pageFor(verseKey)
  if (!target) return
  const idx = pages.value.indexOf(target)
  if (idx >= 0) current.value = idx
  clearScrollTimer()
  nextTick(() => scrollToVerse(verseKey))
}

onBeforeUnmount(clearScrollTimer)

// The reader's own top and bottom bars draw the position and the prev/next
// controls now, so the viewer publishes its paging state instead of rendering it.
defineExpose({ goToVerse, currentPage, pages, canPrev, canNext, prev, next })

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
    // Mirrored for RTL: a mushaf is flipped left-to-right, so dragging the sheet
    // toward the right brings the next (higher-numbered) page in from the left.
    // `direction` is the finger's travel, not the content's.
    if (direction === 'right') next()
    else if (direction === 'left') prev()
  }
})
</script>

<template>
  <div class="mushaf-range-viewer">
    <div v-if="!pages.length" class="mushaf-range-viewer__error">
      نطاق غير صالح — تأكد من السور والآيات.
    </div>

    <!-- One page at a time; swipeable on touch devices -->
    <div v-else ref="pageEl" class="mushaf-range-viewer__page">
      <MushafPage
        v-if="currentPage"
        :page-number="currentPage"
        :highlight="highlight"
        :marks="marks"
        :groups="groups"
        :pending-verse="pendingVerse"
        :locked-at="lockedAt"
        :spot-edge-at="spotEdgeAt"
        :flash-at="flashAt"
        :on-word-tap="onWordTap"
      />
    </div>

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
/* A pass-through flex column: on a phone the reader gives this its leftover height
   and the page underneath divides it into 15 lines. min-height:0 at every level or
   the chain refuses to shrink and the page overflows the screen. */
.mushaf-range-viewer {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.mushaf-range-viewer__page {
  touch-action: pan-y;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.mushaf-range-viewer__error {
  text-align: center;
  padding: 1rem;
  font-size: 0.9rem;
  color: var(--color-error);
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
  background: var(--color-surface-container-lowest);
  border: 1px solid var(--color-card-border);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  font-family: 'Thmanyah Sans', serif;
}

.mushaf-picker__title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-on-surface-variant);
  padding: 0.35rem 0.5rem 0.4rem;
  font-variant-numeric: tabular-nums;
}

.mushaf-picker__subtitle {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-outline);
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
  text-align: start;
  transition: background-color 0.12s;
}

.mushaf-picker__item:hover {
  background: rgb(var(--level-rgb, 0 0 0) / 0.1);
}

.mushaf-picker__item--clear {
  color: var(--color-on-surface-variant);
  border-top: 1px solid var(--color-card-border);
  border-radius: 0 0 8px 8px;
  margin-top: 0.15rem;
}

.mushaf-picker__item--clear:hover {
  background: var(--color-surface-container);
}

.mushaf-picker__swatch {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: rgb(var(--level-rgb));
  flex-shrink: 0;
}
</style>
