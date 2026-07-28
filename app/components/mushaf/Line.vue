<script setup lang="ts">
import { SURAH_HEADER_GLYPHS } from '~/data/surah-header-glyphs'
import { MUSHAF_HOVERED_GROUP } from '~/utils/mushaf-hover'
import type { MushafWord, RenderedLine } from '~/types/mushaf'
import type { MarkGroups, RecitationMarks, Severity, VerseEdge, VerseLock, WordKey } from '~/types/recitation'

const props = defineProps<{
  line: RenderedLine
  pageNumber: number
  highlight?: (verseKey: string) => boolean
  marks?: RecitationMarks
  groups?: MarkGroups
  /** Verse ("surah:ayah") of an armed test-spot start, highlighted until closed. */
  pendingVerse?: string | null
  /** Verses that can't be picked right now — rendered normally, but inert. */
  lockedAt?: VerseLock
  /** Ayah-end ornaments that bound a tested موضع; recoloured in place. */
  spotEdgeAt?: VerseEdge
  /** Ornaments to pulse briefly, to point out a موضع just navigated to. */
  flashAt?: VerseEdge
  onWordTap?: (wordKey: WordKey, verseKey: string) => void
}>()

// A verse belongs to at most one موضع, so while a new one is being picked the
// verses already taken are out of bounds. They keep their normal appearance —
// they just don't respond to taps and can't be selected.
const locked = computed<boolean[]>(() => {
  const line = props.line
  const at = props.lockedAt
  if (line.kind !== 'ayah' || !at) return []
  return line.words.map(word => word.t !== 'e' && at(word.k))
})

// A موضع is delimited by the mushaf's own ayah ornaments — the one just before
// it starts and the one at its last verse — recoloured, nothing added.
const spotEdge = computed<boolean[]>(() => {
  const line = props.line
  const at = props.spotEdgeAt
  if (line.kind !== 'ayah' || !at) return []
  return line.words.map(word => word.t === 'e' && at(word.k))
})

const spotFlash = computed<boolean[]>(() => {
  const line = props.line
  const at = props.flashAt
  if (line.kind !== 'ayah' || !at) return []
  return line.words.map(word => word.t === 'e' && at(word.k))
})

const fontClass = computed(() => `p${props.pageNumber}-v1`)

// QUL marks the basmala line but ships no words for it, and a page that opens a
// surah carries no basmala glyphs in its own font — so the four words are borrowed
// from 1:1, the one place the mushaf typesets them as an ayah. Same QCF cut as the
// page text, which the spelled-out Unicode in any other Arabic face is not.
const BASMALA_PAGE = 1
const BASMALA_GLYPHS = 'ﭑﭒﭓﭔ'
if (props.line.kind === 'basmala') void ensureMushafFont(BASMALA_PAGE)

function wordKey(verseKey: string, position: number): WordKey {
  return `${verseKey}:${position}`
}

function markClass(mark: Severity | undefined): string | null {
  if (!mark) return null
  return `mushaf-word--${mark}`
}

type BlockPos = 'start' | 'mid' | 'end' | 'single'

// Where each word sits inside its drag-selected block, relative to its same-block
// neighbours on this line (reading order). Used to draw the run as one connected,
// bordered block: only the outer edges get a border/rounding, inner seams merge.
// A block that wraps across lines simply reads as connected sub-blocks per line.
const wordBlocks = computed<(BlockPos | null)[]>(() => {
  const line = props.line
  if (line.kind !== 'ayah') return []
  const words = line.words
  const groupOf = (w: MushafWord | undefined): string | undefined =>
    w && w.t !== 'e' ? props.groups?.[wordKey(w.k, w.p)] : undefined

  return words.map((word, i) => {
    const gid = groupOf(word)
    if (!gid) return null
    const prevSame = groupOf(words[i - 1]) === gid
    const nextSame = groupOf(words[i + 1]) === gid
    if (prevSame && nextSame) return 'mid'
    if (nextSame) return 'start'
    if (prevSame) return 'end'
    return 'single'
  })
})

function blockClass(pos: BlockPos | null | undefined): string | null {
  return pos ? `mushaf-word--block mushaf-word--block-${pos}` : null
}

// ── Block hover ───────────────────────────────────────────────────────────────
// Hovering any word of a block lights the whole run. The hovered block id lives on
// the page (a block can wrap across lines), so all lines react to the same state.
const hoveredGroup = inject(MUSHAF_HOVERED_GROUP, ref<string | null>(null))

