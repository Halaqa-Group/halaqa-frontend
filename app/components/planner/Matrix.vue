<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { SURAH_NAMES } from '~/data/constants'
import { formatVerseRange } from '~/utils/quran'
import { TRACK_BADGE_COLOR, TRACK_ICON, type AchievementTrack } from '~/utils/achievement'
import { planItemStatusDot } from '~/utils/plan'
import { PLAN_TRACKS } from '~/composables/useWeeklyPlan'

type TrackType = 'Hifz' | 'Near' | 'Far'

const props = defineProps<{ editable: boolean }>()

const { t, locale } = useI18n()
const toast = useToast()
const {
  restDays, copiedCell, dateOfDay, getCell,
  toggleRestDay, copyRowToAllDays, applyColumnToAllDays, pasteCell, moveCell
} = useWeeklyPlan()

type CellRef = { day: number, track: TrackType }
const dragSource = ref<CellRef | null>(null)
const dragOver = ref<CellRef | null>(null)

const isDragOver = (day: number, track: TrackType) =>
  dragOver.value?.day === day && dragOver.value?.track === track

function onDragStart(day: number, track: TrackType, e: DragEvent) {
  if (!props.editable || !getCell(day, track)) return
  dragSource.value = { day, track }
  e.dataTransfer!.effectAllowed = 'move'
  // Firefox requires data to be set for the drag to start.
  e.dataTransfer!.setData('text/plain', `${day}:${track}`)
}

function onDragEnter(day: number, track: TrackType) {
  if (!dragSource.value || restDays.has(day)) return
  dragOver.value = { day, track }
}

function onDrop(day: number, track: TrackType) {
  const src = dragSource.value
  dragSource.value = null
  dragOver.value = null
  if (!src) return
  moveCell(src.day, src.track, day, track)
}

function onDragEnd() {
  dragSource.value = null
  dragOver.value = null
}

const days = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = dateOfDay(i)
    let label = String(i)
    let short = String(i)
    try {
      label = d.toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : locale.value, { weekday: 'long' })
      short = d.toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : locale.value, { day: 'numeric', month: 'short' })
    } catch { }
    return { index: i, label, short, isRest: restDays.has(i) }
  })
)

const tracks = PLAN_TRACKS as TrackType[]

function rangeLabel(day: number, track: TrackType) {
  const c = getCell(day, track)
  return c ? formatVerseRange(c.start_surah, c.start_verse, c.end_surah, c.end_verse, SURAH_NAMES) : ''
}

const dialogOpen = ref(false)
const active = ref<{ day: number, track: TrackType }>({ day: 0, track: 'Hifz' })
function openCell(day: number, track: TrackType) {
  active.value = { day, track }
  dialogOpen.value = true
}

function onPaste(day: number, track: TrackType) {
  pasteCell(day, track)
  toast.add({ title: t('pages.planner.cellPastedToast'), color: 'success' })
}

function rowMenu(day: number): DropdownMenuItem[][] {
  return [[
    {
      label: restDays.has(day) ? t('pages.planner.row.restDayActive') : t('pages.planner.row.restDay'),
      icon: 'i-lucide-moon',
      onSelect: () => toggleRestDay(day)
    },
    {
      label: t('pages.planner.row.copyToAllDays'),
      icon: 'i-lucide-copy',
      onSelect: () => {
        copyRowToAllDays(day)
        toast.add({ title: t('pages.planner.row.copiedToast'), color: 'success' })
      }
    }
  ]]
}
function columnMenu(track: TrackType): DropdownMenuItem[][] {
  return [[
    {
      label: t('pages.planner.columns.applyToAllDays'),
      icon: 'i-lucide-arrow-down-to-line',
      onSelect: () => {
        const ok = applyColumnToAllDays(track)
        toast.add({
          title: ok ? t('pages.planner.columns.appliedToast') : t('pages.planner.columns.noFilledCell'),
          color: ok ? 'success' : 'warning'
        })
      }
    }
  ]]
}
</script>

