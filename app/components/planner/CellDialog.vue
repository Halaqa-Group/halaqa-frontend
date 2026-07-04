<script setup lang="ts">
import { SURAH_NAMES } from '~/data/constants'
import { formatVerseRange, isValidVerseRange, totalVersesInRange } from '~/utils/quran'
import { TRACK_BADGE_COLOR, type AchievementTrack } from '~/utils/achievement'
import { planItemStatusColor } from '~/utils/plan'
import { unwrapList } from '~/utils/api/list'
import type { ApiAchievement } from '~/types'

type TrackType = 'Hifz' | 'Near' | 'Far'

const props = defineProps<{
  day: number
  track: TrackType
  editable: boolean
}>()
const open = defineModel<boolean>('open', { required: true })

const { t, locale } = useI18n()
const toast = useToast()
const api = useApi()
const router = useRouter()
const { selectedHalaqaId } = useGlobalHalaqa()
const {
  dateOfDay, selectedStudentId, getCell, setCell, clearCell, copyCell, pasteCell, copiedCell
} = useWeeklyPlan()

const cell = computed(() => getCell(props.day, props.track))
const isoDate = computed(() => {
  const d = dateOfDay(props.day)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
const dateLabel = computed(() => {
  const d = dateOfDay(props.day)
  try {
    return d.toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : locale.value, { weekday: 'long', day: 'numeric', month: 'long' })
  } catch {
    return isoDate.value
  }
})
const rangeLabel = computed(() => {
  const c = cell.value
  return c ? formatVerseRange(c.start_surah, c.start_verse, c.end_surah, c.end_verse, SURAH_NAMES) : ''
})
const progressPct = computed(() => {
  const c = cell.value
  if (!c || !c.total_verses) return null
  return Math.round(((c.achieved_verses ?? 0) / c.total_verses) * 100)
})

const editing = ref(false)
const form = reactive({ start_surah: 1, start_verse: 1, end_surah: 1, end_verse: 7 })
function beginEdit() {
  const c = cell.value
  if (c) Object.assign(form, { start_surah: c.start_surah, start_verse: c.start_verse, end_surah: c.end_surah, end_verse: c.end_verse })
  else Object.assign(form, { start_surah: 1, start_verse: 1, end_surah: 1, end_verse: 7 })
  editing.value = true
}
const rangeValid = computed(() => isValidVerseRange(form.start_surah, form.start_verse, form.end_surah, form.end_verse))
const editCount = computed(() =>
  rangeValid.value.valid ? totalVersesInRange(form.start_surah, form.start_verse, form.end_surah, form.end_verse) : 0
)
function saveEdit() {
  if (!rangeValid.value.valid) {
    toast.add({ title: rangeValid.value.error, color: 'error' })
    return
  }
  setCell(props.day, props.track, { ...form })
  editing.value = false
}

function onCopy() {
  copyCell(props.day, props.track)
  toast.add({ title: t('pages.planner.cellCopiedToast'), color: 'success' })
}
function onPaste() {
  pasteCell(props.day, props.track)
}
function onClear() {
  clearCell(props.day, props.track)
  open.value = false
}

const achievements = ref<ApiAchievement[]>([])
const loadingAch = ref(false)
async function loadAchievements() {
  const halaqaId = selectedHalaqaId.value
  const studentId = selectedStudentId.value
  if (!halaqaId || !studentId) return
  loadingAch.value = true
  try {
    const raw = await api<unknown>(
      `/achievements?student_id=${studentId}&halaqa_id=${halaqaId}&date=${isoDate.value}&track_type=${props.track}`
    )
    achievements.value = unwrapList<ApiAchievement>(raw)
  } catch {
    achievements.value = []
  } finally {
    loadingAch.value = false
  }
}

function achRange(a: ApiAchievement) {
  return formatVerseRange(a.start_surah, a.start_verse, a.end_surah, a.end_verse, SURAH_NAMES)
}

function recordAchievement() {
  const { selectedDate } = useAchievements()
  selectedDate.value = isoDate.value
  open.value = false
  router.push('/achievements')
}

watch(open, (v) => {
  editing.value = false
  if (v) loadAchievements()
}, { immediate: true })
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('pages.planner.cellDialog.title')"
    :ui="{ content: 'sm:max-w-lg rounded-2xl' }"
  >
    <template #body>
      <div class="space-y-5">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span class="text-sm font-medium">{{ dateLabel }}</span>
          <UBadge variant="subtle" :color="TRACK_BADGE_COLOR[track as AchievementTrack]">
            {{ t(`pages.achievements.tracks.${track}`) }}
          </UBadge>
        </div>

        <div v-if="!editing" class="rounded-xl border border-default bg-elevated p-4 space-y-3">
          <template v-if="cell">
            <div class="flex items-center justify-between gap-2">
              <span class="font-semibold">{{ rangeLabel }}</span>
              <UBadge v-if="cell.status" variant="subtle" size="sm" :color="planItemStatusColor(cell.status)">
                {{ t(`pages.planner.itemStatus.${cell.status}`) }}
              </UBadge>
            </div>
            <div v-if="progressPct !== null" class="flex items-center gap-2">
              <div class="flex-1 h-1.5 rounded-full bg-default overflow-hidden">
                <div class="h-full rounded-full bg-primary" :style="{ width: `${progressPct}%` }" />
              </div>
              <span class="text-xs text-muted tabular-nums">{{ cell.achieved_verses }}/{{ cell.total_verses }}</span>
            </div>
          </template>
          <p v-else class="text-sm text-muted text-center py-2">
            {{ t('pages.planner.cellDialog.empty') }}
          </p>

          <div v-if="editable" class="flex flex-wrap gap-2 pt-1">
            <UButton size="sm" variant="soft" icon="i-lucide-pencil" @click="beginEdit">
              {{ cell ? t('pages.planner.cell.edit') : t('pages.planner.cell.addLabel') }}
            </UButton>
            <UButton
              v-if="cell"
              size="sm"
              variant="soft"
              color="neutral"
              icon="i-lucide-copy"
              @click="onCopy"
            >
              {{ t('pages.planner.copy') }}
            </UButton>
            <UButton
              v-if="copiedCell"
              size="sm"
              variant="soft"
              color="neutral"
              icon="i-lucide-clipboard-paste"
              @click="onPaste"
            >
              {{ t('pages.planner.paste', { count: 1 }) }}
            </UButton>
            <UButton
              v-if="cell"
              size="sm"
              variant="soft"
              color="error"
              icon="i-lucide-trash-2"
              @click="onClear"
            >
              {{ t('pages.planner.cell.clear') }}
            </UButton>
          </div>
        </div>

        <div v-else class="rounded-xl border border-default p-4 space-y-4">
          <div class="space-y-2">
            <span class="text-xs font-medium text-muted">{{ t('pages.planner.cell.startLabel') }}</span>
            <PlannerAyahSelect v-model:surah="form.start_surah" v-model:verse="form.start_verse" />
          </div>
          <div class="space-y-2">
            <span class="text-xs font-medium text-muted">{{ t('pages.planner.cell.endLabel') }}</span>
            <PlannerAyahSelect v-model:surah="form.end_surah" v-model:verse="form.end_verse" />
          </div>
          <p v-if="!rangeValid.valid" class="text-xs text-error">
            {{ rangeValid.error }}
          </p>
          <p v-else-if="editCount > 0" class="text-xs text-muted">
            {{ t('pages.achievements.versesCount', { count: editCount }) }}
          </p>
          <div class="flex justify-end gap-2">
            <UButton size="sm" variant="soft" color="neutral" @click="editing = false">
              {{ t('common.cancel') }}
            </UButton>
            <UButton size="sm" icon="i-lucide-check" :disabled="!rangeValid.valid" @click="saveEdit">
              {{ t('pages.planner.cell.confirm') }}
            </UButton>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">{{ t('pages.planner.cellDialog.achievements') }}</span>
            <UButton size="xs" variant="ghost" icon="i-lucide-plus" @click="recordAchievement">
              {{ t('pages.planner.cellDialog.record') }}
            </UButton>
          </div>

          <div v-if="loadingAch" class="flex justify-center py-4">
            <UIcon name="i-lucide-loader-circle" class="w-5 h-5 animate-spin text-primary" />
          </div>
          <p v-else-if="achievements.length === 0" class="text-xs text-muted text-center py-3">
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
                  {{ achRange(a) }}
                </p>
                <p class="text-xs text-muted">
                  {{ Math.round(Number(a.percentage_score)) }}%
                </p>
              </div>
              <UBadge
                variant="subtle"
                size="sm"
                :color="a.status === 'approved' ? 'success' : 'neutral'"
              >
                {{ a.status === 'approved' ? t('pages.achievements.statusApproved') : t('pages.achievements.statusPending') }}
              </UBadge>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <UButton variant="soft" color="neutral" @click="open = false">
          {{ t('common.close') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
