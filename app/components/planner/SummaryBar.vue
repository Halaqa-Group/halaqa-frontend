<script setup lang="ts">
const { weeklySummary } = useSchedule()
</script>

<template>
  <div class="rounded-2xl bg-elevated border border-default px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
    <span class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
      {{ $t('pages.planner.summary.title') }}
    </span>

    <div class="flex flex-col">
      <span class="text-[11px] text-on-surface-variant">
        {{ $t('pages.planner.summary.totalMemAyahs') }}
      </span>
      <span class="text-base font-bold text-track-hifz">
        {{ weeklySummary.totalMemAyahs }} {{ $t('pages.planner.summary.ayahUnit') }}
      </span>
    </div>

    <div class="flex flex-col">
      <span class="text-[11px] text-on-surface-variant">
        {{ $t('pages.planner.summary.reviewSessions') }}
      </span>
      <span class="text-base font-bold text-track-near">
        {{ weeklySummary.reviewSessions }} {{ $t('pages.planner.summary.sessionUnit') }}
      </span>
    </div>

    <div class="flex flex-col">
      <span class="text-[11px] text-on-surface-variant">
        {{ $t('pages.planner.summary.restDays') }}
      </span>
      <span class="text-base font-bold text-track-far">
        {{ weeklySummary.restDays }} {{ $t('pages.planner.summary.dayUnit') }}
      </span>
    </div>

    <div class="flex flex-col">
      <span class="text-[11px] text-on-surface-variant">
        {{ $t('pages.planner.summary.completedDays') }}
      </span>
      <span class="text-base font-bold text-primary">
        {{ $t('pages.planner.summary.outOfWeek', { count: weeklySummary.completedDays }) }}
      </span>
    </div>
  </div>
</template>
