<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Student } from '~/types'

const props = defineProps<{ student: Student }>()
const { t } = useI18n()
const { openView, openEdit } = useStudents()
const toast = useToast()
const statusLabel = computed(() => {
  if (props.student.status === 'active') return t('pages.students.statusActive')
  if (props.student.status === 'inactive') return t('pages.students.statusInactive')
  return t('pages.students.statusGraduated')
})

const menuItems = computed<DropdownMenuItem[][]>(() => [[
  {
    label: t('pages.students.actions.logAchievement'),
    icon: 'i-lucide-book-open',
    onSelect: () => navigateTo(`/achievements?studentId=${props.student.id}`)
  },
  {
    label: t('pages.students.actions.recordAttendance'),
    icon: 'i-lucide-check',
    onSelect: () => navigateTo(`/attendance?studentId=${props.student.id}`)
  },
  {
    label: t('pages.students.actions.notifyParent'),
    icon: 'i-lucide-bell',
    onSelect: () => {
      toast.add({
        title: t('pages.students.actions.notifyParentToast'),
        icon: 'i-lucide-bell',
        color: 'primary'
      })
    }
  },
  {
    label: t('pages.students.actions.editStudent'),
    icon: 'i-lucide-pencil',
    onSelect: () => openEdit(props.student)
  }
]])
</script>

<template>
  <div
    class="bg-white border border-outline-variant rounded-2xl px-5 py-3 flex items-center gap-5 transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer"
    @click="openView(student)"
  >
    <!-- Avatar + name + current surah -->
    <div class="flex items-center gap-3 flex-1 min-w-0">
      <div class="relative shrink-0">
        <img
          :src="student.avatar"
          :alt="student.name"
          class="w-11 h-11 rounded-full object-cover border-2 border-primary/20"
        >
        <span
          class="absolute bottom-0 end-0 w-3 h-3 rounded-full border-2 border-white"
          :class="student.status === 'active'
            ? 'bg-green-500'
            : student.status === 'inactive'
              ? 'bg-yellow-500'
              : 'bg-blue-500'"
        />
      </div>
      <div class="flex flex-col min-w-0">
        <span class="font-bold truncate text-on-surface">{{ student.name }}</span>
        <span class="text-xs truncate text-on-surface-variant">
          {{ $t('pages.students.card.currentSurah') }}: {{ student.currentSurah }}
        </span>
      </div>
    </div>

    <!-- Status badge -->
    <span
      class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
      :class="student.status === 'active'
        ? 'bg-track-hifz-bg text-track-hifz'
        : student.status === 'inactive'
          ? 'bg-status-warning-bg text-status-warning'
          : 'bg-status-info-bg text-status-info'"
    >
      <span class="w-1.5 h-1.5 rounded-full" :class="student.status === 'active' ? 'bg-green-500' : student.status === 'inactive' ? 'bg-yellow-500' : 'bg-blue-500'" />
      {{ statusLabel }}
    </span>

    <!-- Progress -->
    <div class="hidden xl:flex flex-col shrink-0 w-20">
      <span class="text-[10px] uppercase tracking-wide text-on-surface-variant">
        {{ $t('pages.students.card.dailyHifz') }}
      </span>
      <span class="text-sm font-bold text-on-surface">{{ student.dailyHifzPagesCapacity }}</span>
    </div>

    <!-- Attendance -->
    <div class="hidden md:flex flex-col shrink-0 w-20">
      <span class="text-[10px] uppercase tracking-wide text-on-surface-variant">
        {{ $t('pages.students.card.dailyNear') }}
      </span>
      <span class="text-sm font-semibold text-on-surface">{{ student.dailyNearPagesCapacity }}</span>
    </div>

    <!-- Memorized ayahs -->
    <div class="hidden lg:flex flex-col shrink-0 w-20">
      <span class="text-[10px] uppercase tracking-wide text-on-surface-variant">
        {{ $t('pages.students.card.dailyFar') }}
      </span>
      <span class="text-sm font-semibold text-on-surface">{{ student.dailyFarPagesCapacity }}</span>
    </div>

    <!-- Last session -->
    <div class="hidden md:flex flex-col shrink-0 w-24">
      <span class="text-[10px] uppercase tracking-wide text-on-surface-variant">
        {{ $t('pages.students.card.guardians') }}
      </span>
      <span class="text-sm text-on-surface">{{ student.guardians.length }}</span>
    </div>

    <!-- Quick actions -->
    <div class="shrink-0" @click.stop>
      <UDropdownMenu
        :items="menuItems"
        :content="{ align: 'end', collisionPadding: 12 }"
        :ui="{ content: 'w-56' }"
      >
        <UButton
          icon="i-lucide-more-vertical"
          color="neutral"
          variant="ghost"
          size="sm"
          class="text-on-surface-variant"
        />
      </UDropdownMenu>
    </div>
  </div>
</template>