<template>
  <div class="p-3 sm:p-5">
    <div class="hidden md:block overflow-x-auto">
      <div class="min-w-[720px]">
        <div class="grid grid-cols-[10rem_repeat(3,1fr)] gap-2 pb-2">
          <div />
          <div v-for="track in tracks" :key="track" class="flex items-center justify-between gap-1 px-2">
            <span class="inline-flex items-center gap-1.5 font-semibold text-sm">
              <UIcon :name="TRACK_ICON[track as AchievementTrack]" class="w-4 h-4" />
              {{ t(`pages.achievements.tracks.${track}`) }}
            </span>
            <UDropdownMenu v-if="editable" :items="columnMenu(track)" :content="{ align: 'end' }">
              <UButton icon="i-lucide-chevron-down" size="xs" color="neutral" variant="ghost" square />
            </UDropdownMenu>
          </div>
        </div>

        <div
          v-for="day in days"
          :key="day.index"
          class="grid grid-cols-[10rem_repeat(3,1fr)] gap-2 py-1"
          :class="day.isRest && 'opacity-60'"
        >
          <div class="flex items-center justify-between gap-1 px-2 py-2 rounded-lg bg-elevated">
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">
                {{ day.label }}
              </p>
              <p class="text-xs text-muted">
                {{ day.short }}
              </p>
            </div>
            <UDropdownMenu v-if="editable" :items="rowMenu(day.index)" :content="{ align: 'end' }">
              <UButton icon="i-lucide-ellipsis-vertical" size="xs" color="neutral" variant="ghost" square />
            </UDropdownMenu>
          </div>

          <div
            v-for="track in tracks"
            :key="track"
            class="relative"
            @dragover.prevent
            @dragenter.prevent="editable && onDragEnter(day.index, track)"
            @drop.prevent="editable && onDrop(day.index, track)"
          >
            <template v-if="day.isRest">
              <div class="h-full min-h-[3.25rem] flex items-center justify-center rounded-lg border border-dashed border-default text-xs text-muted">
                {{ t('pages.planner.row.restDay') }}
              </div>
            </template>
            <button
              v-else-if="getCell(day.index, track)"
              type="button"
              :draggable="editable"
              class="w-full h-full min-h-[3.25rem] flex flex-col items-start justify-center gap-1 rounded-lg border bg-default px-3 py-2 text-start transition hover:border-primary hover:bg-elevated"
              :class="[
                editable && 'cursor-grab active:cursor-grabbing',
                isDragOver(day.index, track) ? 'border-primary ring-2 ring-primary/40' : 'border-default',
                dragSource?.day === day.index && dragSource?.track === track && 'opacity-40'
              ]"
              @click="openCell(day.index, track)"
              @dragstart="onDragStart(day.index, track, $event)"
              @dragend="onDragEnd"
            >
              <span class="text-sm font-medium leading-tight">{{ rangeLabel(day.index, track) }}</span>
              <span
                v-if="getCell(day.index, track)?.status"
                class="inline-flex items-center gap-1 text-[11px] text-muted"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="planItemStatusDot(getCell(day.index, track)!.status!)" />
                {{ getCell(day.index, track)!.achieved_verses }}/{{ getCell(day.index, track)!.total_verses }}
              </span>
            </button>
            <button
              v-else
              type="button"
              class="w-full h-full min-h-[3.25rem] flex items-center justify-center rounded-lg border border-dashed text-muted transition hover:border-primary hover:text-primary"
              :class="isDragOver(day.index, track) ? 'border-primary text-primary ring-2 ring-primary/40' : 'border-default'"
              :disabled="!editable"
              @click="openCell(day.index, track)"
            >
              <UIcon name="i-lucide-plus" class="w-4 h-4" />
            </button>

            <UButton
              v-if="editable && copiedCell && !day.isRest"
              icon="i-lucide-clipboard-paste"
              size="xs"
              color="primary"
              variant="soft"
              square
              class="absolute top-1 end-1"
              :aria-label="t('pages.planner.paste', { count: 1 })"
              @click.stop="onPaste(day.index, track)"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="md:hidden space-y-3">
      <div
        v-for="day in days"
        :key="day.index"
        class="rounded-xl border border-default bg-default overflow-hidden"
        :class="day.isRest && 'opacity-70'"
      >
        <div class="flex items-center justify-between gap-2 px-3 py-2 bg-elevated">
          <div>
            <p class="text-sm font-semibold">
              {{ day.label }}
            </p>
            <p class="text-xs text-muted">
              {{ day.short }}
            </p>
          </div>
          <UDropdownMenu v-if="editable" :items="rowMenu(day.index)" :content="{ align: 'end' }">
            <UButton icon="i-lucide-ellipsis-vertical" size="xs" color="neutral" variant="ghost" square />
          </UDropdownMenu>
        </div>

        <div v-if="day.isRest" class="px-3 py-4 text-center text-xs text-muted">
          {{ t('pages.planner.row.restDay') }}
        </div>
        <div v-else class="divide-y divide-default">
          <div
            v-for="track in tracks"
            :key="track"
            class="flex items-center gap-2 px-3 py-2.5"
          >
            <UBadge variant="subtle" size="sm" :color="TRACK_BADGE_COLOR[track as AchievementTrack]" class="shrink-0">
              {{ t(`pages.achievements.tracks.${track}`) }}
            </UBadge>
            <button
              type="button"
              class="flex-1 min-w-0 flex items-center justify-between gap-2 text-start"
              @click="openCell(day.index, track)"
            >
              <span v-if="getCell(day.index, track)" class="text-sm truncate">{{ rangeLabel(day.index, track) }}</span>
              <span v-else class="text-xs text-muted inline-flex items-center gap-1">
                <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" /> {{ t('pages.planner.cell.addLabel') }}
              </span>
              <span
                v-if="getCell(day.index, track)?.status"
                class="w-2 h-2 rounded-full shrink-0"
                :class="planItemStatusDot(getCell(day.index, track)!.status!)"
              />
            </button>
            <UButton
              v-if="editable && copiedCell"
              icon="i-lucide-clipboard-paste"
              size="xs"
              color="primary"
              variant="ghost"
              square
              :aria-label="t('pages.planner.paste', { count: 1 })"
              @click="onPaste(day.index, track)"
            />
          </div>
        </div>
      </div>
    </div>

    <PlannerCellDialog
      v-model:open="dialogOpen"
      :day="active.day"
      :track="active.track"
      :editable="editable"
    />
  </div>
</template>
