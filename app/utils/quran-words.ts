import wordCountsData from '~/data/word-counts.json'
import quranStructure from '~/data/quran-structure.json'
import { verseToGlobal, verseKeyToGlobal } from '~/utils/quran-structure'

// Turns a Quran location (surah, ayah, word position) into the stable, monotonic
// QUL-order word id the backend stores for achievement errors, plus the juz/hizb
// that ayah falls in. The backend has no QUL dataset, so these ids only need to
// be consistent mushaf-order integers — which is exactly what a prefix-sum of the
// per-ayah word-entry counts produces.
//
// The per-ayah word counts and juz/hizb boundaries are bundled as committed app
// data (fixed canonical values), NOT fetched from the git-ignored generated
// assets — a missing/stale/truncated `word-counts.json` used to make `wordId`
// return NaN (serialized as `null`), which the backend rejected with
// "start_word_id must not be less than 1".

export interface ErrorLocation {
  start_word_id: number
  end_word_id: number
  surah: number
  ayah: number
  juz: number
  hizb: number
}

// prefix[g] = total word entries before the g-th ayah (1-based global index).
// So the first word id of ayah g is prefix[g - 1] + 1.
const wordPrefix: number[] = (() => {
  const counts = (wordCountsData as { wordCounts: number[] }).wordCounts ?? []
  const prefix: number[] = [0]
  for (let i = 0; i < counts.length; i++) prefix.push(prefix[i]! + counts[i]!)
  return prefix
})()
const juzGlobals: number[] = ((quranStructure as { juzStarts: string[] }).juzStarts ?? []).map(verseKeyToGlobal)
const hizbGlobals: number[] = ((quranStructure as { hizbStarts: string[] }).hizbStarts ?? []).map(verseKeyToGlobal)

export function isQuranWordDataReady(): boolean {
  return true
}

// Kept async for call-site compatibility — the data is bundled, so it resolves
// immediately with nothing to load.
export function ensureQuranWordData(): Promise<boolean> {
  return Promise.resolve(true)
}

// The 1-based QUL word id of the first word of an ayah.
export function firstWordId(surah: number, verse: number): number {
  const g = verseToGlobal(surah, verse) // 1-based global ayah index
  const idx = Math.min(Math.max(g, 1), wordPrefix.length - 1)
  return (wordPrefix[idx - 1] ?? 0) + 1
}

// The QUL word id of a specific word within an ayah (position is 1-based).
export function wordId(surah: number, verse: number, position: number): number {
  return firstWordId(surah, verse) + Math.max(1, position) - 1
}

// The 1-based unit number (juz 1–30, hizb 1–60) an ayah falls in.
function unitNumber(boundaries: number[] | null, surah: number, verse: number): number {
  if (!boundaries || boundaries.length === 0) return 1
  const g = verseToGlobal(surah, verse)
  let ans = 1
  for (let i = 0; i < boundaries.length; i++) {
    if (boundaries[i]! <= g) ans = i + 1
    else break
  }
  return ans
}

export function juzOf(surah: number, verse: number): number {
  return unitNumber(juzGlobals, surah, verse)
}

export function hizbOf(surah: number, verse: number): number {
  return unitNumber(hizbGlobals, surah, verse)
}

// Convenience: the full error-location payload for a single-word (or word-span)
// error. When `endPosition` is omitted the error covers one word.
export function locateError(
  surah: number,
  verse: number,
  startPosition = 1,
  endPosition?: number
): ErrorLocation {
  const start = wordId(surah, verse, startPosition)
  const end = endPosition != null ? wordId(surah, verse, endPosition) : start
  return {
    start_word_id: start,
    end_word_id: Math.max(start, end),
    surah,
    ayah: verse,
    juz: juzOf(surah, verse),
    hizb: hizbOf(surah, verse)
  }
}
