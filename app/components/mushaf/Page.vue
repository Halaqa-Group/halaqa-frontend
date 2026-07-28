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
// The factor is the smallest any line needs, so the tightest line ends at the margin
// and no line can overflow. It is published as `--line-fit` on the page and
// multiplies the base size in Line.vue.
//
// The fit is applied and then CHECKED, because "widths scale with font-size" is only
// true where the browser sets the size it was asked for. iOS does not always: it
// enforces a minimum font size and inflates text it judges too small, so a page
// asked to shrink can come back the same width it was, and the line that was
// measured as fitting is rendered overflowing. When the check says the text refused
// to shrink, the page is scaled with a transform instead — the one thing no font
// setting can override. Without that, the overflow lands as an ayah ornament drawn
// on top of the word before it.
const pageEl = ref<HTMLElement | null>(null)

// A line marked non-centred that is nonetheless short (bad layout data) would be
// blown up grotesquely — cap the correction well inside the range real pages need.
const MAX_FIT = 1.3
// Low enough to stay out of the way. A floor that bites is a line that overflows:
// the fit is the only thing standing between a short window and text running past
// the margin, so it must always have room to shrink.
const MIN_FIT = 0.6
// One pass to size, then at most two to correct a browser that didn't obey.
const FIT_PASSES = 3

/**
 * How far the worst justified line is past the measure, as a ratio: 1 is flush,
 * above 1 overflows, below 1 leaves slack. 0 when there is nothing to measure.
 */
function worstLineRatio(root: HTMLElement): number {
  let worst = 0
  for (const line of root.querySelectorAll<HTMLElement>('.mushaf-line--justified')) {
    const words = Array.from(line.children) as HTMLElement[]
    if (words.length < 2) continue

    // getBoundingClientRect reports *visual* pixels, so an ancestor transform (the
    // PDF export scales the page to fit its sheet, and the fallback below scales it
    // too) would otherwise skew the ratio against clientWidth's layout pixels.
    // Normalise everything back to layout units.
    const lineWidth = line.clientWidth
    if (!lineWidth) continue
    const scale = line.getBoundingClientRect().width / lineWidth || 1

    // The ornaments' `margin: 0 0.1em` is part of the line's width but not of the
    // border box getBoundingClientRect reports, so it has to be added by hand —
    // leaving it out is what let an ornament-dense page (thirty short ayahs, three
    // or four markers a line) land a fit that overflowed by a dozen pixels.
    let content = 0
    for (const w of words) {
      const cs = getComputedStyle(w)
      content += w.getBoundingClientRect().width / scale
        + Number.parseFloat(cs.marginLeft) + Number.parseFloat(cs.marginRight)
    }

    // Slack, so the fit is never set to the exact edge of the measure: the glyphs
    // are set again after the pass measures them — a font applied a frame later, a
    // re-rasterisation at a different device scale — and a line pinned to the
    // margin has nowhere to put even a fraction of a pixel. 1% of the measure is a
    // tenth of a pixel per word gap, invisible in the justification.
    const avail = lineWidth * 0.99 - 0.5
    if (avail <= 0 || content <= 0) continue
    worst = Math.max(worst, content / avail)
  }
  return worst
}

function clampFit(value: number): number {
  return Math.min(MAX_FIT, Math.max(MIN_FIT, value))
}

function fitLines() {
  const root = pageEl.value
  if (!root) return

  // Measure unscaled, or each pass compounds the previous one.
  root.style.removeProperty('--line-fit')
  root.style.setProperty('--page-scale', '1')

  let fit = 1
  let ratio = worstLineRatio(root)
  if (!ratio) return
  const fontBefore = wordFontSize(root)

  for (let pass = 0; pass < FIT_PASSES; pass++) {
    const next = clampFit(fit / ratio)
    // Already flush, or the clamp won't let us move any further.
    if (Math.abs(next - fit) < 0.002) break
    fit = next
    root.style.setProperty('--line-fit', String(fit))

    const applied = worstLineRatio(root)
    // Fits now, or this pass bought nothing — the browser is setting the text at a
    // size of its own choosing, so asking again is pointless.
    if (applied <= 1 || applied > ratio - 0.002) {
      ratio = applied
      break
    }
    ratio = applied
  }

  // Whatever the text refused to give up, take from the page itself. Only ever a
  // fraction of a percent on a browser that honoured the fit, so the page keeps its
  // size everywhere this never bites.
  root.style.setProperty('--page-scale', ratio > 1 ? String(1 / ratio) : '1')

  if (debug.value) {
    fitReport.value = [
      `p${props.pageNumber} dpr${window.devicePixelRatio}`,
      `measure ${root.querySelector('.mushaf-line')?.clientWidth ?? 0}`,
      `fit ${fit.toFixed(3)}`,
      `residual ${ratio.toFixed(3)}`,
      `scale ${root.style.getPropertyValue('--page-scale')}`,
      // The two together are the tell: a fit well under 1 that left the font-size
      // where it started is a browser sizing the text its own way.
      `font ${fontBefore.toFixed(2)}→${wordFontSize(root).toFixed(2)}`
    ]
  }
}

