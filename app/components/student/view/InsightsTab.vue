<script setup lang="ts">
import type { ApiErrorHeatmap, HeatmapHotspot, Student } from '~/types'
import { SURAH_NAMES } from '~/data/constants'
import { formatVerseRange } from '~/utils/quran'

const props = defineProps<{ student: Student }>()
const { t } = useI18n()
const api = useApi()

const days = ref(56)
const windowOptions = computed(() => [
  { value: 28, label: t('pages.students.viewModal.insights.window4') },
  { value: 56, label: t('pages.students.viewModal.insights.window8') },
  { value: 84, label: t('pages.students.viewModal.insights.window12') }
])

const data = ref<ApiErrorHeatmap | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    data.value = await api<ApiErrorHeatmap>(
      `/students/${props.student.id}/error-heatmap?days=${days.value}`
    )
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || t('auth.genericError')
    data.value = null
  } finally {
    loading.value = false
  }
}

watch(() => [props.student.id, days.value], load, { immediate: true })

const hotspots = computed(() => data.value?.hotspots ?? [])
// Scale bar widths to the worst ayah so the heatmap reads at a glance.
const maxTotal = computed(() => hotspots.value.reduce((m, h) => Math.max(m, h.total), 0) || 1)

function verseLabel(h: HeatmapHotspot): string {
  return formatVerseRange(h.surah, h.ayah, h.surah, h.ayah, SURAH_NAMES)
}
</script>

<template>
  <div class="flex flex-col gap-4 pt-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <h3 class="font-semibold">
          {{ t('pages.students.viewModal.insights.title') }}
        </h3>
        <p class="text-xs text-muted">
          {{ t('pages.students.viewModal.insights.subtitle') }}
        </p>
      </div>
      <div class="inline-flex shrink-0 rounded-lg border border-default bg-default p-0.5">
        <button
          v-for="opt in windowOptions"
          :key="opt.value"
          type="button"
          class="rounded-md px-2.5 py-1 text-xs font-medium transition"
          :class="days === opt.value ? 'bg-primary text-inverted' : 'text-muted hover:text-default'"
          @click="days = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="py-10 text-center text-sm text-muted">
      {{ t('common.loading') }}
    </div>

    <div v-else-if="error" class="rounded-xl bg-status-conflict-bg p-4 text-center text-sm text-status-conflict">
      {{ error }}
    </div>

    <div
      v-else-if="!hotspots.length"
      class="flex flex-col items-center gap-2 rounded-xl border border-default bg-elevated/40 py-10 text-center"
    >
      <UIcon name="i-lucide-sparkles" class="h-8 w-8 text-primary opacity-70" />
      <p class="text-sm font-medium">
        {{ t('pages.students.viewModal.insights.empty') }}
      </p>
    </div>

    <template v-else>
      <p class="text-xs text-muted">
        {{ t('pages.students.viewModal.insights.totalErrors', { n: data!.total_errors }) }}
      </p>
      <ul class="flex flex-col gap-2.5">
        <li
          v-for="(h, i) in hotspots"
          :key="`${h.surah}:${h.ayah}`"
          class="flex items-center gap-3"
        >
          <span class="w-4 shrink-0 text-xs font-bold tabular-nums text-muted">{{ i + 1 }}</span>
          <div class="min-w-0 flex-1">
            <div class="mb-1 flex items-center justify-between gap-2">
              <span class="truncate text-sm font-medium">{{ verseLabel(h) }}</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-elevated">
              <div
                class="h-full rounded-full bg-error transition-all"
                :style="{ width: `${Math.max(6, Math.round((h.total / maxTotal) * 100))}%` }"
              />
            </div>
          </div>
          <span class="w-6 shrink-0 text-end text-sm font-bold tabular-nums text-error">{{ h.total }}</span>
        </li>
      </ul>
    </template>
  </div>
</template>
