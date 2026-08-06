<script setup lang="ts">
import { useOnline } from '@vueuse/core'
import { SURAH_NAMES } from '~/data/constants'
import { formatVerseRange, totalVersesInRange } from '~/utils/quran'
import { TRACK_BADGE_COLOR, type AchievementTrack } from '~/utils/achievement'
import { defaultSessionRange, planItemStatusColor } from '~/utils/plan'
import { toYmd, todayYmd } from '~/utils/date'
import type { VerseRange } from '~/utils/quran-structure'
import type { DraftCell } from '~/composables/useWeeklyPlan'

type TrackType = 'Hifz' | 'Near' | 'Far'

const props = defineProps<{
  day: number
  track: TrackType
  editable: boolean
  // 'add' appends a blank session to edit right away (the "+" affordances);
  // 'list' just shows the cell's existing sessions.
  initialView?: 'list' | 'add'
}>()
// Fired when a session's sessions list needs the surrounding modal to close —
// e.g. after launching the record form, which navigates away.
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const toast = useToast()
const apiError = useApiError()
const online = useOnline()
const { canRecordAchievement: canRecord } = usePermissions()
const { selectedHalaqaId } = useGlobalHalaqa()
const { openRecordForPlanItem } = useAchievements()
const {
  dateOfDay, selectedStudentId, selectedStudentDirection, getCells, matrixDirty, saveDraft,
  addSession, updateSession, removeSession, clearCell, copyCell, pasteCell, copiedCell
} = useWeeklyPlan()

const sessions = computed(() => getCells(props.day, props.track))

const isoDate = computed(() => toYmd(dateOfDay(props.day)))

function sessionRange(c: VerseRange) {
  return formatVerseRange(c.start_surah, c.start_verse, c.end_surah, c.end_verse, SURAH_NAMES)
}
// How big the session is, in both units the teacher plans by: ayahs and mushaf
// pages. Page coverage is fractional — half a page reads 0.5 — so it's shown to
// one decimal unless it lands on a whole page.
function sessionSize(c: VerseRange): string {
  const parts: string[] = []
  const verses = totalVersesInRange(c.start_surah, c.start_verse, c.end_surah, c.end_verse)
  if (verses > 0) parts.push(t('pages.achievements.versesCount', { count: verses }))
  const pages = pageCoverage(c)
  if (pages > 0) {
    const rounded = Math.round(pages * 10) / 10
    parts.push(t('pages.achievements.pagesCount', {
      count: Number.isInteger(rounded) ? rounded : rounded.toFixed(1)
    }))
  }
  return parts.join(' · ')
}
function sessionProgress(c: DraftCell): number | null {
  if (!c.total_verses) return null
  return Math.round(((c.achieved_verses ?? 0) / c.total_verses) * 100)
}

// Every session in the list edits in place — the range pickers write straight into
// the plan draft, which the planner's "save draft" then persists. A new session
// opens on the student's own memorization direction (An-Nas going backwards,
// Al-Fatihah going forwards) rather than always at the front of the mushaf.
function onRangeUpdate(index: number, range: VerseRange) {
  updateSession(props.day, props.track, index, range)
}
function addBlankSession() {
  addSession(props.day, props.track, defaultSessionRange(selectedStudentDirection.value))
}

function onCopy() {
  copyCell(props.day, props.track)
  toast.add({ title: t('pages.planner.cellCopiedToast'), color: 'success' })
}

// ── Record an achievement for one session ───────────────────────────────────
// The achievement is dated by the cell's own day, except for a cell still in the
// future — nothing can be recited yet, so it falls back to today (the record
// form's calendar refuses future dates anyway).
const recordDate = computed(() => (isoDate.value > todayYmd() ? todayYmd() : isoDate.value))

const recordingIndex = ref<number | null>(null)

async function recordForSession(index: number) {
  const studentId = selectedStudentId.value
  if (!studentId || recordingIndex.value !== null) return
  recordingIndex.value = index
  try {
    // A session added or edited in this sitting has no server id yet. Persisting
    // the draft first lets the achievement link to a real plan item instead of
    // degrading to a range-only prefill — and keeps the edit from being lost when
    // we navigate away. It's a network write, so offline we skip it and record
    // against the range only (the achievement still drafts locally).
    if (props.editable && matrixDirty.value && online.value) await saveDraft()
  } catch (e: any) {
    toast.add({ title: apiError.format(e, t('pages.planner.saveErrorTitle')), color: 'error' })
    recordingIndex.value = null
    return
  }
  // Re-read after the save: loadPlan re-hydrates the draft, so this is the same
  // session — now carrying its id.
  const session = sessions.value[index]
  recordingIndex.value = null
  if (!session) return
  emit('close')
  openRecordForPlanItem({
    studentId,
    date: recordDate.value,
    item: {
      id: session.id ?? null,
      track_type: props.track,
      start_surah: session.start_surah,
      start_verse: session.start_verse,
      end_surah: session.end_surah,
      end_verse: session.end_verse
    }
  })
}

