import quranStructure from '~/data/quran-structure.json'
import { SURAH_NAMES } from '~/data/constants'
import { TOTAL_VERSES, globalToVerse, verseKeyToGlobal } from '~/utils/quran-structure'
import { juzOf, hizbOf } from '~/utils/quran-words'

// What the reader's top and bottom bars print about the page on screen. All of it
// is derived from bundled data — `quran-structure.json` and the per-ayah word
// counts — so a page change updates the chrome in the same tick as the text, with
// no fetch and nothing to await.

const PAGE_START_GLOBALS: number[] = (quranStructure.pageStarts as string[]).map(verseKeyToGlobal)

export interface MushafPageMeta {
  page: number
  surah: number
  surahName: string
  juz: number
  hizb: number
}

/**
 * Pure lookup for a mushaf page number, or null outside 1–604.
 *
 * Read off the page's LAST ayah, not its first. A printed mushaf labels a page by
 * where it leaves the reader: page ٥٠٢ opens in الجاثية but is headed الأحقاف · جزء ٢٦,
 * because الأحقاف begins partway down it and juz ٢٦ starts there too. Labelling by
 * the first ayah would name the surah the reader has already finished.
 */
export function pageMetaFor(page: number | undefined | null): MushafPageMeta | null {
  if (!page) return null
  if (PAGE_START_GLOBALS[page - 1] === undefined) return null
  const endGlobal = (PAGE_START_GLOBALS[page] ?? TOTAL_VERSES + 1) - 1
  const { surah, verse } = globalToVerse(endGlobal)
  return {
    page,
    surah,
    surahName: SURAH_NAMES[surah] ?? `سورة ${surah}`,
    juz: juzOf(surah, verse),
    hizb: hizbOf(surah, verse)
  }
}

export function useMushafPageMeta(page: MaybeRefOrGetter<number | undefined | null>) {
  const meta = computed(() => pageMetaFor(toValue(page)))

  return {
    meta,
    surahName: computed(() => meta.value?.surahName ?? ''),
    juz: computed(() => meta.value?.juz ?? null),
    hizb: computed(() => meta.value?.hizb ?? null)
  }
}
