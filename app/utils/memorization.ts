import { globalToVerse, verseToGlobal, TOTAL_VERSES } from '~/utils/quran-structure'

export const MEMORIZATION_BYTES = 780
export const TOTAL_AYAT = TOTAL_VERSES

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const B64_LOOKUP: Record<string, number> = {}
for (let i = 0; i < B64_ALPHABET.length; i++) B64_LOOKUP[B64_ALPHABET[i]!] = i

/**
 * Decode the base64 bitmap payload into raw bytes. Pure JS so it runs
 * identically on the server (SSR) and client, without atob or Buffer.
 */
export function decodeBitmap(base64: string): Uint8Array {
  if (!base64) return new Uint8Array(MEMORIZATION_BYTES)
  const clean = base64.replace(/[^a-z0-9+/]/gi, '')
  const out = new Uint8Array((clean.length * 3) >> 2)
  let bits = 0
  let acc = 0
  let o = 0
  for (const ch of clean) {
    acc = (acc << 6) | (B64_LOOKUP[ch] ?? 0)
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out[o++] = (acc >> bits) & 0xFF
    }
  }
  return out
}

/** Is the given ayah marked memorized in this bitmap? */
export function isAyahMemorized(bitmap: Uint8Array, surah: number, verse: number): boolean {
  const i = verseToGlobal(surah, verse) - 1
  if (i < 0 || i >= TOTAL_AYAT) return false
  const byte = bitmap[i >> 3]
  if (byte === undefined) return false
  return (byte & (0x80 >> (i & 7))) !== 0
}

/** Build a mushaf highlight predicate (`(verseKey) => boolean`) from a bitmap. */
export function memorizedPredicate(bitmap: Uint8Array): (verseKey: string) => boolean {
  return (verseKey: string) => {
    const [s, v] = verseKey.split(':').map(Number)
    if (!s || !v) return false
    return isAyahMemorized(bitmap, s, v)
  }
}

export interface MemorizedRange {
  startSurah: number
  startVerse: number
  endSurah: number
  endVerse: number
}

/**
 * Collapse the bitmap into contiguous memorized runs (in mushaf order). Each run
 * may span multiple surahs, mirroring how the backend stores cross-surah ranges.
 */
export function decodeRanges(bitmap: Uint8Array): MemorizedRange[] {
  const ranges: MemorizedRange[] = []
  let runStart = -1 // 1-based global index of the current run's first ayah

  const closeRun = (endGlobal: number) => {
    if (runStart < 0) return
    const start = globalToVerse(runStart)
    const end = globalToVerse(endGlobal)
    ranges.push({
      startSurah: start.surah,
      startVerse: start.verse,
      endSurah: end.surah,
      endVerse: end.verse
    })
    runStart = -1
  }

  for (let g = 1; g <= TOTAL_AYAT; g++) {
    const i = g - 1
    const byte = bitmap[i >> 3]
    const set = byte !== undefined && (byte & (0x80 >> (i & 7))) !== 0
    if (set) {
      if (runStart < 0) runStart = g
    } else {
      closeRun(g - 1)
    }
  }
  closeRun(TOTAL_AYAT)

  return ranges
}
