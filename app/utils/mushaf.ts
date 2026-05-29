import type { MushafPageData, RenderedLine } from '~/types/mushaf'

/**
 * Convert a verse_key like "2:255" into a sortable integer so we can do
 * cheap range comparisons across surahs. surah * 1000 + verse works because
 * no surah has more than 286 verses (Al-Baqarah).
 */
export function verseKeyOrder(verseKey: string): number {
  const [s, v] = verseKey.split(':')
  return Number(s) * 1000 + Number(v)
}

/**
 * Build a predicate that tells whether a given verse_key falls within the
 * supplied range (inclusive on both ends). Used by RangeViewer to dim
 * words outside the assigned recitation range.
 */
export function makeRangePredicate(
  startSurah: number,
  startVerse: number,
  endSurah: number,
  endVerse: number
): (verseKey: string) => boolean {
  const lo = startSurah * 1000 + startVerse
  const hi = endSurah * 1000 + endVerse
  return (verseKey: string) => {
    const n = verseKeyOrder(verseKey)
    return n >= lo && n <= hi
  }
}

// Quran.com's per-page response only contains ayah words. Lines holding a
// surah header (the decorative "سُورَةُ X" cartouche) or a basmala show up
// as gaps in the line_number sequence. Reconstruct them here so the renderer
// gets a complete 1..N line list.
//
// Rule for filling the gap above a surah's first ayah:
//   2 empty lines → [surah_name, basmala]   (the common case)
//   1 empty line  → [surah_name]            (Al-Fatiha — basmala IS verse 1;
//                                            At-Tawbah — no basmala at all)
//   0 empty lines → no header                (continuation from previous page)
export function synthesizeLines(page: MushafPageData): RenderedLine[] {
  const apiByLine = new Map<number, MushafPageData['lines'][number]>()
  for (const line of page.lines) apiByLine.set(line.n, line)

  const apiLineNos = page.lines.map(l => l.n).sort((a, b) => a - b)
  const maxApiLine = apiLineNos[apiLineNos.length - 1] ?? 15

  // For each surah that *begins* on this page, find the line number where
  // its first ayah lives — we'll fill the gap immediately above it.
  const surahStartLine = new Map<number, number>() // surah → ayah line
  for (const surah of page.surahs) {
    const firstKey = `${surah}:1`
    if (!page.verses.includes(firstKey)) continue
    const startLine = page.lines.find(l =>
      l.words.some(w => w.k === firstKey && w.p === 1)
    )
    if (startLine) surahStartLine.set(surah, startLine.n)
  }

  // For each starting surah, count consecutive empty lines directly above
  // the first-ayah line and emit the right header sequence.
  const headersByLine = new Map<number, RenderedLine>()
  for (const [surah, ayahLine] of surahStartLine) {
    let gap = 0
    for (let n = ayahLine - 1; n >= 1; n--) {
      if (apiByLine.has(n) || headersByLine.has(n)) break
      gap++
    }
    if (gap >= 2) {
      headersByLine.set(ayahLine - 2, { kind: 'surah_name', n: ayahLine - 2, surah })
      headersByLine.set(ayahLine - 1, { kind: 'basmala', n: ayahLine - 1 })
    } else if (gap === 1) {
      headersByLine.set(ayahLine - 1, { kind: 'surah_name', n: ayahLine - 1, surah })
    }
  }

  const result: RenderedLine[] = []
  for (let n = 1; n <= maxApiLine; n++) {
    const apiLine = apiByLine.get(n)
    if (apiLine) {
      result.push({ kind: 'ayah', n, words: apiLine.words })
      continue
    }
    const header = headersByLine.get(n)
    if (header) result.push(header)
    // unexplained gaps stay empty
  }

  return result
}
