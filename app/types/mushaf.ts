export interface MushafWord {
  c: string
  k: string
  p: number
  t?: 'e' | 'p' | 'r' | 's'
}

export interface MushafApiLine {
  n: number
  words: MushafWord[]
  /** Authoritative line type from the QUL layout (absent for legacy quran.com data). */
  lt?: 'ayah' | 'surah_name' | 'basmallah'
  /** Surah number for a surah_name line. */
  surah?: number
}

export interface MushafPageData {
  page: number
  surahs: number[]
  verses: string[]
  lines: MushafApiLine[]
}

export type SynthesizedLine
  = | { kind: 'surah_name', n: number, surah: number }
    | { kind: 'basmala', n: number }

export type RenderedLine
  = | SynthesizedLine
    | { kind: 'ayah', n: number, words: MushafWord[] }
