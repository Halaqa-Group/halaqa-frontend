<script setup lang="ts">
import { SURAH_NAMES } from '~/data/constants'
import type { RenderedLine } from '~/types/mushaf'
import type { MarkType, RecitationMarks, WordKey } from '~/types/recitation'

const props = defineProps<{
  line: RenderedLine
  pageNumber: number
  highlight?: (verseKey: string) => boolean
  marks?: RecitationMarks
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
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.mushaf-word--tappable:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.mushaf-word--tappable:active {
  background-color: rgba(0, 0, 0, 0.08);
}

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
