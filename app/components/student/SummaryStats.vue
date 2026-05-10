<script setup lang="ts">
const { summary } = useStudentsView()
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
    <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
      <div class="flex flex-col gap-1 min-w-0">
        <span class="text-xs text-on-surface-variant">
          {{ $t('pages.students.stats.totalStudents') }}
        </span>
        <span class="text-2xl font-bold text-on-surface">{{ summary.total }}</span>
      </div>
      <LucideUsers class="w-7 h-7 text-primary shrink-0" />
    </div>

    <div class="rounded-2xl px-4 py-3 flex items-center justify-between gap-3 bg-track-hifz-bg border border-track-hifz/20">
      <div class="flex flex-col gap-1 min-w-0">
        <span class="text-xs text-track-hifz">
          {{ $t('pages.students.stats.activeStudents') }}
        </span>
        <span class="text-2xl font-bold text-track-hifz">{{ summary.active }}</span>
      </div>
      <LucideUserCheck class="w-7 h-7 text-track-hifz shrink-0" />
    </div>

    <div class="rounded-2xl px-4 py-3 flex items-center justify-between gap-3 bg-surface-container border border-outline-variant">
      <div class="flex flex-col gap-1 min-w-0">
        <span class="text-xs text-on-surface-variant">
          {{ $t('pages.students.stats.inactiveStudents') }}
        </span>
        <span class="text-2xl font-bold text-on-surface">{{ summary.inactive }}</span>
      </div>
      <LucideUserMinus class="w-7 h-7 text-on-surface-variant shrink-0" />
    </div>

    <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
      <div class="flex flex-col gap-1 min-w-0">
        <span class="text-xs text-on-surface-variant">
          {{ $t('pages.students.stats.graduatedStudents') }}
        </span>
        <span class="text-2xl font-bold text-primary">{{ summary.graduated }}</span>
      </div>
      <LucideGraduationCap class="w-7 h-7 text-primary shrink-0" />
    </div>
  </div>
</template>
