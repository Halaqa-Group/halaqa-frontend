<script setup lang="ts">
import { SURAH_NAMES } from '~/data/constants'
import type { RenderedLine } from '~/types/mushaf'
import type { MarkType, RecitationMarks, WordKey } from '~/types/recitation'

const props = defineProps<{
  line: RenderedLine
  pageNumber: number
  // Optional predicate: words whose verse_key fails the test get dimmed.
  // When undefined, every word renders at full opacity (no range scoping).
  highlight?: (verseKey: string) => boolean
  // Optional mark map keyed by `${verse_key}:${position}`. Words present in
  // the map are tinted by their MarkType.
  marks?: RecitationMarks
  // When provided, each ayah word becomes tappable. The handler receives the
  // WordKey ("2:255:3") and the word's verse_key separately for convenience.
  onWordTap?: (wordKey: WordKey, verseKey: string) => void
}>()

const fontClass = computed(() => `p${props.pageNumber}-v1`)

function wordKey(verseKey: string, position: number): WordKey {
  return `${verseKey}:${position}`
}

function markClass(mark: MarkType | undefined): string | null {
  if (!mark) return null
  return `mushaf-word--${mark}`
}
</script>

<template>
  <div
    v-if="line.kind === 'surah_name'"
    class="mushaf-line mushaf-line--surah"
  >
    <span class="mushaf-surah-cartouche">سُورَةُ {{ SURAH_NAMES[line.surah] }}</span>
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
      v-for="word in line.words"
      :key="`${word.k}:${word.p}`"
      :class="[
        'mushaf-word',
        fontClass,
        markClass(marks?.[wordKey(word.k, word.p)]),
        {
          'mushaf-word--marker': word.t === 'e',
          'mushaf-word--dim': highlight && !highlight(word.k),
          'mushaf-word--tappable': !!onWordTap && word.t !== 'e'
        }
      ]"
      :data-word-key="word.k"
      :data-word-position="word.p"
      @click="onWordTap && word.t !== 'e' && onWordTap(wordKey(word.k, word.p), word.k)"
    >{{ word.c }}</span>
  </div>
</template>

<style scoped>
.mushaf-line {
  display: flex;
  align-items: center;
  min-height: 2.4em;
  line-height: 1;
  justify-content: center;
}

.mushaf-line--ayah {
  /* justify-content: space-between; */
}

.mushaf-line--surah,
.mushaf-line--basmala {
  justify-content: center;
}

.mushaf-surah-cartouche {
  font-family: 'Thmanyah Sans', 'Amiri', serif;
  font-size: clamp(14px, 3.5cqi, 22px);
  font-weight: 600;
  padding: 0.3em 1.2em;
  border: 1px solid currentColor;
  border-radius: 0.4em;
  letter-spacing: 0.02em;
}

.mushaf-basmala {
  font-family: 'Amiri Quran', 'Amiri', 'KFGQPC Uthmanic Script HAFS', serif;
  font-size: clamp(18px, 4.5cqi, 28px);
}

.mushaf-word {
  /* Each word is its own glyph (single private-use char). The page font is
     loaded by useMushafPage(); .p{N}-v1 is the font-family class.

     Font-size scales with the *page container's* width (cqi). At 600px the
     word is ~30px (the canonical KFGQPC v1 size); at 320px it's ~16px.
     This is what keeps every printed line on a single visual row at any
     viewport — no flex-wrap, no overflow. */
  display: inline-block;
  font-size: clamp(15px, 5cqi, 32px);
  color: inherit;
  padding: 0 1px;
  border-radius: 3px;
  transition: background-color 0.12s ease;
}

.mushaf-word--marker {
  /* Ayah-end markers (the ornate circles with numbers) read better with a
     hair of side padding so they don't kiss neighbouring words. */
  margin: 0 0.1em;
}

.mushaf-word--dim {
  /* Words outside the range the teacher is supposed to mark — kept legible
     but visually demoted so the eye lands on the in-range block. */
  opacity: 0.25;
}

.mushaf-word--tappable {
  cursor: pointer;
  /* Vertical hit area sized for touch — Apple HIG suggests ~44px, Material
     ~48px. At the mobile font size of ~1.6em × 15px ≈ 24px, padding-block
     of 0.4em gives ~24 + 19 = 43px. */
  padding: 0.4em 3px;
  /* Disable double-tap-to-zoom on iOS — every word would otherwise feel
     laggy because the browser waits 300ms to confirm it's not a zoom. */
  touch-action: manipulation;
  /* Hide blue tap highlight on Android */
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.mushaf-word--tappable:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.mushaf-word--tappable:active {
  background-color: rgba(0, 0, 0, 0.08);
}

/* Mark tints — semi-transparent so the underlying glyph stays sharp. */
.mushaf-word--mistake {
  background-color: rgba(220, 38, 38, 0.22);
}
.mushaf-word--mistake:hover {
  background-color: rgba(220, 38, 38, 0.32);
}

.mushaf-word--warning {
  background-color: rgba(234, 88, 12, 0.22);
}
.mushaf-word--warning:hover {
  background-color: rgba(234, 88, 12, 0.32);
}

.mushaf-word--tajweed {
  background-color: rgba(22, 163, 74, 0.22);
}
.mushaf-word--tajweed:hover {
  background-color: rgba(22, 163, 74, 0.32);
}
</style>
