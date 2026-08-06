<script setup lang="ts">
import { SURAH_NAMES } from '~/data/constants'
import { VERSE_COUNTS } from '~/utils/quran'
import { verseToGlobal, globalToVerse } from '~/utils/quran-structure'

const props = withDefaults(defineProps<{
  // Which ayah to land on when the surah changes — the last one when the plan
  // walks backwards through the mushaf.
  snapTo?: 'first' | 'last'
  // On a phone a pair of wheels is ~170px tall, and forms stack several of them
  // (the achievement lesson range plus every موضع, the recite start+end). So on
  // mobile each picker collapses to a one-line summary you tap to open; on wider
  // screens the wheels always show. Opt out with :collapsible="false".
  collapsible?: boolean
}>(), { snapTo: 'first', collapsible: true })

const surah = defineModel<number>('surah', { required: true })
const verse = defineModel<number>('verse', { required: true })

const { t } = useI18n()
const { pageFor } = useVerseToPage()

// Always Western digits (Latin numerals) regardless of locale.
const fmt = (n: number) => String(n)

// Collapsed-card open state (collapsed by default at every breakpoint).
const open = ref(false)
// Surah name + ayah only — no surah number.
const summary = computed(() => `${SURAH_NAMES[surah.value] ?? surah.value} · ${fmt(verse.value)}`)

// The wheels mount while collapsed (display:none), where they can't scroll to the
// selected row. Once we reveal them, wait for Vue to drop the `hidden` class
// (nextTick) then re-anchor both so they open already centred on the current
// surah/ayah — reanchor sets scrollTop, which forces the layout it needs.
const surahWheel = useTemplateRef<{ reanchor: () => void }>('surahWheel')
const verseWheel = useTemplateRef<{ reanchor: () => void }>('verseWheel')
watch(open, (isOpen) => {
  if (!isOpen) return
  nextTick(() => {
    surahWheel.value?.reanchor()
    verseWheel.value?.reanchor()
  })
})

const surahItems = computed(() =>
  Object.entries(SURAH_NAMES).map(([n, name]) => ({ value: Number(n), label: `${fmt(Number(n))} - ${name}` }))
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
    const page = pageFor(`${surah.value}:${v}`)
    const badge = isPageStart(surah.value, v) && page !== undefined
      ? t('pages.planner.pageBadge', { page: fmt(page) })
      : undefined
    out.push({ value: v, label: fmt(v), badge })
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
  <!--
    The header + wheels sit in one rounded card at every breakpoint; tapping the
    header reveals/hides the wheels (collapsed by default). Pass :collapsible="false"
    to skip the card/header and always show the wheels inline.
  -->
  <div :class="collapsible ? 'overflow-hidden rounded-xl border border-default' : ''">
    <button
      v-if="collapsible"
      type="button"
      class="flex w-full items-center justify-between gap-2 px-3 py-3 text-sm"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="min-w-0 truncate font-medium text-highlighted">{{ summary }}</span>
      <UIcon
        :name="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        class="size-5 shrink-0 text-muted"
      />
    </button>
    <div
      class="grid grid-cols-2 gap-2"
      :class="[
        collapsible ? 'px-2 pb-2' : '',
        collapsible && !open ? 'hidden' : ''
      ]"
    >
      <CommonWheelPicker
        ref="surahWheel"
        v-model="surah"
        :items="surahItems"
        :aria-label="t('pages.planner.cell.surahLabel')"
      />
      <CommonWheelPicker
        ref="verseWheel"
        v-model="verse"
        :items="verseItems"
        :aria-label="t('pages.planner.cell.verseLabel')"
      />
    </div>
  </div>
</template>
