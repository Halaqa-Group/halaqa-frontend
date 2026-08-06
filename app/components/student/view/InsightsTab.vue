<script setup lang="ts">
import type { Student } from '~/types'
import { SURAH_NAMES } from '~/data/constants'
import { VERSE_COUNTS } from '~/utils/quran'
import { isAyahMemorized, TOTAL_AYAT } from '~/utils/memorization'

const props = defineProps<{ student: Student }>()
const { t } = useI18n()

const { bitmap, count, percentage, loading, error, load }
  = useStudentMemorization(() => props.student.id)

onMounted(load)
watch(() => props.student.id, load)

interface SurahCoverage {
  surah: number
  memorized: number
  total: number
  fraction: number
}

// Per-surah memorized fraction, derived from the ayah bitmap (6236 ayat, cheap).
const coverage = computed<SurahCoverage[]>(() => {
  const bm = bitmap.value
  const out: SurahCoverage[] = []
  for (let surah = 1; surah <= 114; surah++) {
    const total = VERSE_COUNTS[surah] ?? 0
    let memorized = 0
    for (let v = 1; v <= total; v++) {
      if (isAyahMemorized(bm, surah, v)) memorized++
    }
    out.push({ surah, memorized, total, fraction: total ? memorized / total : 0 })
  }
  return out
})

// Heat buckets — literal classes so Tailwind keeps them; primary opacity ∝ coverage.
function tileClass(f: number): string {
  if (f <= 0) return 'bg-elevated text-muted'
  if (f >= 1) return 'bg-primary text-inverted'
  if (f >= 0.75) return 'bg-primary/80 text-inverted'
  if (f >= 0.5) return 'bg-primary/60 text-inverted'
  if (f >= 0.25) return 'bg-primary/40'
  return 'bg-primary/20'
}

function tileTitle(c: SurahCoverage): string {
  const name = SURAH_NAMES[c.surah] ?? `${c.surah}`
  const pct = Math.round(c.fraction * 100)
  return `${c.surah}. ${name} · ${c.memorized}/${c.total} (${pct}%)`
}
</script>

<template>
  <div class="flex flex-col gap-4 pt-4">
    <div class="min-w-0">
      <h3 class="font-semibold">
        {{ t('pages.students.viewModal.insights.title') }}
      </h3>
      <p class="text-xs text-muted">
        {{ t('pages.students.viewModal.insights.subtitle') }}
      </p>
    </div>

    <div v-if="loading" class="py-10 text-center text-sm text-muted">
      {{ t('common.loading') }}
    </div>

    <div v-else-if="error" class="rounded-xl bg-status-conflict-bg p-4 text-center text-sm text-status-conflict">
      {{ error }}
    </div>

    <template v-else>
      <!-- Overall progress -->
      <div class="flex items-end justify-between gap-3">
        <div>
          <p class="text-2xl font-semibold tabular-nums">
            {{ count.toLocaleString(undefined, { numberingSystem: 'latn' }) }}
            <span class="text-sm font-normal text-muted">/ {{ TOTAL_AYAT.toLocaleString(undefined, { numberingSystem: 'latn' }) }}</span>
          </p>
          <p class="text-xs text-muted">
            {{ t('pages.students.viewModal.insights.ayatMemorized') }}
          </p>
        </div>
        <p class="text-2xl font-semibold tabular-nums text-primary">
          {{ percentage }}%
        </p>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full bg-elevated">
        <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${Math.min(percentage, 100)}%` }" />
      </div>

      <!-- Surah heatmap: one small tile per surah, shaded by memorized fraction -->
      <div
        class="grid grid-cols-[repeat(12,minmax(0,1fr))] gap-0.5 sm:grid-cols-[repeat(16,minmax(0,1fr))] md:grid-cols-[repeat(19,minmax(0,1fr))]"
        dir="rtl"
      >
        <div
          v-for="c in coverage"
          :key="c.surah"
          class="flex aspect-square items-center justify-center rounded-sm text-[8px] font-medium tabular-nums transition-colors"
          :class="tileClass(c.fraction)"
          :title="tileTitle(c)"
        >
          {{ c.surah }}
        </div>
      </div>

      <!-- Legend -->
      <div class="flex items-center justify-center gap-2 text-[11px] text-muted">
        <span>{{ t('pages.students.viewModal.insights.legendNone') }}</span>
        <span class="h-3 w-3 rounded-sm bg-elevated" />
        <span class="h-3 w-3 rounded-sm bg-primary/20" />
        <span class="h-3 w-3 rounded-sm bg-primary/40" />
        <span class="h-3 w-3 rounded-sm bg-primary/60" />
        <span class="h-3 w-3 rounded-sm bg-primary/80" />
        <span class="h-3 w-3 rounded-sm bg-primary" />
        <span>{{ t('pages.students.viewModal.insights.legendFull') }}</span>
      </div>
    </template>
  </div>
</template>
