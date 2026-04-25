<script setup lang="ts">
import type { StudentWithAttendance } from '~/types'

const props = defineProps<{
  student: StudentWithAttendance
  selected: boolean
}>()

const emit = defineEmits<{
  select: [student: StudentWithAttendance]
}>()

const statusConfig = {
  Present: { color: '#2A6B64', bg: '#E0F0EE', label: 'حاضر' },
  Late: { color: '#C76400', bg: '#FFF3E0', label: 'متأخر' }
}

const config = computed(() =>
  props.student.attendanceStatus
    ? statusConfig[props.student.attendanceStatus as 'Present' | 'Late']
    : null
)
</script>

<template>
  <UButton
    variant="ghost"
    color="neutral"
    class="w-full rounded-2xl p-3 gap-3 text-start"
    :style="selected
      ? 'background-color: var(--color-primary); box-shadow: 0 4px 14px rgba(128,76,125,0.25);'
      : 'background-color: var(--color-surface-container-lowest); border: 1.5px solid var(--color-outline-variant);'"
    @click="emit('select', student)"
  >
    <img :src="student.avatar" class="w-11 h-11 rounded-full object-cover shrink-0" :alt="student.name">

    <p
      class="flex-1 min-w-0 text-base font-bold truncate"
      :style="selected ? 'color: white;' : 'color: var(--color-on-surface);'"
    >
      {{ student.name }}
    </p>

    <span
      v-if="config"
      class="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold"
      :style="selected
        ? 'background-color: rgba(255,255,255,0.2); color: white;'
        : `background-color: ${config.bg}; color: ${config.color};`"
    >
      {{ config.label }}
    </span>
  </UButton>
</template>
