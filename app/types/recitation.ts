export type MarkType = 'mistake' | 'warning' | 'tajweed'

export type WordKey = string

export type RecitationMarks = Record<WordKey, MarkType>

export interface MarkCounts {
  mistake: number
  warning: number
  tajweed: number
  total: number
}
