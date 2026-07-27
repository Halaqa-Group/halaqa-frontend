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

// ── Page fit ──────────────────────────────────────────────────────────────────
// A justified line should end at the margin, not leave slack for `space-between` to
// dump into the word gaps. At a fixed size it does leave slack: measured across
// pages, a body line's glyphs span only 86–102% of the measure.
//
// The correction is ONE factor for the whole page, never per line. A printed mushaf
// sets every line on a page at the same size — the font's glyph advances are cut so
// the lines come out even — and sizing each line to its own content instead made
// dense lines visibly smaller than sparse ones on the same page.
//
// The factor is the smallest any line needs, so the tightest line ends exactly at
// the margin and no line can overflow. Word widths scale linearly with font-size, so
// one pass converges; the ratio is published as `--line-fit` on the page and
// multiplies the base size in Line.vue.
const pageEl = ref<HTMLElement | null>(null)

// A line marked non-centred that is nonetheless short (bad layout data) would be
// blown up grotesquely — cap the correction well inside the range real pages need.
const MAX_FIT = 1.3
const MIN_FIT = 0.8

function fitLines() {
  const root = pageEl.value
  if (!root) return

  // Measure unscaled, or each pass compounds the previous one.
  root.style.removeProperty('--line-fit')

  let fit = MAX_FIT
  for (const line of root.querySelectorAll<HTMLElement>('.mushaf-line--justified')) {
    const words = Array.from(line.children) as HTMLElement[]
    if (words.length < 2) continue

    // getBoundingClientRect reports *visual* pixels, so an ancestor transform (the
    // PDF export scales the page to fit its sheet) would otherwise skew the ratio
    // against clientWidth's layout pixels. Normalise everything back to layout units.
    const lineWidth = line.clientWidth
    if (!lineWidth) continue
    const scale = line.getBoundingClientRect().width / lineWidth || 1

    // Split the line's content into what scales with font-size and what doesn't.
    // Scalable: the glyphs, plus the ayah ornaments' `margin: 0 0.1em`. Fixed: the
    // words' 1px horizontal padding. getBoundingClientRect covers the border box
    // only, so the margins have to be added by hand — leaving them out is what let
    // an ornament-dense page (thirty short ayahs, three or four markers a line)
    // land a fit factor that overflowed the measure by a dozen pixels.
    let scalable = 0
    let fixed = 0
    for (const w of words) {
      const cs = getComputedStyle(w)
      const pad = Number.parseFloat(cs.paddingLeft) + Number.parseFloat(cs.paddingRight)
      const margin = Number.parseFloat(cs.marginLeft) + Number.parseFloat(cs.marginRight)
      scalable += w.getBoundingClientRect().width / scale - pad + margin
      fixed += pad
    }

    // Half a pixel of slack: a line that lands fractionally over the measure
    // overflows, and `space-between` gives it nowhere to go.
    const avail = lineWidth - 0.5
    if (scalable <= 0 || avail <= fixed) continue
    fit = Math.min(fit, (avail - fixed) / scalable)
  }

  root.style.setProperty('--line-fit', String(Math.max(MIN_FIT, fit)))
}

// The QCF face for this page is awaited before `page` is set, but the browser still
// has to apply it — measuring before it does would size every line to the fallback.
function scheduleFit() {
  void nextTick(() => {
    if (document.fonts?.status === 'loaded') fitLines()
    else void document.fonts?.ready.then(fitLines)
  })
}

watch(renderedLines, scheduleFit, { flush: 'post' })

let ro: ResizeObserver | null = null
onMounted(() => {
  ro = new ResizeObserver(() => fitLines())
  if (pageEl.value) ro.observe(pageEl.value)
  scheduleFit()
})
onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
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
  <div ref="pageEl" class="mushaf-page" dir="rtl">
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
  </div>
</template>

<style scoped>
.mushaf-page {
  /* Fallback line box, used wherever the page is laid out by its own content
     (desktop, PDF export). On a phone the 15 lines divide the available height
     instead — see the flex rules below. */
  --mushaf-line-h: 2.4rem;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  background: var(--color-mushaf-bg);
  color: var(--color-mushaf-fg);
  border: 1px solid var(--color-mushaf-border);
  border-radius: 8px;
  padding: clamp(0.75rem, 3.5vw, 2rem) clamp(0.5rem, 3vw, 1.5rem);
  container-type: inline-size;
  container-name: mushaf;
  /* The page is a marking surface, not a document to copy from: a drag across
     words means "select this run and pick a severity", and a long-press on a
     phone must not raise the native selection handles or the iOS copy/share
     callout over it. */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

/*
  Phone: the page fills the gap the reader leaves between its two bars, and its 15
  lines split that height evenly — so the whole page lands on screen with nothing
  to scroll. Done with flex rather than by measuring the gap in JS and feeding a
  pixel height back through a custom property: the measurement raced its own first
  paint and silently left the page at a fallback size.

  `container-type: size` (rather than inline-size) is what lets a word cap its font
  against the page's *height* too — see Line.vue. It needs a definite block size,
  which the flex chain above now provides.
*/
@media (max-width: 1023px) {
  .mushaf-page {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    container-type: size;
    padding: 0.5rem clamp(0.5rem, 3vw, 1.5rem);
    /* The page meets the screen edge; only the top and bottom rules survive, so
       it still reads as a sheet between the two bars. */
    border-inline: 0;
    border-radius: 0;
  }

  .mushaf-page__inner {
    flex: 1 1 auto;
    min-height: 0;
  }
}

.mushaf-page__inner {
  display: flex;
  flex-direction: column;
}

.mushaf-page__skeleton {
  display: flex;
  flex-direction: column;
}

.mushaf-page__placeholder {
  min-height: calc(15 * var(--mushaf-line-h));
}

.mushaf-page__skeleton-line {
  height: var(--mushaf-line-h);
  background: linear-gradient(90deg, transparent, rgb(var(--mushaf-ink-rgb) / 0.08), transparent);
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
  color: var(--color-mushaf-fg);
  margin: 0;
}

.mushaf-page__error-detail {
  font-size: 0.875rem;
  color: var(--color-mushaf-muted);
  margin: 0;
}

.mushaf-page__error-tech {
  font-size: 0.7rem;
  color: var(--color-mushaf-muted);
  opacity: 0.6;
  margin: 0;
  font-family: monospace;
}
</style>
