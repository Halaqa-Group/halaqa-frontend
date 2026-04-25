<script setup lang="ts">
const { attendanceRate, presentCount, attendanceRows } = useAttendance()
const absentCount = computed(() => attendanceRows.value.filter(r => r.status === 'absent').length)
const lateCount = computed(() => attendanceRows.value.filter(r => r.status === 'late').length)
</script>

<template>
  <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
    <!-- Attendance rate -->
    <div class="rounded-2xl p-5" style="background-color: #F0E8EF; box-shadow: var(--shadow-card);">
      <div class="flex items-center justify-between mb-2">
        <span class="label-lg font-bold" style="color: #804c7d;">نسبة الحضور</span>
        <UIcon name="i-lucide-user-check" class="w-9 h-9" style="color: #804c7d;" />
      </div>
      <p class="text-3xl font-bold leading-tight" style="color: #804c7d;">
        {{ attendanceRate }}%
      </p>
      <p class="text-base font-medium leading-relaxed mt-1" style="color: #804c7d;">
        {{ presentCount }} / {{ attendanceRows.length }} طالب
      </p>
    </div>

    <!-- Students present -->
    <div class="rounded-2xl p-5" style="background-color: #E0F0EE; box-shadow: var(--shadow-card);">
      <div class="flex items-center justify-between mb-2">
        <span class="label-lg font-bold" style="color: #2A6B64;">الطلاب الحاضرون</span>
        <UIcon name="i-lucide-users" class="w-9 h-9" style="color: #2A6B64;" />
      </div>
      <p class="text-3xl font-bold leading-tight" style="color: #2A6B64;">
        {{ presentCount }}
      </p>
      <p class="text-base font-medium leading-relaxed mt-1" style="color: #2A6B64;">
        طالب
      </p>
    </div>

    <!-- Students absent -->
    <div class="rounded-2xl p-5" style="background-color: #FCE4EC; box-shadow: var(--shadow-card);">
      <div class="flex items-center justify-between mb-2">
        <span class="label-lg font-bold" style="color: #B5174E;">الغائبون</span>
        <UIcon name="i-lucide-user-x" class="w-9 h-9" style="color: #B5174E;" />
      </div>
      <p class="text-3xl font-bold leading-tight" style="color: #B5174E;">
        {{ absentCount }}
      </p>
      <p class="text-base font-medium leading-relaxed mt-1" style="color: #B5174E;">
        طالب
      </p>
    </div>

    <!-- Students late -->
    <div class="rounded-2xl p-5" style="background-color: #FFF3E0; box-shadow: var(--shadow-card);">
      <div class="flex items-center justify-between mb-2">
        <span class="label-lg font-bold" style="color: #C76400;">المتأخرون</span>
        <UIcon name="i-lucide-clock" class="w-9 h-9" style="color: #C76400;" />
      </div>
      <p class="text-3xl font-bold leading-tight" style="color: #C76400;">
        {{ lateCount }}
      </p>
      <p class="text-base font-medium leading-relaxed mt-1" style="color: #C76400;">
        طالب
      </p>
    </div>
  </div>
</template>