function wordGroupId(word: MushafWord): string | undefined {
  return word.t !== 'e' ? props.groups?.[wordKey(word.k, word.p)] : undefined
}
function isBlockHovered(word: MushafWord): boolean {
  const gid = wordGroupId(word)
  return !!gid && hoveredGroup.value === gid
}
function onWordEnter(word: MushafWord) {
  const gid = wordGroupId(word)
  if (gid) hoveredGroup.value = gid
}
function onWordLeave(word: MushafWord) {
  const gid = wordGroupId(word)
  if (gid && hoveredGroup.value === gid) hoveredGroup.value = null
}
</script>

<template>
  <div
    v-if="line.kind === 'surah_name'"
    class="mushaf-line mushaf-line--surah"
  >
    <span class="mushaf-surah-header">{{ SURAH_HEADER_GLYPHS[line.surah] }}</span>
  </div>

  <div
    v-else-if="line.kind === 'basmala'"
    class="mushaf-line mushaf-line--basmala"
  >
    <span class="mushaf-basmala" :class="`p${BASMALA_PAGE}-v1`">{{ BASMALA_GLYPHS }}</span>
  </div>

  <div
    v-else
    class="mushaf-line mushaf-line--ayah"
    :class="{ 'mushaf-line--justified': line.centered === false }"
  >
    <span
      v-for="(word, i) in line.words"
      :key="`${word.k}:${word.p}`"
      :class="[
        'mushaf-word',
        fontClass,
        markClass(marks?.[wordKey(word.k, word.p)]),
        blockClass(wordBlocks[i]),
        {
          'mushaf-word--marker': word.t === 'e',
          'mushaf-word--spot-edge': spotEdge[i],
          'mushaf-word--spot-flash': spotFlash[i],
          'mushaf-word--dim': highlight && !highlight(word.k),
          'mushaf-word--locked': locked[i],
          'mushaf-word--spot-pending': pendingVerse && word.k === pendingVerse && word.t !== 'e',
          'mushaf-word--block-hover': isBlockHovered(word),
          'mushaf-word--body': word.t !== 'e',
          'mushaf-word--tappable': !!onWordTap && word.t !== 'e' && !locked[i]
        }
      ]"
      :data-word-key="word.k"
      :data-word-position="word.p"
      @mouseenter="onWordEnter(word)"
      @mouseleave="onWordLeave(word)"
      @click="!locked[i] && onWordTap && word.t !== 'e' && onWordTap(wordKey(word.k, word.p), word.k)"
    >{{ word.c }}</span>
  </div>
</template>

<style scoped>
/* Authentic KFGQPC surah-header banner (QUL "Surah header font" #458):
   one glyph per surah = the ornamental frame with the name inside. */
@font-face {
  font-family: 'surah-header';
  src: url('/quran/fonts/surah-name/surah-header.woff2') format('woff2');
  font-display: swap;
}

/* The 15 lines share out the page's height evenly (see Page.vue) rather than each
   sizing to its own content — that is what makes a page fit the screen it is on.
   `--mushaf-line-h` is only the fallback for a page laid out by its own content. */
.mushaf-line {
  display: flex;
  align-items: center;
  flex: 1 1 0;
  min-height: 0;
  height: auto;
  line-height: 1;
  justify-content: center;
}

/* A printed mushaf sets its body lines flush to both margins and centres only the
   short ones — a surah's closing line, the header, the basmala. QUL ships that
   distinction per line as `is_centered`; `space-between` reproduces it exactly,
   because the QCF page font is cut so a full line fills the measure. Lines must
   never wrap: a wrapped line would be justified into nonsense. */
.mushaf-line--justified {
  justify-content: space-between;
  flex-wrap: nowrap;
}

.mushaf-surah-header {
  font-family: 'surah-header';
  /* Full measure, like the printed mushaf. Every one of the 114 banner glyphs is
     cut to exactly 3.302em, so 100cqi / 3.302 ≈ 30.25cqi sets any surah's frame
     flush to both margins — no per-surah measuring. Rounded down, not up: at 30.3
     the frame cleared the measure by a hair and clipped. No lower bound either — a
     px floor stops tracking the measure the moment it bites, and the frame runs off
     both sides of a small page. */
  font-size: min(30.25cqi, 200px);
  line-height: 1;
}

.mushaf-line--surah,
.mushaf-line--basmala {
  justify-content: center;
}

/* The banner is cut to the full measure, which makes it taller than the fifteenth of
   the page every line is handed — its frame ended up sitting on the basmala
   underneath. Give it a larger share of the column so the two keep their air; the
   body lines give up a couple of pixels each, which is how a printed mushaf spaces
   an opening page anyway. */
