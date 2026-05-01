<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Student } from '~/types'

const props = defineProps<{ student: Student }>()
const { t } = useI18n()
const { openView, openEdit } = useStudents()
const toast = useToast()

const meta = computed(() => getStudentMockMeta(props.student))
const badge = computed(() => STATUS_BADGE_CLASSES[meta.value.statusVariant])
const progressClasses = computed(() => progressColorClasses(meta.value.progress))
const attendanceDot = computed(() => attendanceDotClass(meta.value.attendanceRate))

const progressBarWidth = computed(() => {
  const p = meta.value.progress
  return p === 0 ? '4px' : `${p}%`
})

const lastSessionLabel = computed(() => {
  const d = meta.value.lastSessionDays
  if (d === null) return t('pages.students.card.noSessions')
  if (d === 0) return t('pages.students.card.today')
  if (d === 1) return t('pages.students.card.yesterday')
  if (d < 7) return t('pages.students.card.daysAgo', { count: d })
  return t('pages.students.card.weeksAgo', { count: Math.floor(d / 7) })
})

const statusLabel = computed(() => {
  switch (meta.value.statusVariant) {
    case 'active': return t('pages.students.statusBadge.active')
    case 'frequentAbsent': return t('pages.students.statusBadge.frequentAbsent')
    case 'stopped': return t('pages.students.statusBadge.stopped')
    case 'new': return t('pages.students.statusBadge.new')
  }
  return ''
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
    class="bg-white border border-outline-variant rounded-2xl p-6 flex flex-col gap-5 transition-all duration-200 hover:shadow-lg hover:border-primary/20"
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
            class="absolute bottom-0 end-0 w-4 h-4 rounded-full border-2 border-white"
            :class="badge.dot"
          />
        </div>
        <h3 class="text-xl font-bold leading-tight truncate text-on-surface">
          {{ student.name }}
        </h3>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
          :class="badge.container"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="badge.dot" />
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
        <span v-if="meta.hasAnyAchievement" class="text-sm text-on-surface-variant">
          {{ $t('pages.students.card.currentSurah') }}: {{ meta.currentSurah }}
        </span>
        <span v-else class="text-sm text-on-surface-variant">
          {{ $t('pages.students.card.awaitingFirst') }}
        </span>

        <span v-if="meta.hasAnyAchievement" class="text-sm font-bold" :class="progressClasses.text">
          {{ meta.progress }}%
        </span>
        <span v-else class="text-sm font-medium text-on-surface-variant">
          {{ $t('pages.students.card.notStarted') }}
        </span>
      </div>
      <div class="w-full h-2 rounded-full overflow-hidden bg-primary-container">
        <div
          class="h-full rounded-full transition-all duration-200"
          :class="progressClasses.bg"
          :style="{ width: progressBarWidth }"
        />
      </div>
    </div>

    <!-- Info rows -->
    <div class="grid grid-cols-2 gap-3 text-sm">
      <div class="flex flex-col gap-0.5">
        <span class="text-xs text-on-surface-variant">
          {{ $t('pages.students.card.lastSession') }}
        </span>
        <span class="text-on-surface">
          {{ lastSessionLabel }}
        </span>
      </div>
      <div class="flex flex-col gap-0.5">
        <span class="text-xs text-on-surface-variant">
          {{ $t('pages.students.card.totalAyahs') }}
        </span>
        <span class="text-on-surface">
          {{ meta.ayahCount }} {{ $t('pages.students.card.ayahUnit') }}
        </span>
      </div>
      <div class="flex flex-col gap-0.5">
        <span class="text-xs text-on-surface-variant">
          {{ $t('pages.students.card.attendanceRate') }}
        </span>
        <span class="inline-flex items-center gap-1.5 text-on-surface">
          <span class="w-2 h-2 rounded-full shrink-0" :class="attendanceDot" />
          {{ meta.attendanceRate }}%
        </span>
      </div>
      <div class="flex flex-col gap-0.5">
        <span class="text-xs text-on-surface-variant">
          {{ $t('pages.students.card.currentSurah') }}
        </span>
        <span class="truncate text-on-surface">
          {{ meta.hasAnyAchievement ? meta.currentSurah : '—' }}
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
      class="py-2.5 px-4 text-sm hover:opacity-80 active:scale-95 bg-primary-container text-primary"
      @click="openView(student)"
    />
  </div>
</template>
