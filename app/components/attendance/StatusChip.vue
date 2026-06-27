<script setup lang="ts">
import type { AttendanceStatus } from '~/types'
import type { BadgeColor } from '~/utils/halaqa'

const props = defineProps<{
  studentId: string
  status: AttendanceStatus
}>()

const { t } = useI18n()
const { cycleStatus } = useAttendance()

const meta = computed<{ color: BadgeColor, label: string }>(() => {
  if (props.status === 'present') return { color: 'success', label: t('attendance.status.present') }
  if (props.status === 'late') return { color: 'warning', label: t('attendance.status.late') }
  return { color: 'error', label: t('attendance.status.absent') }
})
</script>

<template>
  <button
    type="button"
    class="cursor-pointer select-none transition-transform hover:scale-105 active:scale-95"
    :title="t('pages.attendance.cycleStatusHint')"
    @click="cycleStatus(studentId)"
  >
    <UBadge :color="meta.color" variant="subtle" size="md">
      {{ meta.label }}
    </UBadge>
  </button>
</template>
