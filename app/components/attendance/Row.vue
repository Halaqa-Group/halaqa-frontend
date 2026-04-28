<script setup lang="ts">
import type { AttendanceStatus } from '~/types'
import type { ViewMode } from '~/composables/useAttendance'

const props = withDefaults(defineProps<{
  studentId: string
  name: string
  avatar: string
  currentSurah: string
  status: AttendanceStatus
  notes: string
  view?: ViewMode
  absentYesterday?: boolean
}>(), {
  view: 'grid',
  absentYesterday: false
})

const { t } = useI18n()
const { cycleStatus, setNote } = useAttendance()

const statusMeta = computed(() => {
  if (props.status === 'present') {
    return {
      label: t('attendance.status.present'),
      borderColor: 'var(--color-track-hifz)',
      chipBg: 'var(--color-track-hifz-bg)',
      chipText: 'var(--color-track-hifz)',
      dot: 'var(--color-track-hifz)'
    }
  }
  if (props.status === 'late') {
    return {
      label: t('attendance.status.late'),
      borderColor: 'var(--color-track-far)',
      chipBg: 'var(--color-track-far-bg)',
      chipText: 'var(--color-track-far)',
      dot: 'var(--color-track-far)'
    }
  }
  return {
    label: t('attendance.status.absent'),
    borderColor: 'var(--color-track-near)',
    chipBg: 'var(--color-track-near-bg)',
    chipText: 'var(--color-track-near)',
    dot: 'var(--color-track-near)'
  }
})

const isList = computed(() => props.view === 'list')

const localNote = ref(props.notes)
watch(() => props.notes, (v) => {
  localNote.value = v
})

const popoverOpen = ref(false)

function commitNote() {
  setNote(props.studentId, localNote.value)
  popoverOpen.value = false
}

function onCycle() {
  cycleStatus(props.studentId)
}
</script>

<template>
  <div
    class="bg-surface-container-lowest border border-outline-variant rounded-2xl flex items-center gap-3 sm:gap-4 group hover:border-primary/20 hover:shadow-sm transition-all duration-200 border-s-4"
    :class="isList ? 'p-3' : 'p-4 sm:p-5'"
    :style="{ borderInlineStartColor: statusMeta.borderColor }"
  >
    <!-- Avatar + status dot -->
    <div class="relative shrink-0">
      <div
        class="rounded-full overflow-hidden border-2 border-default"
        :class="isList ? 'w-10 h-10' : 'w-12 h-12 sm:w-14 sm:h-14'"
      >
        <img :src="avatar" :alt="name" class="w-full h-full object-cover">
      </div>
      <span
        class="absolute bottom-0 end-0 rounded-full border-2 border-surface-container-lowest transition-colors duration-200"
        :class="isList ? 'w-3 h-3' : 'w-3.5 h-3.5'"
        :style="{ backgroundColor: statusMeta.dot }"
      />
    </div>

    <!-- Name + badge -->
    <div class="min-w-0 flex-1 flex flex-col gap-1">
      <div class="flex items-center gap-2 flex-wrap">
        <h4
          class="font-bold text-on-surface leading-tight truncate"
          :class="isList ? 'text-sm sm:text-base' : 'text-lg sm:text-xl'"
        >
          {{ name }}
        </h4>
        <span
          v-if="absentYesterday"
          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
          :style="{ backgroundColor: 'var(--color-track-near-bg)', color: 'var(--color-track-near)' }"
        >
          <UIcon name="i-lucide-alert-triangle" class="w-3 h-3" />
          {{ $t('pages.attendance.absentYesterday') }}
        </span>
      </div>
      <span
        v-if="!isList && currentSurah && currentSurah !== '—'"
        class="text-xs sm:text-sm text-on-surface-variant"
      >
        {{ currentSurah }}
      </span>
    </div>

    <!-- Status cycle chip -->
    <button
      type="button"
      :title="$t('pages.attendance.cycleStatusHint')"
      class="cursor-pointer rounded-full font-semibold transition-all duration-200 ease-out hover:scale-105 active:scale-95 shrink-0"
      :class="isList ? 'px-3 py-1 text-xs' : 'px-3 sm:px-5 py-1.5 text-sm sm:text-base'"
      :style="{ backgroundColor: statusMeta.chipBg, color: statusMeta.chipText }"
      @click="onCycle"
    >
      <Transition
        mode="out-in"
        enter-active-class="transition-opacity duration-150"
        leave-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <span :key="status">{{ statusMeta.label }}</span>
      </Transition>
    </button>

    <!-- Notes popover -->
    <UPopover v-model:open="popoverOpen" :ui="{ content: 'w-80 p-4' }">
      <UButton
        :variant="notes ? 'soft' : 'ghost'"
        :color="notes ? 'primary' : 'neutral'"
        :icon="notes ? 'i-lucide-sticky-note' : 'i-lucide-message-square-plus'"
        :size="isList ? 'xs' : 'sm'"
        square
        :aria-label="$t('pages.attendance.addNote')"
        class="shrink-0"
      />
      <template #content>
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-on-surface">
            {{ $t('pages.attendance.noteFor', { name }) }}
          </p>
          <UTextarea
            v-model="localNote"
            :rows="4"
            :placeholder="$t('pages.attendance.noteEmpty')"
            autofocus
            class="w-full"
            :ui="{
              base: 'w-full resize-none rounded-xl px-3 py-2 text-sm bg-surface-container-low text-on-surface focus:ring-1 focus:ring-primary'
            }"
          />
          <div class="flex items-center justify-end gap-2">
            <UButton
              variant="ghost"
              color="neutral"
              size="sm"
              :label="$t('common.cancel')"
              @click="popoverOpen = false"
            />
            <UButton
              color="primary"
              size="sm"
              :label="$t('pages.attendance.saveNote')"
              @click="commitNote"
            />
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>
