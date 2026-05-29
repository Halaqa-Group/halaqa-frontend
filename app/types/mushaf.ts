// Compact shape served from public/quran/pages/{N}.json — keys are short to
// keep the wire size down (see public/quran/README.md for the schema).
export interface MushafWord {
  c: string // QPC v1 glyph character (single PUA char that maps via p{N}-v1 font)
  k: string // verse_key, e.g. "2:255"
  p: number // position within verse (1-based)
  t?: 'e' | 'p' | 'r' | 's' // char type: end-marker / pause / rub / sajdah; absent for normal words
}

export interface MushafApiLine {
  n: number // line number on the page (1..15); some are missing — gaps are header lines
  words: MushafWord[]
}

export interface MushafPageData {
  page: number
  surahs: number[]
  verses: string[]
  lines: MushafApiLine[]
}

// Header lines we synthesize for surah starts (api data only contains ayah lines).
export type SynthesizedLine =
  | { kind: 'surah_name', n: number, surah: number }
  | { kind: 'basmala', n: number }

export type RenderedLine =
  | SynthesizedLine
  | { kind: 'ayah', n: number, words: MushafWord[] }