.mushaf-line--surah {
  flex-grow: 1.8;
}
.mushaf-line--basmala {
  flex-grow: 1.15;
}

/* No font-family here: the `p1-v1` class the loader injects into <head> supplies it,
   the same way the body words take theirs from `p{N}-v1`. A scoped rule would
   out-specify that class and silently drop the page font. */
.mushaf-basmala {
  /* Sized off the measure like the surah banner above it, not off a px range: a px
     clamp bottomed out on the phone, leaving the basmala smaller than the body
     words it sits between. The four glyphs run 4.52em, so 9.5cqi ≈ 43% of the
     measure — set in from both margins, well clear of the banner above it. Same
     reason as the banner for having no floor. */
  font-size: min(9.5cqi, 52px);
  line-height: 1;
}

.mushaf-word {
  /*
    The base size is width-driven; `--line-fit` (set per line by Page.vue) then
    stretches or trims it so a justified line ends exactly at the margin instead of
    leaving slack for `space-between` to dump into the word gaps. Centred lines —
    the surah banner, the basmala, a surah's short last line — carry no fit and just
    use the base.
  */
  /* Capped against the page's width AND its height: each of the 15 lines gets about
     a fifteenth of the block size, and a word stands ~1.8× its font-size tall once
     its padding counts — hence ~3.4% of the block. No lower floor: a floor that
     bites cannot be undone by `--line-fit`, and the line overflows the margin
     instead. Small text on a short window is honest; a page that spills is not. */
  --mushaf-word-size: min(36px, 5.5cqi, 3.4cqb);
  display: inline-block;
  /* Never shrink. A justified line is a nowrap flex row, so the moment its words
     add up to more than the measure — a rasterizer that sets the glyphs a hair
     wider than the fit pass measured, iOS being the one seen doing it — the
     default `flex-shrink: 1` squeezes the boxes into each other and an ayah
     ornament lands on top of the word before it. Fixed boxes turn that failure
     into a line that ends a hair past the margin, which is invisible, instead of
     overlapping glyphs, which is not. */
  flex: 0 0 auto;
  font-size: calc(var(--mushaf-word-size) * var(--line-fit, 1));
  color: inherit;
  padding: 0 1px;
  border-radius: 3px;
  transition: background-color 0.12s ease;
}

/* The ornament keeps a little air of its own. The QCF advances already carry the
   mushaf's spacing, but the ornament is the one glyph whose ink is a closed ring:
   where anything eats into the gaps — a line set a hair too wide, a browser sizing
   the text its own way — a ring landing on the word beside it is unmistakable in a
   way two words touching is not. The fit counts these margins, so the cost is a
   couple of percent on ornament-dense lines. */
.mushaf-word--marker {
  margin: 0 0.15em;
}

.mushaf-word--dim {
  opacity: 0.25;
}

/* Word metrics live here, not on --tappable, so the page keeps identical line
   spacing whether or not marking is enabled. A read-only view (parent, or an
   approved achievement) must lay out exactly like the editable one. */
.mushaf-word--body {
  /* Horizontal padding is a fixed pixel amount that does NOT scale with the font, so
     every word of it is width the page fit cannot recover — and it lands unevenly,
     since a word-dense line carries more of it than a sparse one. Trimmed to a hair:
     the QCF advances already carry the mushaf's own inter-word spacing. */
  padding: 0.4em 1px;
}

