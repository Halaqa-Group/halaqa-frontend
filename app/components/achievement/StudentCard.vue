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
  Present: { textClass: 'text-track-hifz', bgClass: 'bg-track-hifz-bg', label: 'حاضر' },
  Late: { textClass: 'text-track-far', bgClass: 'bg-track-far-bg', label: 'متأخر' }
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
    :class="selected
      ? 'bg-primary shadow-lg shadow-primary/25'
      : 'bg-surface-container-lowest border-[1.5px] border-outline-variant'"
    @click="emit('select', student)"
  >
    <img :src="student.avatar" class="w-11 h-11 rounded-full object-cover shrink-0" :alt="student.name">

    <p
      class="flex-1 min-w-0 text-base font-bold truncate"
      :class="selected ? 'text-white' : 'text-on-surface'"
    >
      {{ student.name }}
    </p>

    <span
      v-if="config"
      class="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold"
      :class="selected ? 'bg-white/20 text-white' : [config.textClass, config.bgClass]"
    >
      {{ config.label }}
    </span>
  </UButton>
</template>
