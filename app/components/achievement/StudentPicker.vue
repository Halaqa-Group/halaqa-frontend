<script setup lang="ts">
import type { StudentWithAttendance } from '~/types'

defineProps<{
  students: StudentWithAttendance[]
}>()

const emit = defineEmits<{
  select: [student: StudentWithAttendance]
}>()

function statusClasses(status: StudentWithAttendance['attendanceStatus']): string {
  switch (status) {
    case 'Present': return 'text-status-ok bg-status-ok-bg'
    case 'Late': return 'text-status-warning bg-status-warning-bg'
    case 'Absent': return 'text-track-near bg-track-near-bg'
    default: return 'text-on-surface-variant bg-surface-container'
  }
}
</script>

<template>
  <div class="rounded-2xl p-4 sm:p-6 ring ring-card-border bg-surface-container-lowest">
    <div class="flex items-center gap-3 mb-5">
      <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary-container">
        <LucideUserCheck class="w-5 h-5 text-primary" />
      </div>
      <div>
        <p class="text-base font-bold leading-tight text-on-surface">
          {{ $t('pages.achievements.selectStudentToLog') }}
        </p>
        <p class="text-xs mt-0.5 text-on-surface-variant">
          اضغط على بطاقة الطالب للبدء بتسجيل إنجاز
        </p>
      </div>
    </div>

    <div
      v-if="students.length === 0"
      class="flex flex-col items-center gap-2 py-8"
    >
      <LucideUsers class="w-8 h-8 text-on-surface-variant" />
      <p class="text-sm text-on-surface-variant">
        لا يوجد طلاب في هذه الحلقة
      </p>
    </div>

    <div
      v-else
      class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
    >
      <button
        v-for="student in students"
        :key="student.id"
        type="button"
        class="group rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer bg-surface-container-low border-[1.5px] border-card-border"
        @click="emit('select', student)"
      >
        <img
          :src="student.avatar"
          :alt="student.name"
          class="w-14 h-14 rounded-full object-cover ring-2 ring-transparent group-hover:ring-primary/40 transition-all"
        >
        <p class="text-sm font-bold leading-tight line-clamp-1 text-on-surface">
          {{ student.name }}
        </p>
        <span
          v-if="student.attendanceStatus"
          class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          :class="statusClasses(student.attendanceStatus)"
        >
          {{ $t(`attendance.status.${student.attendanceStatus.toLowerCase()}`) }}
        </span>
        <span v-else class="text-[10px] text-on-surface-variant">—</span>
      </button>
    </div>
  </div>
</template>