.mushaf-word--tappable {
  cursor: pointer;
  /* pan-y keeps native vertical scrolling while reserving horizontal movement
     for drag-to-select (see useWordDragSelect); it also drops the double-tap
     zoom delay the way `manipulation` did. */
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.mushaf-word--tappable:hover {
  background-color: rgb(var(--mushaf-ink-rgb) / 0.06);
}

.mushaf-word--tappable:active {
  background-color: rgb(var(--mushaf-ink-rgb) / 0.1);
}

.mushaf-word--selecting,
.mushaf-word--selecting:hover {
  background-color: rgb(var(--mushaf-spot-rgb) / 0.22);
  box-shadow: inset 0 0 0 1.5px rgb(var(--mushaf-spot-rgb) / 0.45);
}

/* Armed start of a test-spot, waiting for the closing tap. */
.mushaf-word--spot-pending,
.mushaf-word--spot-pending:hover {
  background-color: rgb(var(--mushaf-spot-rgb) / 0.16);
  box-shadow: inset 0 0 0 1.5px rgb(var(--mushaf-spot-rgb) / 0.6);
  border-radius: 4px;
}

/* Verses already inside a موضع, while a new one is being picked. No styling of
   their own — they look exactly like the rest of the page, they just can't be
   tapped or selected (`--tappable` is withheld, so no hover, cursor or handler). */
.mushaf-word--locked {
  user-select: none;
}

/* The ayah ornaments bounding a tested موضع: the glyph is recoloured and nothing
   else changes, so the page keeps its own look and its exact metrics. */
.mushaf-word--spot-edge {
  color: var(--color-mushaf-spot);
}

/* Pulsed for a moment after jumping to a موضع, so the eye lands on its two ends.
   `transform` doesn't affect layout, so the line never reflows. */
.mushaf-word--spot-flash {
  animation: mushaf-spot-flash 0.5s ease-in-out 3;
  transform-origin: center;
}

@keyframes mushaf-spot-flash {
  50% {
    transform: scale(1.45);
    opacity: 0.5;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mushaf-word--spot-flash {
    animation: none;
  }
}

/* Tarteel-style severity spectrum: red → yellow → green.
   Yellow needs a touch more alpha to read against the page. */
.mushaf-word--severe {
  background-color: rgba(220, 38, 38, 0.22);
}
.mushaf-word--severe:hover {
  background-color: rgba(220, 38, 38, 0.32);
}

.mushaf-word--light {
  background-color: rgba(234, 179, 8, 0.30);
}
.mushaf-word--light:hover {
  background-color: rgba(234, 179, 8, 0.42);
}

.mushaf-word--minor {
  background-color: rgba(22, 163, 74, 0.22);
}
.mushaf-word--minor:hover {
  background-color: rgba(22, 163, 74, 0.32);
}

/* ── Drag-selected block ──────────────────────────────────────────────────────
   A run of words marked together reads as ONE block: the severity fill still
   colours every word, but only the outer edges are rounded/bordered so the run
   looks continuous. Tapping any word cycles the whole block (see tap()).
   `--blk-ring` outlines the run; inner seams (mid words) carry only top/bottom. */
.mushaf-word--block {
  --blk-ring: rgb(var(--mushaf-ink-rgb) / 0.32);
  border-radius: 0;
}

.mushaf-word--block-mid {
  box-shadow:
    inset 0 1.5px 0 var(--blk-ring),
    inset 0 -1.5px 0 var(--blk-ring);
}

/* Reading order is right-to-left: the run's first word is on the right. */
.mushaf-word--block-start {
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
  box-shadow:
    inset 0 1.5px 0 var(--blk-ring),
    inset 0 -1.5px 0 var(--blk-ring),
    inset -1.5px 0 0 var(--blk-ring);
}

.mushaf-word--block-end {
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
  box-shadow:
    inset 0 1.5px 0 var(--blk-ring),
    inset 0 -1.5px 0 var(--blk-ring),
    inset 1.5px 0 0 var(--blk-ring);
}

.mushaf-word--block-single {
  border-radius: 4px;
  box-shadow: inset 0 0 0 1.5px var(--blk-ring);
}

/* Group hover: hovering any word lights the whole block at the severity's hover
   shade (mirrors the per-word :hover values above), so the run reacts as one. */
.mushaf-word--block-hover.mushaf-word--severe { background-color: rgba(220, 38, 38, 0.32); }
.mushaf-word--block-hover.mushaf-word--light { background-color: rgba(234, 179, 8, 0.42); }
.mushaf-word--block-hover.mushaf-word--minor { background-color: rgba(22, 163, 74, 0.32); }

/* The severity alphas are tuned against cream. Over the dark page's near-black
   ground the same values read as barely-there smudges, so they open up. */
.dark .mushaf-word--severe { background-color: rgba(248, 113, 113, 0.3); }
.dark .mushaf-word--severe:hover { background-color: rgba(248, 113, 113, 0.42); }
.dark .mushaf-word--light { background-color: rgba(250, 204, 21, 0.34); }
.dark .mushaf-word--light:hover { background-color: rgba(250, 204, 21, 0.46); }
.dark .mushaf-word--minor { background-color: rgba(74, 222, 128, 0.28); }
.dark .mushaf-word--minor:hover { background-color: rgba(74, 222, 128, 0.4); }
.dark .mushaf-word--block-hover.mushaf-word--severe { background-color: rgba(248, 113, 113, 0.42); }
.dark .mushaf-word--block-hover.mushaf-word--light { background-color: rgba(250, 204, 21, 0.46); }
.dark .mushaf-word--block-hover.mushaf-word--minor { background-color: rgba(74, 222, 128, 0.4); }
</style>
