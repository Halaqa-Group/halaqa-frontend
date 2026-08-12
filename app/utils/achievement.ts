import type { BadgeColor } from '~/utils/halaqa'

export type AchievementTrack = 'Hifz' | 'Near' | 'Far'

export const TRACK_BADGE_COLOR: Record<AchievementTrack, BadgeColor> = {
  Hifz: 'primary',
  Near: 'error',
  Far: 'warning'
}

/**
 * The order the tracks are always presented in — حفظ، ثم المراجعة القريبة، ثم
 * المراجعة البعيدة. That's the sequence a session is worked through, so every list
 * of tracks (or of items carrying one) follows it rather than whatever order the
 * rows happen to arrive in.
 */
export const TRACK_ORDER: AchievementTrack[] = ['Hifz', 'Near', 'Far']

const TRACK_RANK: Record<string, number> = { Hifz: 0, Near: 1, Far: 2 }

/**
 * Comparator over anything carrying a `track_type`. An unrecognised track sorts
 * last rather than silently ahead of حفظ, so a value the client doesn't know about
 * can't take the lead slot.
 */
export function byTrackOrder(a: { track_type: string }, b: { track_type: string }): number {
  return (TRACK_RANK[a.track_type] ?? TRACK_ORDER.length) - (TRACK_RANK[b.track_type] ?? TRACK_ORDER.length)
}

export const TRACK_ICON: Record<AchievementTrack, string> = {
  Hifz: 'i-lucide-book-open',
  Near: 'i-lucide-refresh-cw',
  Far: 'i-lucide-library'
}

export function achievementStatusColor(status: string): BadgeColor {
  return status === 'approved' ? 'success' : 'warning'
}
