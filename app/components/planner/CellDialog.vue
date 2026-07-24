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
  // Which view to open in: null/undefined = session list, -1 = add form,
  // >= 0 = edit that session's form directly.
  editSession?: number | null
}>()
const open = defineModel<boolean>('open', { required: true })

const { t, locale } = useI18n()
const toast = useToast()
const apiError = useApiError()
const api = useApi()
const router = useRouter()
const { canApproveAchievement: canApprove } = usePermissions()
const { selectedHalaqaId } = useGlobalHalaqa()
const {
  dateOfDay, selectedStudentId, getCells,
  addSession, updateSession, removeSession, clearCell, copyCell, pasteCell, copiedCell
} = useWeeklyPlan()

const sessions = computed(() => getCells(props.day, props.track))

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

function sessionRange(c: { start_surah: number, start_verse: number, end_surah: number, end_verse: number }) {
  return formatVerseRange(c.start_surah, c.start_verse, c.end_surah, c.end_verse, SURAH_NAMES)
}
function sessionProgress(c: { achieved_verses?: number, total_verses?: number }): number | null {
  if (!c.total_verses) return null
  return Math.round(((c.achieved_verses ?? 0) / c.total_verses) * 100)
}

// ── Add / edit one session ──────────────────────────────────────────────────
// editIndex: null = not editing, -1 = adding a new session, >=0 = editing that session.
const editIndex = ref<number | null>(null)
const form = reactive({ start_surah: 1, start_verse: 1, end_surah: 1, end_verse: 7 })

function beginAdd() {
  Object.assign(form, { start_surah: 1, start_verse: 1, end_surah: 1, end_verse: 7 })
  editIndex.value = -1
}
function beginEdit(index: number) {
  const c = sessions.value[index]
  if (c) Object.assign(form, { start_surah: c.start_surah, start_verse: c.start_verse, end_surah: c.end_surah, end_verse: c.end_verse })
  editIndex.value = index
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
  if (editIndex.value === -1) addSession(props.day, props.track, { ...form })
  else if (editIndex.value !== null) updateSession(props.day, props.track, editIndex.value, { ...form })
  editIndex.value = null
}

function onRemove(index: number) {
  removeSession(props.day, props.track, index)
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

// Approve a still-pending achievement in place, then refresh the list badge.
const approvingId = ref<number | null>(null)
async function approveAch(a: ApiAchievement) {
  approvingId.value = a.id
  try {
    await api<ApiAchievement>(`/achievements/${a.id}/approve`, { method: 'POST' })
    toast.add({ title: t('pages.achievements.approvedToast'), color: 'success' })
    await loadAchievements()
  } catch (e: any) {
    toast.add({ title: apiError.format(e, t('pages.achievements.approveErrorTitle')), color: 'error' })
  } finally {
    approvingId.value = null
  }
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function recordAchievement() {
  // Open the create form with this cell's student pre-filled, dated today, and
  // the session the user selected pre-filled as the lesson. Fall back to the
  // first session when the cell was opened without a specific session.
  const { selectedDate, editing, duplicateFrom, prefillStudentId, prefillPlanItem } = useAchievements()
  editing.value = null
  duplicateFrom.value = null
  selectedDate.value = todayIso()
  prefillStudentId.value = selectedStudentId.value ?? null
  const index =
    editIndex.value != null && editIndex.value >= 0
      ? editIndex.value
      : props.editSession != null && props.editSession >= 0
        ? props.editSession
        : 0
  const selected = sessions.value[index] ?? sessions.value[0]
  prefillPlanItem.value = selected
    ? {
        id: selected.id ?? null,
        track_type: props.track,
        start_surah: selected.start_surah,
        start_verse: selected.start_verse,
        end_surah: selected.end_surah,
        end_verse: selected.end_verse
      }
    : null
  open.value = false
  router.push('/achievements/record')
}

watch(open, (v) => {
  if (v) {
    // Open directly into the requested view: edit a session, add a new one, or
    // the session list.
    if (props.editSession == null) editIndex.value = null
    else if (props.editSession < 0) beginAdd()
    else if (props.editSession < sessions.value.length) beginEdit(props.editSession)
    else editIndex.value = null
    loadAchievements()
  } else {
    editIndex.value = null
  }
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

        <!-- Session list -->
        <div v-if="editIndex === null" class="space-y-3">
          <p v-if="!sessions.length" class="text-sm text-muted text-center py-3 rounded-xl border border-default bg-elevated">
            {{ t('pages.planner.cellDialog.empty') }}
          </p>

          <ul v-else class="space-y-2">
            <li
              v-for="(s, i) in sessions"
              :key="s.id ?? `new-${i}`"
              class="rounded-xl border border-default bg-elevated p-3 space-y-2"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold">{{ sessionRange(s) }}</span>
                <UBadge v-if="s.status" variant="subtle" size="sm" :color="planItemStatusColor(s.status)">
                  {{ t(`pages.planner.itemStatus.${s.status}`) }}
                </UBadge>
              </div>
              <div v-if="sessionProgress(s) !== null" class="flex items-center gap-2">
                <div class="flex-1 h-1.5 rounded-full bg-default overflow-hidden">
                  <div class="h-full rounded-full bg-primary" :style="{ width: `${sessionProgress(s)}%` }" />
                </div>
                <span class="text-xs text-muted tabular-nums">{{ s.achieved_verses }}/{{ s.total_verses }}</span>
              </div>
              <div v-if="editable" class="flex gap-2 pt-0.5">
                <UButton size="xs" variant="soft" icon="i-lucide-pencil" @click="beginEdit(i)">
                  {{ t('pages.planner.cell.edit') }}
                </UButton>
                <UButton
                  size="xs"
                  variant="soft"
                  color="error"
                  icon="i-lucide-trash-2"
                  :aria-label="t('pages.planner.cell.removeSession')"
                  @click="onRemove(i)"
                >
                  {{ t('pages.planner.cell.removeSession') }}
                </UButton>
              </div>
            </li>
          </ul>

          <div v-if="editable" class="flex flex-wrap gap-2">
            <UButton size="sm" variant="soft" icon="i-lucide-plus" @click="beginAdd">
              {{ t('pages.planner.cell.popoverTitleNew') }}
            </UButton>
            <UButton
              v-if="sessions.length"
              size="sm"
              variant="soft"
              color="neutral"
              icon="i-lucide-copy"
              @click="onCopy"
            >
              {{ t('pages.planner.copy') }}
            </UButton>
            <UButton
              v-if="copiedCell?.length"
              size="sm"
              variant="soft"
              color="neutral"
              icon="i-lucide-clipboard-paste"
              @click="onPaste"
            >
              {{ t('pages.planner.paste', { count: copiedCell.length }) }}
            </UButton>
            <UButton
              v-if="sessions.length"
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

        <!-- Add / edit range form -->
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
            <UButton size="sm" variant="soft" color="neutral" @click="editIndex = null">
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
              <div class="flex items-center gap-2 shrink-0">
                <UBadge
                  variant="subtle"
                  size="sm"
                  :color="a.status === 'approved' ? 'success' : 'neutral'"
                >
                  {{ a.status === 'approved' ? t('pages.achievements.statusApproved') : t('pages.achievements.statusPending') }}
                </UBadge>
                <UButton
                  v-if="canApprove && a.status !== 'approved'"
                  size="xs"
                  color="success"
                  variant="soft"
                  icon="i-lucide-check-check"
                  :loading="approvingId === a.id"
                  @click="approveAch(a)"
                >
                  {{ t('pages.achievements.approve') }}
                </UButton>
              </div>
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
