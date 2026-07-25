<script setup lang="ts">
import type { ApiStudentReportDetail, StudentTrackDetail } from '~/types'
import {
  attendanceMeta,
  formatRate,
  formatScore,
  isMissingAttendance
} from '~/utils/daily-report'

const props = defineProps<{
  open: boolean
  halaqaId: number
  date: string
  studentId: number | null
  /** Fallback name shown in the header before the detail load resolves. */
  studentName?: string
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useI18n()
const apiError = useApiError()
const { fetchStudentDetail } = useDailyReport()

const isOpen = computed({
  get: () => props.open,
  set: v => emit('update:open', v)
})

const detail = ref<ApiStudentReportDetail | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  if (props.studentId === null) return
  loading.value = true
  error.value = null
  detail.value = null
  try {
    detail.value = await fetchStudentDetail(props.halaqaId, props.date, props.studentId)
  } catch (e: unknown) {
    error.value = apiError.format(e, t('pages.dailyReport.detail.loadError'))
  } finally {
    loading.value = false
  }
}

// Re-fetch whenever the modal opens for a (possibly new) student.
watch(
  () => [props.open, props.studentId] as const,
  ([open]) => {
    if (open) load()
  }
)

const tracks = computed<Array<{ key: 'hifz' | 'near' | 'far', labelKey: string, data: StudentTrackDetail }>>(() => {
  const d = detail.value
  if (!d) return []
  return [
    { key: 'hifz', labelKey: 'tracks.hifz', data: d.hifz },
    { key: 'near', labelKey: 'tracks.near', data: d.near },
    { key: 'far', labelKey: 'tracks.far', data: d.far }
  ]
})

const headerName = computed(() => detail.value?.student_name ?? props.studentName ?? '')
const missing = computed(() =>
  detail.value ? isMissingAttendance(detail.value.attendance_status) : false
)
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="headerName || t('pages.dailyReport.detail.title')"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-10">
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
      </div>

      <div v-else-if="error" class="py-8 text-center">
        <p class="text-sm text-error">
          {{ error }}
        </p>
        <UButton class="mt-3" variant="soft" size="sm" :label="t('common.tryAgain')" @click="load" />
      </div>

      <div v-else-if="detail" class="flex flex-col gap-5">
        <!-- Summary row: attendance, ethics, plan completion, total -->
        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            :color="attendanceMeta(detail.attendance_status).color"
            variant="subtle"
            :label="t(attendanceMeta(detail.attendance_status).labelKey)"
          />
          <UBadge
            v-if="detail.source === 'snapshot'"
            color="neutral"
            variant="outline"
            icon="i-lucide-history"
            :label="t('pages.dailyReport.source.snapshot')"
          />
        </div>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-lg border border-default bg-elevated px-3 py-2.5">
            <p class="text-xs text-muted">
              {{ t('pages.dailyReport.detail.ethics') }}
            </p>
            <p class="mt-0.5 text-lg font-bold tabular-nums">
              {{ formatScore(detail.ethics_score) }}
              <span v-if="detail.ethics_rating != null" class="text-xs font-normal text-muted">
                ({{ detail.ethics_rating }}/5)
              </span>
            </p>
          </div>
          <div class="rounded-lg border border-default bg-elevated px-3 py-2.5">
            <p class="text-xs text-muted">
              {{ t('pages.dailyReport.planCompletion') }}
            </p>
            <p class="mt-0.5 text-lg font-bold tabular-nums">
              {{ formatRate(detail.plan_completion_rate) }}
            </p>
          </div>
          <div class="col-span-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5">
            <p class="text-xs text-muted">
              {{ t('pages.dailyReport.totalScore') }}
            </p>
            <p class="mt-0.5 text-2xl font-bold tabular-nums text-primary">
              {{ formatScore(detail.total_score) }}
            </p>
          </div>
        </div>

        <p v-if="missing" class="rounded-lg bg-elevated px-3 py-2 text-xs text-muted">
          {{ t('pages.dailyReport.attendance.missingHint') }}
        </p>

        <!-- Per-track breakdown -->
        <div class="space-y-3">
          <h4 class="text-sm font-semibold">
            {{ t('pages.dailyReport.detail.tracks') }}
          </h4>
          <div
            v-for="track in tracks"
            :key="track.key"
            class="rounded-xl border border-default p-3"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="font-semibold">
                {{ t(track.labelKey) }}
              </p>
              <div class="flex items-center gap-2">
                <UBadge
                  v-if="track.data.effective_weight !== track.data.base_weight"
                  color="warning"
                  variant="subtle"
                  size="sm"
                  icon="i-lucide-scale"
                  :label="t('pages.dailyReport.detail.weightRedistributed', {
                    base: formatScore(track.data.base_weight),
                    effective: formatScore(track.data.effective_weight)
                  })"
                />
                <span class="text-sm font-bold tabular-nums text-primary">
                  {{ formatScore(track.data.score) }}
                </span>
              </div>
            </div>

            <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt class="text-xs text-muted">
                  {{ t('pages.dailyReport.detail.plannedPages') }}
                </dt>
                <dd class="tabular-nums font-medium">
                  {{ formatScore(track.data.planned_pages) }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted">
                  {{ t('pages.dailyReport.detail.achievedPages') }}
                </dt>
                <dd class="tabular-nums font-medium">
                  {{ formatScore(track.data.achieved_pages) }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted">
                  {{ t('pages.dailyReport.detail.completionRate') }}
                </dt>
                <dd class="tabular-nums font-medium">
                  {{ formatRate(track.data.completion_rate) }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted">
                  {{ t('pages.dailyReport.detail.qualityRate') }}
                </dt>
                <dd class="tabular-nums font-medium">
                  {{ formatRate(track.data.quality_rate) }}
                </dd>
              </div>
            </dl>

            <!-- Reconciliation summary (audit counts; the full blob is not shown) -->
            <div
              v-if="track.data.reconciliation"
              class="mt-3 flex flex-wrap gap-1.5 border-t border-default pt-2"
            >
              <UBadge
                color="neutral"
                variant="soft"
                size="sm"
                :label="t('pages.dailyReport.detail.plannedRanges', { n: track.data.reconciliation.plannedRanges.length })"
              />
              <UBadge
                v-if="track.data.reconciliation.gaps.length"
                color="warning"
                variant="soft"
                size="sm"
                :label="t('pages.dailyReport.detail.gaps', { n: track.data.reconciliation.gaps.length })"
              />
              <UBadge
                v-if="track.data.reconciliation.outsidePlanSegments.length"
                color="info"
                variant="soft"
                size="sm"
                :label="t('pages.dailyReport.detail.outsidePlan', { n: track.data.reconciliation.outsidePlanSegments.length })"
              />
            </div>
          </div>
        </div>

        <!-- Teacher note -->
        <div v-if="detail.teacher_note" class="rounded-lg border border-default bg-elevated p-3">
          <p class="mb-1 text-xs font-semibold text-muted">
            {{ t('pages.dailyReport.teacherNote') }}
          </p>
          <p class="text-sm whitespace-pre-line">
            {{ detail.teacher_note }}
          </p>
        </div>

        <DailyReportSystemAlerts :alerts="detail.system_alerts" />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton variant="soft" color="neutral" :label="t('common.close')" @click="isOpen = false" />
      </div>
    </template>
  </UModal>
</template>
