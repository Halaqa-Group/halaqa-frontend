import type { BadgeColor } from '~/utils/halaqa'

export type AchievementTrack = 'Hifz' | 'Near' | 'Far'

/** Track → UBadge color (mirrors the track accent colors used across the app). */
export const TRACK_BADGE_COLOR: Record<AchievementTrack, BadgeColor> = {
  Hifz: 'primary',
  Near: 'error',
  Far: 'warning'
}

export const TRACK_ICON: Record<AchievementTrack, string> = {
  Hifz: 'i-lucide-book-open',
  Near: 'i-lucide-refresh-cw',
  Far: 'i-lucide-library'
}

/** Approval status → UBadge color. */
export function achievementStatusColor(status: string): BadgeColor {
  return status === 'approved' ? 'success' : 'warning'
}
