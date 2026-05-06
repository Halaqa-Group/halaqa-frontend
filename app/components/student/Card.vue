<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Student } from '~/types'

const props = defineProps<{ student: Student }>()
const { t } = useI18n()
const { openView, openEdit, openNotifyParent } = useStudents()
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
    onSelect: () => openNotifyParent(props.student)
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
    class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 flex flex-col gap-5 transition-all duration-200 hover:shadow-lg hover:border-primary/20"
  >
    <!-- Header: avatar + name + status badge + kebab -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-4 min-w-0">
        <div class="relative shrink-0">
          <img
            :src="student.avatar"
            :alt="student.name"
            class="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
          >
          <span
            class="absolute bottom-0 end-0 w-4 h-4 rounded-full border-2 border-surface-container-lowest"
            :class="student.status === 'active' ? 'bg-status-ok' : student.status === 'inactive' ? 'bg-status-warning' : 'bg-status-info'"
          />
        </div>
        <h3 class="text-xl font-bold leading-tight truncate text-on-surface">
          {{ student.name }}
        </h3>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
          :class="student.status === 'active' ? 'bg-track-hifz-bg text-track-hifz' : student.status === 'inactive' ? 'bg-status-warning-bg text-status-warning' : 'bg-status-info-bg text-status-info'"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="student.status === 'active' ? 'bg-status-ok' : student.status === 'inactive' ? 'bg-status-warning' : 'bg-status-info'" />
          {{ statusLabel }}
        </span>

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

    <!-- Progress -->
    <div>
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm text-on-surface-variant">
          {{ $t('pages.students.card.currentSurah') }}: {{ student.currentSurah }}
        </span>
      </div>
    </div>

    <!-- Info rows -->
    <div class="grid grid-cols-2 gap-3 text-sm">
      <div class="flex flex-col gap-0.5">
        <span class="text-xs text-on-surface-variant">
          {{ $t('pages.students.card.dailyHifz') }}
        </span>
        <span class="text-on-surface">
          {{ student.dailyHifzPagesCapacity }} {{ $t('pages.students.card.pagesUnit') }}
        </span>
      </div>
      <div class="flex flex-col gap-0.5">
        <span class="text-xs text-on-surface-variant">
          {{ $t('pages.students.card.dailyNear') }}
        </span>
        <span class="text-on-surface">
          {{ student.dailyNearPagesCapacity }} {{ $t('pages.students.card.pagesUnit') }}
        </span>
      </div>
      <div class="flex flex-col gap-0.5">
        <span class="text-xs text-on-surface-variant">
          {{ $t('pages.students.card.dailyFar') }}
        </span>
        <span class="text-on-surface">
          {{ student.dailyFarPagesCapacity }} {{ $t('pages.students.card.pagesUnit') }}
        </span>
      </div>
      <div class="flex flex-col gap-0.5">
        <span class="text-xs text-on-surface-variant">
          {{ $t('pages.students.card.guardians') }}
        </span>
        <span class="truncate text-on-surface">
          {{ student.guardians.length }}
        </span>
      </div>
    </div>

    <!-- Primary action -->
    <UButton
      variant="soft"
      color="primary"
      block
      size="md"
      :label="$t('pages.students.card.viewProfile')"
      class="py-2.5 px-4 text-sm hover:opacity-80 active:scale-95"
      @click="openView(student)"
    />
  </div>
</template>
