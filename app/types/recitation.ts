// One of the three error categories a teacher can attach to a recited word.
// The chosen names match backend Achievement counters (mistakes_count,
// warnings_count, tajweed_errors_count) so we can derive totals straight
// from the session state when submitting.
export type MarkType = 'mistake' | 'warning' | 'tajweed'

// Stable per-word identifier — `${verse_key}:${position_in_verse}`, e.g. "2:255:3".
// Used as the key into the marks map and as a DOM data-attribute for tap routing.
export type WordKey = string

export type RecitationMarks = Record<WordKey, MarkType>

export interface MarkCounts {
  mistake: number
  warning: number
  tajweed: number
  total: number
}
