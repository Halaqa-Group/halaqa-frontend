<script setup lang="ts">
import { TRACK_BADGE_COLOR, type AchievementTrack } from '~/utils/achievement'

// What has already been recorded for this student today. Shown in the phone's
// session modal and, on a desktop, as one more section of the reader's rail — so
// the shape lives here instead of being written out at both call sites.
export type PriorRow = {
  id: number
  track: AchievementTrack
  trackLabel: string
  range: string
  mistakes: number
  warnings: number
  harakat: number
}

defineProps<{ items: PriorRow[] }>()

const { t } = useI18n()
</script>

<template>
  <div v-if="items.length" class="prior-list" dir="rtl">
    <p class="prior-list__title">
      تم تسجيله اليوم ({{ items.length }})
    </p>
    <ul class="prior-list__items">
      <li v-for="a in items" :key="a.id" class="prior-list__item">
        <UBadge :color="TRACK_BADGE_COLOR[a.track]" variant="subtle" class="gap-1.5">
          <span class="font-bold">{{ a.trackLabel }}</span>
          <span class="opacity-80">{{ a.range }}</span>
        </UBadge>
        <!-- Spelled out rather than the old «خ ت ج ح» initials, which were
             ambiguous against the legend right above. -->
        <span class="prior-list__counts tabular-nums">
          {{ t('pages.achievements.mistakes') }} {{ a.mistakes }}
          · {{ t('pages.achievements.warnings') }} {{ a.warnings }}
          · {{ t('pages.achievements.harakat') }} {{ a.harakat }}
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.prior-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.prior-list__title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-mushaf-muted);
}

.prior-list__items {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  max-height: 16rem;
  overflow: auto;
}

.prior-list__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}

.prior-list__counts {
  font-size: 0.69rem;
  color: var(--color-mushaf-muted);
}
</style>
