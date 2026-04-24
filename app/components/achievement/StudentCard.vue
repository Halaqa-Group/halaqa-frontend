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
  Present: { color: '#4A8E85', bg: '#E0F0EE', label: 'حاضر' },
  Late: { color: '#F57C00', bg: '#FFF3E0', label: 'متأخر' }
}

const config = props.student.attendanceStatus
  ? statusConfig[props.student.attendanceStatus as 'Present' | 'Late']
  : null
</script>

<template>
  <button
    class="w-full rounded-2xl p-3 flex items-center gap-3 transition-all text-right"
    :style="selected
      ? 'background-color: var(--color-primary); box-shadow: var(--shadow-card);'
      : 'background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-outline-variant);'"
    @click="emit('select', student)"
  >
    <!-- Avatar -->
    <div class="relative shrink-0">
      <img :src="student.avatar" class="w-10 h-10 rounded-full" :alt="student.name">
      <span
        v-if="config"
        class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
        :style="`background-color: ${config.color};`"
      />
    </div>

    <!-- Name + status -->
    <div class="flex-1 min-w-0">
      <p
        class="body-md font-arabic font-semibold truncate"
        :style="selected ? 'color: white;' : 'color: var(--color-on-surface);'"
      >
        {{ student.name }}
      </p>
      <p
        v-if="config"
        class="label-sm font-arabic"
        :style="selected ? 'color: rgba(255,255,255,0.8);' : `color: ${config.color};`"
      >
        {{ config.label }}
      </p>
    </div>

    <!-- Selection indicator -->
    <UIcon
      v-if="selected"
      name="i-lucide-check"
      class="w-5 h-5"
      style="color: white;"
    />
  </button>
</template>