// An empty cell has no lesson to carry over — record with just the student and
// date, leaving the form's own lesson picker to fill the rest.
function recordWithoutSession() {
  const studentId = selectedStudentId.value
  if (!studentId) return
  emit('close')
  openRecordForPlanItem({ studentId, date: recordDate.value, item: null })
}

const showRecord = computed(() => canRecord.value && selectedStudentId.value != null)

// Opened straight from a "+" affordance: seed a blank session to edit right away.
onMounted(() => {
  if (props.initialView === 'add' && props.editable) addBlankSession()
})
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <UBadge variant="subtle" :color="TRACK_BADGE_COLOR[track as AchievementTrack]">
        {{ t(`pages.achievements.tracks.${track}`) }}
      </UBadge>
      <UBadge v-if="sessions.length > 1" variant="subtle" color="neutral" size="sm" class="tabular-nums">
        {{ sessions.length }}
      </UBadge>
    </div>

    <div
      v-if="!sessions.length"
      class="rounded-xl border border-default bg-elevated py-4 px-3 space-y-3 text-center"
    >
      <p class="text-sm text-muted">
        {{ t('pages.planner.cellDialog.empty') }}
      </p>
      <UButton
        v-if="showRecord"
        size="xs"
        variant="soft"
        icon="i-lucide-award"
        @click="recordWithoutSession"
      >
        {{ t('pages.planner.cellDialog.record') }}
      </UButton>
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="(s, i) in sessions"
        :key="s.id ?? `new-${i}`"
        class="rounded-xl border border-default bg-elevated p-3 space-y-2.5"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0 flex items-center gap-2">
            <UBadge v-if="sessions.length > 1" variant="subtle" color="neutral" size="sm">
              {{ t('pages.planner.cellDialog.sessionNumber', { n: i + 1 }) }}
            </UBadge>
            <span class="text-sm font-semibold truncate">{{ sessionRange(s) }}</span>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <UBadge v-if="s.status" variant="subtle" size="sm" :color="planItemStatusColor(s.status)">
              {{ t(`pages.planner.itemStatus.${s.status}`) }}
            </UBadge>
            <UButton
              v-if="editable"
              size="xs"
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              square
              :aria-label="t('pages.planner.cell.removeSession')"
              @click="removeSession(day, track, i)"
            />
          </div>
        </div>

        <p class="text-xs text-muted">
          {{ sessionSize(s) }}
        </p>

        <PlannerSessionRangeFields
          v-if="editable"
          :range="s"
          :direction="selectedStudentDirection"
          @update="r => onRangeUpdate(i, r)"
        />

        <div v-if="sessionProgress(s) !== null" class="flex items-center gap-2">
          <div class="flex-1 h-1.5 rounded-full bg-default overflow-hidden">
            <div class="h-full rounded-full bg-primary" :style="{ width: `${sessionProgress(s)}%` }" />
          </div>
          <span class="text-xs text-muted tabular-nums">{{ s.achieved_verses }}/{{ s.total_verses }}</span>
        </div>

        <UButton
          v-if="showRecord"
          size="xs"
          variant="soft"
          icon="i-lucide-award"
          block
          :loading="recordingIndex === i"
          :disabled="recordingIndex !== null"
          :aria-label="t('pages.planner.cellDialog.recordForSession', { range: sessionRange(s) })"
          @click="recordForSession(i)"
        >
          {{ t('pages.planner.cellDialog.record') }}
        </UButton>
      </li>
    </ul>

    <!-- Cell-level actions -->
    <div v-if="editable" class="space-y-2">
      <div class="flex flex-wrap gap-2">
        <UButton size="sm" variant="soft" icon="i-lucide-plus" @click="addBlankSession">
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
          @click="pasteCell(day, track)"
        >
          {{ t('pages.planner.paste', { count: copiedCell.length }) }}
        </UButton>
        <UButton
          v-if="sessions.length"
          size="sm"
          variant="soft"
          color="error"
          icon="i-lucide-trash-2"
          @click="clearCell(day, track)"
        >
          {{ t('pages.planner.cell.clear') }}
        </UButton>
      </div>
      <p v-if="sessions.length" class="text-xs text-muted">
        {{ t('pages.planner.cellDialog.editHint') }}
      </p>
    </div>

    <PlannerCellAchievements
      :student-id="selectedStudentId ?? null"
      :halaqa-id="selectedHalaqaId ?? null"
      :date="isoDate"
      :track="track"
    />
  </div>
</template>
