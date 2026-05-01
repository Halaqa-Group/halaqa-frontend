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
          :class="badge.dot"
        />
      </div>
      <div class="flex flex-col min-w-0">
        <span class="font-bold truncate text-on-surface">{{ student.name }}</span>
        <span class="text-xs truncate text-on-surface-variant">
          <template v-if="meta.hasAnyAchievement">
            {{ $t('pages.students.card.currentSurah') }}: {{ meta.currentSurah }}
          </template>
          <template v-else>
            {{ $t('pages.students.card.notStarted') }}
          </template>
        </span>
      </div>
    </div>

    <!-- Status badge -->
    <span
      class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
      :class="badge.container"
    >
      <span class="w-1.5 h-1.5 rounded-full" :class="badge.dot" />
      {{ statusLabel }}
    </span>

    <!-- Progress -->
    <div class="hidden xl:flex flex-col shrink-0 w-20">
      <span class="text-[10px] uppercase tracking-wide text-on-surface-variant">
        {{ $t('pages.students.stats.avgMemorization') }}
      </span>
      <span v-if="meta.hasAnyAchievement" class="text-sm font-bold" :class="progressClasses.text">
        {{ meta.progress }}%
      </span>
      <span v-else class="text-xs text-on-surface-variant">
        {{ $t('pages.students.card.notStarted') }}
      </span>
    </div>

    <!-- Attendance -->
    <div class="hidden md:flex flex-col shrink-0 w-20">
      <span class="text-[10px] uppercase tracking-wide text-on-surface-variant">
        {{ $t('pages.students.card.attendanceRate') }}
      </span>
      <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface">
        <span class="w-2 h-2 rounded-full shrink-0" :class="attendanceDot" />
        {{ meta.attendanceRate }}%
      </span>
    </div>

    <!-- Memorized ayahs -->
    <div class="hidden lg:flex flex-col shrink-0 w-20">
      <span class="text-[10px] uppercase tracking-wide text-on-surface-variant">
        {{ $t('pages.students.card.totalAyahs') }}
      </span>
      <span class="text-sm font-semibold text-on-surface">
        {{ meta.ayahCount }} {{ $t('pages.students.card.ayahUnit') }}
      </span>
    </div>

    <!-- Last session -->
    <div class="hidden md:flex flex-col shrink-0 w-24">
      <span class="text-[10px] uppercase tracking-wide text-on-surface-variant">
        {{ $t('pages.students.card.lastSession') }}
      </span>
      <span class="text-sm text-on-surface">
        {{ lastSessionLabel }}
      </span>
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
