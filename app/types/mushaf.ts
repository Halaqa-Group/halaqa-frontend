export interface MushafWord {
  c: string
  k: string
  p: number
  t?: 'e' | 'p' | 'r' | 's'
}

export interface MushafApiLine {
  n: number
  words: MushafWord[]
}

export interface MushafPageData {
  page: number
  surahs: number[]
  verses: string[]
  lines: MushafApiLine[]
}

export type SynthesizedLine =
  | { kind: 'surah_name', n: number, surah: number }
  | { kind: 'basmala', n: number }

export type RenderedLine =
  | SynthesizedLine
  | { kind: 'ayah', n: number, words: MushafWord[] }
