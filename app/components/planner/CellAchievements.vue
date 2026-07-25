<script setup lang="ts">
import { SURAH_NAMES } from '~/data/constants'
import { formatVerseRange } from '~/utils/quran'
import { unwrapList } from '~/utils/api/list'
import type { ApiAchievement } from '~/types'

// The achievements already recorded for one planner cell (student + date + track),
// with in-place approval for supervisors.
const props = defineProps<{
  studentId: number | null
  halaqaId: number | null
  date: string
  track: 'Hifz' | 'Near' | 'Far'
}>()

const { t } = useI18n()
const toast = useToast()
const apiError = useApiError()
const api = useApi()
const { canApproveAchievement: canApprove } = usePermissions()

const achievements = ref<ApiAchievement[]>([])
const loading = ref(false)

async function load() {
  if (!props.studentId || !props.halaqaId) {
    achievements.value = []
    return
  }
  loading.value = true
  try {
    const params = new URLSearchParams({
      student_id: String(props.studentId),
      halaqa_id: String(props.halaqaId),
      date: props.date,
      track_type: props.track
    })
    achievements.value = unwrapList<ApiAchievement>(await api<unknown>(`/achievements?${params.toString()}`))
  } catch {
    achievements.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.studentId, props.halaqaId, props.date, props.track],
  () => { void load() },
  { immediate: true }
)

function range(a: ApiAchievement) {
  return formatVerseRange(a.start_surah, a.start_verse, a.end_surah, a.end_verse, SURAH_NAMES)
}

const approvingId = ref<number | null>(null)
async function approve(a: ApiAchievement) {
  approvingId.value = a.id
  try {
    await api<ApiAchievement>(`/achievements/${a.id}/approve`, { method: 'POST' })
    toast.add({ title: t('pages.achievements.approvedToast'), color: 'success' })
    await load()
  } catch (e: any) {
    toast.add({ title: apiError.format(e, t('pages.achievements.approveErrorTitle')), color: 'error' })
  } finally {
    approvingId.value = null
  }
}

defineExpose({ reload: load })
</script>

<template>
  <div class="space-y-2">
    <span class="text-sm font-medium">{{ t('pages.planner.cellDialog.achievements') }}</span>

    <div v-if="loading" class="flex justify-center py-4">
      <UIcon name="i-lucide-loader-circle" class="w-5 h-5 animate-spin text-primary" />
    </div>
    <p v-else-if="!achievements.length" class="text-xs text-muted text-center py-3">
      {{ t('pages.planner.cellDialog.noAchievements') }}
    </p>
    <ul v-else class="space-y-2">
      <li
        v-for="a in achievements"
        :key="a.id"
        class="flex items-center justify-between gap-2 rounded-lg border border-default px-3 py-2"
      >
        <div class="min-w-0">
          <p class="text-sm truncate">
            {{ range(a) }}
          </p>
          <p class="text-xs text-muted">
            {{ Math.round(Number(a.percentage_score)) }}%
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <UBadge variant="subtle" size="sm" :color="a.status === 'approved' ? 'success' : 'neutral'">
            {{ a.status === 'approved' ? t('pages.achievements.statusApproved') : t('pages.achievements.statusPending') }}
          </UBadge>
          <UButton
            v-if="canApprove && a.status !== 'approved'"
            size="xs"
            color="success"
            variant="soft"
            icon="i-lucide-check-check"
            :loading="approvingId === a.id"
            @click="approve(a)"
          >
            {{ t('pages.achievements.approve') }}
          </UButton>
        </div>
      </li>
    </ul>
  </div>
</template>
