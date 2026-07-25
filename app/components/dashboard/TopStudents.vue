<script setup lang="ts">
import type { ApiTopStudents, DashboardTrack } from '~/types'
import { formatKpiPages, formatKpiScore, rankStyle } from '~/utils/dashboard'

/**
 * The top-students leaderboard (`GET /dashboard/top-students`).
 *
 * Ranked by `total_pages` — الصفحات الكلية — which is what the API sorts by;
 * `positions_pages` (صفحات المواضع, the amount actually recited) rides along as
 * secondary detail. Both are fractional pages, never verses.
 *
 * The rank medal is the only coloured mark; every figure stays in text ink so
 * colour never becomes the thing carrying the number's meaning.
 */

defineProps<{
  data: ApiTopStudents | null
  loading?: boolean
  error?: string | null
}>()

/**
 * The parent owns the track so it can refetch; the select never reads
 * `data.track` off the response, which would make the control flicker back to
 * the old value while the new request is in flight.
 */
const track = defineModel<DashboardTrack>('track', { default: 'Hifz' })

const { t } = useI18n()

const trackItems = computed(() => [
  { label: t('tracks.hifz'), value: 'Hifz' as const },
  { label: t('tracks.near'), value: 'Near' as const },
  { label: t('tracks.far'), value: 'Far' as const }
])
</script>

<template>
  <UCard class="h-full" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-trophy" class="size-5 text-rank-gold" />
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('pages.home.topStudents.title') }}
          </h3>
        </div>

        <USelect
          v-model="track"
          :items="trackItems"
          value-key="value"
          size="sm"
          class="w-40"
          :aria-label="t('pages.home.topStudents.trackLabel')"
        />
      </div>
    </template>

    <div v-if="loading" class="flex items-center justify-center py-14">
      <UIcon name="i-lucide-loader-circle" class="size-7 animate-spin text-primary" />
    </div>

    <div v-else-if="error" class="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <UIcon name="i-lucide-triangle-alert" class="size-7 text-error" />
      <p class="text-sm text-error">
        {{ error }}
      </p>
    </div>

    <div v-else-if="!data || data.items.length === 0" class="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <UIcon name="i-lucide-inbox" class="size-7 text-on-surface-variant" />
      <p class="text-sm text-on-surface-variant">
        {{ t('pages.home.topStudents.empty') }}
      </p>
    </div>

    <ul v-else class="divide-y divide-card-border">
      <li
        v-for="(student, index) in data.items"
        :key="student.student_id"
        class="flex items-center gap-3 px-4 py-3"
      >
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
          :style="rankStyle(index + 1).style"
        >
          <UIcon
            v-if="rankStyle(index + 1).icon"
            :name="rankStyle(index + 1).icon!"
            class="size-4"
          />
          <template v-else>{{ index + 1 }}</template>
        </span>

        <div class="min-w-0 flex-1">
          <NuxtLink
            :to="`/students/${student.student_id}`"
            class="block truncate text-sm font-semibold text-on-surface hover:text-primary"
          >
            {{ student.student_name }}
          </NuxtLink>
          <p class="mt-0.5 text-xs text-on-surface-variant">
            {{ t('pages.home.topStudents.meta', {
              count: student.achievements_count,
              score: formatKpiScore(student.average_score)
            }) }}
          </p>
        </div>

        <div class="shrink-0 text-end">
          <p class="text-sm font-bold tabular-nums text-on-surface">
            {{ formatKpiPages(student.total_pages) }}
            <span class="text-xs font-medium text-on-surface-variant">
              {{ t('pages.home.topStudents.pages') }}
            </span>
          </p>
          <p class="mt-0.5 text-xs tabular-nums text-on-surface-variant">
            {{ t('pages.home.topStudents.positions', { pages: formatKpiPages(student.positions_pages) }) }}
          </p>
        </div>
      </li>
    </ul>
  </UCard>
</template>