/** Rendered size of a body word, in px — 0 before the page has any. */
function wordFontSize(root: HTMLElement): number {
  const word = root.querySelector<HTMLElement>('.mushaf-word--body')
  return word ? Number.parseFloat(getComputedStyle(word).fontSize) : 0
}

// ── Fit diagnostics ───────────────────────────────────────────────────────────
// `?mushafdebug=1` prints what the fit actually achieved over the page. It exists
// because the failure it chases only happens on other people's devices: a phone
// can be sent the URL and send back a screenshot, instead of the layout being
// argued about from a photo.
const route = useRoute()
const debug = computed(() => !!route.query.mushafdebug)
const fitReport = ref<string[]>([])

// The QCF face for this page is awaited before `page` is set, but the browser still
// has to apply it — measuring before it does would size every line to the fallback.
// `fonts.ready` alone is not enough on Safari: a face added in this same tick can
// leave it already resolved, so the page's own family is asked for by name first,
// and the measurement waits a frame after that for the glyphs to actually be set.
function scheduleFit() {
  void nextTick(async () => {
    const family = `p${props.pageNumber}-v1`
    try {
      await document.fonts?.load(`1em "${family}"`)
    } catch { /* not loadable — measure with whatever is in use */ }
    await document.fonts?.ready
    // Measure now, and again on the next painted frame in case the glyphs were
    // still being set. Never *only* on the frame: a page laid out while its tab is
    // hidden never gets one, and would keep the fallback size for good.
    fitLines()
    requestAnimationFrame(fitLines)
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

    <p v-if="debug && fitReport.length" class="mushaf-page__debug" dir="ltr">
      <span v-for="row in fitReport" :key="row">{{ row }}</span>
    </p>
  </div>
</template>

<style scoped>
.mushaf-page {
  /* Fallback line box, for anywhere the page is laid out by its own content rather
     than given a height. With the flex chain below in place the 15 lines divide the
     height they are handed instead. */
  --mushaf-line-h: 2.4rem;
  /* The page fills the height the reader gives it and splits that between its 15
     lines, so a page always lands whole on the screen with nothing to scroll — on a
     phone and on a desktop alike. Done with flex rather than by measuring the gap in
     JS and feeding a pixel height back through a custom property: the measurement
     raced its own first paint and silently left the page at a fallback size. */
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  background: var(--color-mushaf-bg);
  color: var(--color-mushaf-fg);
  border: 1px solid var(--color-mushaf-border);
  border-radius: 8px;
  padding: clamp(0.75rem, 3.5vw, 2rem) clamp(0.5rem, 3vw, 1.5rem);
  /* `size`, not `inline-size`: a word caps its font against the page's *height* as
     well as its width (see Line.vue). It needs a definite block size, which the
     flex chain above provides. */
  container-type: size;
  container-name: mushaf;
  /* The page is a marking surface, not a document to copy from: a drag across
     words means "select this run and pick a severity", and a long-press on a
     phone must not raise the native selection handles or the iOS copy/share
     callout over it. */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  /* iOS inflates text it judges too small for its block ("text autosizing"),
     which sets the glyphs wider than the fit pass measured them and pushes a
     justified line past the margin. The page sizes its own text off the measure;
     it must be the only thing that does. */
  -webkit-text-size-adjust: none;
  text-size-adjust: none;
}

/* Phone: the sheet meets the screen edge, so only the top and bottom rules survive
   and it reads as a page between the two bars. */
@media (max-width: 1023px) {
  .mushaf-page {
    padding: 0.5rem clamp(0.5rem, 3vw, 1.5rem);
    border-inline: 0;
    border-radius: 0;
  }
}

/* Desktop: height-driven. The reader hands over the panel's height, and the sheet
   takes only as much width as a mushaf page's proportions allow — centred, framed,
   the shape of the printed page. Stretching it to the panel's full width instead
   would leave the lines short and squat, or run the page off the bottom.
   `max-width` catches the other case: on a window too narrow for the ratio the
   sheet fills the width and just runs taller, exactly as it does on a phone. */
@media (min-width: 1024px) {
  .mushaf-page {
    align-self: center;
    width: auto;
    aspect-ratio: 3 / 5;
    max-width: min(100%, 640px);
  }
}

.mushaf-page__inner {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  /* Last resort of the page fit (see fitLines): a browser that won't set the text
     as small as it was asked to still has to obey a transform. 1 everywhere the
     fit worked, which is everywhere but iOS's clamped text sizes. */
  transform: scale(var(--page-scale, 1));
  transform-origin: top center;
}

/* `?mushafdebug=1` only. Fixed, so it needs nothing from the page's own
   positioning — and above the reader's bars, so a screenshot always catches it. */
.mushaf-page__debug {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: 70;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0 0.6rem;
  padding: 0.25rem;
  background: var(--color-mushaf-chrome);
  border-top: 1px solid var(--color-mushaf-border);
  font-family: monospace;
  font-size: 10px;
  line-height: 1.4;
  color: var(--color-mushaf-muted);
  pointer-events: none;
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
