<script setup lang="ts">
import type { AttendanceStatus } from '~/types'

defineProps<{
  status: AttendanceStatus
  compact?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  set: [status: AttendanceStatus]
}>()

const { t } = useI18n()

const STATUSES: { value: AttendanceStatus, icon: string, active: string, labelKey: string }[] = [
  { value: 'present', icon: 'i-lucide-check', active: 'bg-success-500 text-white', labelKey: 'attendance.status.present' },
  { value: 'late', icon: 'i-lucide-clock', active: 'bg-warning-500 text-white', labelKey: 'attendance.status.late' },
  { value: 'absent', icon: 'i-lucide-x', active: 'bg-error-500 text-white', labelKey: 'attendance.status.absent' },
  { value: 'excused', icon: 'i-lucide-shield-check', active: 'bg-info-500 text-white', labelKey: 'attendance.status.excused' }
]
</script>

<template>
  <div
    class="rounded-lg border border-default bg-elevated p-0.5 flex gap-0.5"
    :class="[compact ? 'inline-flex' : 'w-full', disabled ? 'opacity-60' : '']"
    role="group"
  >
    <button
      v-for="s in STATUSES"
      :key="s.value"
      type="button"
      class="flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors min-h-9"
      :class="[
        compact ? 'px-2.5' : 'flex-1 py-2',
        status === s.value ? s.active : 'text-muted hover:text-highlighted hover:bg-default',
        disabled ? 'cursor-not-allowed' : ''
      ]"
      :title="t(s.labelKey)"
      :aria-label="t(s.labelKey)"
      :aria-pressed="status === s.value"
      :disabled="disabled"
      @click="emit('set', s.value)"
    >
      <UIcon :name="s.icon" class="w-4 h-4 shrink-0" />
      <span v-if="!compact" class="truncate">{{ t(s.labelKey) }}</span>
    </button>
  </div>
</template>
