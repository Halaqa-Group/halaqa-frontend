<script setup lang="ts">
import { SURAH_NAMES } from '~/data/constants'
import { VERSE_COUNTS } from '~/utils/quran'
import { verseToGlobal, globalToVerse } from '~/utils/quran-structure'

const props = withDefaults(defineProps<{
  // Which ayah to land on when the surah changes — the last one when the plan
  // walks backwards through the mushaf.
  snapTo?: 'first' | 'last'
}>(), { snapTo: 'first' })

const surah = defineModel<number>('surah', { required: true })
const verse = defineModel<number>('verse', { required: true })

const { t } = useI18n()
const { pageFor } = useVerseToPage()

const surahItems = computed(() =>
  Object.entries(SURAH_NAMES).map(([n, name]) => ({ value: Number(n), label: name }))
)

function isPageStart(s: number, v: number): boolean {
  const page = pageFor(`${s}:${v}`)
  if (page === undefined) return false
  const g = verseToGlobal(s, v)
  if (g <= 1) return true
  const prev = globalToVerse(g - 1)
  return pageFor(`${prev.surah}:${prev.verse}`) !== page
}

const verseItems = computed(() => {
  const count = VERSE_COUNTS[surah.value] || 1
  const out: { value: number, label: string, badge?: string }[] = []
  for (let v = 1; v <= count; v++) {
    // Badge a verse with the mushaf page it opens, but only where a page begins —
    // the same cue the old dropdown showed, carried onto the wheel row.
    const badge = isPageStart(surah.value, v)
      ? t('pages.planner.pageBadge', { page: pageFor(`${surah.value}:${v}`) })
      : undefined
    out.push({ value: v, label: String(v), badge })
  }
  return out
})

watch(surah, () => {
  const max = VERSE_COUNTS[surah.value] || 1
  if (props.snapTo === 'last') verse.value = max
  else if (verse.value > max || verse.value < 1) verse.value = 1
})
</script>

<template>
  <!--
    An inline wheel per column: the surah on the left, its ayah on the right. No
    popover or teleport, so the old z-index dance around the recite reader's
    finish-sheet is gone — the wheels live in the normal flow of whatever card
    they sit in.
  -->
  <div class="grid grid-cols-2 gap-2">
    <CommonWheelPicker
      v-model="surah"
      :items="surahItems"
      :aria-label="t('pages.planner.cell.surahLabel')"
    />
    <CommonWheelPicker
      v-model="verse"
      :items="verseItems"
      :aria-label="t('pages.planner.cell.verseLabel')"
    />
  </div>
</template>
