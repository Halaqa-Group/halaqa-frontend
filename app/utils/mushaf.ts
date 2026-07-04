import type { MushafPageData, RenderedLine } from '~/types/mushaf'

export function verseKeyOrder(verseKey: string): number {
  const [s, v] = verseKey.split(':')
  return Number(s) * 1000 + Number(v)
}

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

export function synthesizeLines(page: MushafPageData): RenderedLine[] {
  if (page.lines.some(l => l.lt)) {
    const out: RenderedLine[] = []
    for (const line of page.lines) {
      if (line.lt === 'surah_name') out.push({ kind: 'surah_name', n: line.n, surah: line.surah ?? 0 })
      else if (line.lt === 'basmallah') out.push({ kind: 'basmala', n: line.n })
      else out.push({ kind: 'ayah', n: line.n, words: line.words })
    }
    return out
  }

  const apiByLine = new Map<number, MushafPageData['lines'][number]>()
  for (const line of page.lines) apiByLine.set(line.n, line)

  const apiLineNos = page.lines.map(l => l.n).sort((a, b) => a - b)
  const maxApiLine = apiLineNos[apiLineNos.length - 1] ?? 15

  const surahStartLine = new Map<number, number>()
  for (const surah of page.surahs) {
    const firstKey = `${surah}:1`
    if (!page.verses.includes(firstKey)) continue
    const startLine = page.lines.find(l =>
      l.words.some(w => w.k === firstKey && w.p === 1)
    )
    if (startLine) surahStartLine.set(surah, startLine.n)
  }

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
  }

  return result
}
