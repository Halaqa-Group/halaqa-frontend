<script setup lang="ts">
import { SURAH_HEADER_GLYPHS } from '~/data/surah-header-glyphs'
import { MUSHAF_HOVERED_GROUP } from '~/utils/mushaf-hover'
import type { MushafWord, RenderedLine } from '~/types/mushaf'
import type { MarkGroups, RecitationMarks, Severity, WordKey } from '~/types/recitation'

const props = defineProps<{
  line: RenderedLine
  pageNumber: number
  highlight?: (verseKey: string) => boolean
  marks?: RecitationMarks
  groups?: MarkGroups
  /** Verse ("surah:ayah") of an armed test-spot start, highlighted until closed. */
  pendingVerse?: string | null
  onWordTap?: (wordKey: WordKey, verseKey: string) => void
}>()

const fontClass = computed(() => `p${props.pageNumber}-v1`)

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
    <span class="mushaf-basmala">﷽</span>
  </div>

  <div
    v-else
    class="mushaf-line mushaf-line--ayah"
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
          'mushaf-word--dim': highlight && !highlight(word.k),
          'mushaf-word--spot-pending': pendingVerse && word.k === pendingVerse && word.t !== 'e',
          'mushaf-word--block-hover': isBlockHovered(word),
          'mushaf-word--tappable': !!onWordTap && word.t !== 'e'
        }
      ]"
      :data-word-key="word.k"
      :data-word-position="word.p"
      @mouseenter="onWordEnter(word)"
      @mouseleave="onWordLeave(word)"
      @click="onWordTap && word.t !== 'e' && onWordTap(wordKey(word.k, word.p), word.k)"
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

.mushaf-line {
  display: flex;
  align-items: center;
  min-height: 2.4em;
  line-height: 1;
  justify-content: center;
}

.mushaf-surah-header {
  font-family: 'surah-header';
  /* Scale the banner to the page width like the printed mushaf. */
  font-size: clamp(56px, 24cqi, 150px);
  line-height: 1;
}

.mushaf-line--surah,
.mushaf-line--basmala {
  justify-content: center;
}

.mushaf-basmala {
  font-family: 'Amiri Quran', 'Amiri', 'KFGQPC Uthmanic Script HAFS', serif;
  font-size: clamp(18px, 4.5cqi, 28px);
}

.mushaf-word {
  display: inline-block;
  font-size: clamp(15px, 5cqi, 32px);
  color: inherit;
  padding: 0 1px;
  border-radius: 3px;
  transition: background-color 0.12s ease;
}

.mushaf-word--marker {
  margin: 0 0.1em;
}

.mushaf-word--dim {
  opacity: 0.25;
}

.mushaf-word--tappable {
  cursor: pointer;
  padding: 0.4em 3px;
  /* pan-y keeps native vertical scrolling while reserving horizontal movement
     for drag-to-select (see useWordDragSelect); it also drops the double-tap
     zoom delay the way `manipulation` did. */
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.mushaf-word--tappable:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.mushaf-word--tappable:active {
  background-color: rgba(0, 0, 0, 0.08);
}

.mushaf-word--selecting,
.mushaf-word--selecting:hover {
  background-color: rgba(37, 99, 235, 0.22);
  box-shadow: inset 0 0 0 1.5px rgba(37, 99, 235, 0.45);
}

/* Armed start of a test-spot, waiting for the closing tap. */
.mushaf-word--spot-pending,
.mushaf-word--spot-pending:hover {
  background-color: rgba(37, 99, 235, 0.16);
  box-shadow: inset 0 0 0 1.5px rgba(37, 99, 235, 0.6);
  border-radius: 4px;
}

/* Tarteel-style severity spectrum: red → orange → yellow → green.
   Yellow needs a touch more alpha to read against the page. */
.mushaf-word--severe {
  background-color: rgba(220, 38, 38, 0.22);
}
.mushaf-word--severe:hover {
  background-color: rgba(220, 38, 38, 0.32);
}

.mushaf-word--medium {
  background-color: rgba(234, 88, 12, 0.22);
}
.mushaf-word--medium:hover {
  background-color: rgba(234, 88, 12, 0.32);
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
  --blk-ring: rgba(28, 25, 23, 0.32);
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
.mushaf-word--block-hover.mushaf-word--medium { background-color: rgba(234, 88, 12, 0.32); }
.mushaf-word--block-hover.mushaf-word--light { background-color: rgba(234, 179, 8, 0.42); }
.mushaf-word--block-hover.mushaf-word--minor { background-color: rgba(22, 163, 74, 0.32); }
</style>
