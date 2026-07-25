<script setup lang="ts">
import type { AttendanceStatus } from '~/types'

const props = defineProps<{
  studentId: string
  name: string
  avatar: string
  status: AttendanceStatus
  ethicsRating: number
  notes: string
  dailyNote?: string
}>()

const { canMarkStudentAttendance: canEdit } = usePermissions()
const { wasAbsentYesterday, setStatus, setEthicsRating } = useAttendance()
const absentYesterday = computed(() => wasAbsentYesterday(props.studentId))
</script>

<template>
  <div class="rounded-xl border border-default bg-default p-4 flex flex-col gap-3">
    <div class="flex items-center gap-3">
      <img :src="avatar" :alt="name" class="w-10 h-10 rounded-full object-cover border border-default shrink-0">
      <div class="min-w-0 flex-1">
        <p class="font-semibold truncate">
          {{ name }}
        </p>
        <UBadge
          v-if="absentYesterday"
          color="error"
          variant="subtle"
          size="sm"
          icon="i-lucide-alert-triangle"
          class="mt-0.5"
        >
          {{ $t('pages.attendance.absentYesterday') }}
        </UBadge>
      </div>
      <AttendanceRowActions
        :student-id="studentId"
        :name="name"
        :notes="notes"
        :daily-note="dailyNote"
        :can-edit="canEdit"
      />
    </div>

    <AttendanceStatusToggle :status="status" :disabled="!canEdit" @set="(s) => setStatus(studentId, s)" />

    <div class="flex items-center justify-between gap-2">
      <span class="text-xs text-muted">{{ $t('pages.attendance.ethics.label') }}</span>
      <AttendanceEthicsRating
        :rating="ethicsRating"
        :disabled="!canEdit"
        @set="(r) => setEthicsRating(studentId, r)"
      />
    </div>
  </div>
</template>
