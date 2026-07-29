<script setup lang="ts">
import { TRACK_BADGE_COLOR, type AchievementTrack } from '~/utils/achievement'

// Who is reciting, and which lesson. On a phone this is the body of the session
// modal; on a desktop it is the standing head of the reader's rail — the same
// three facts either way, so they are stated once here rather than twice.
defineProps<{
  /** «تلاوة في المصحف» / «… معتمد (للعرض)» / «… للعرض فقط». */
  statusLabel: string
  studentName: string
  date: string
  track?: AchievementTrack | null
  trackLabel?: string | null
  range: string
}>()
</script>

<template>
  <div class="session-identity" dir="rtl">
    <p class="session-identity__status">
      {{ statusLabel }}
    </p>
    <p class="session-identity__name">
      {{ studentName }}
    </p>
    <div class="session-identity__badges">
      <UBadge color="neutral" variant="subtle" size="sm" class="tabular-nums">
        {{ date }}
      </UBadge>
      <UBadge
        v-if="track"
        :color="TRACK_BADGE_COLOR[track]"
        variant="subtle"
        size="sm"
      >
        {{ trackLabel }}
      </UBadge>
      <UBadge color="neutral" variant="subtle" size="sm">
        {{ range }}
      </UBadge>
    </div>
  </div>
</template>

<style scoped>
.session-identity {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.session-identity__status {
  font-size: 0.69rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--color-primary);
}

.session-identity__name {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.session-identity__badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.1rem;
}
</style>
