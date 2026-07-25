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
  const out: { value: number, label: string, page?: number, pageStart: boolean }[] = []
  for (let v = 1; v <= count; v++) {
    out.push({ value: v, label: String(v), page: pageFor(`${surah.value}:${v}`), pageStart: isPageStart(surah.value, v) })
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
  <div class="grid grid-cols-2 gap-2">
    <USelectMenu
      v-model="surah"
      :items="surahItems"
      value-key="value"
      searchable
      class="w-full"
    />
    <USelectMenu
      v-model="verse"
      :items="verseItems"
      value-key="value"
      searchable
      class="w-full"
    >
      <template #item-trailing="{ item }">
        <UBadge
          v-if="(item as any).pageStart"
          size="sm"
          variant="subtle"
          color="primary"
          class="tabular-nums"
        >
          {{ $t('pages.planner.pageBadge', { page: (item as any).page }) }}
        </UBadge>
      </template>
    </USelectMenu>
  </div>
</template>
