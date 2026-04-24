<script setup lang="ts">
const { attendanceRate, presentCount, attendanceRows } = useAttendance()
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <!-- Attendance rate -->
    <div class="rounded-2xl p-5" style="background-color: #FCE4EC; box-shadow: var(--shadow-card);">
      <div class="flex items-center justify-between mb-2">
        <span class="label-md font-arabic" style="color: #D81B60;">نسبة الحضور</span>
        <UIcon name="i-lucide-user-check" class="w-5 h-5" style="color: #D81B60;" />
      </div>
      <p class="display-md" style="color: #D81B60;">{{ attendanceRate }}%</p>
      <p class="body-md font-arabic mt-1" style="color: #9C4060;">
        {{ presentCount }} / {{ attendanceRows.length }} طالب
      </p>
    </div>

    <!-- Students present -->
    <div class="rounded-2xl p-5" style="background-color: #E0F0EE; box-shadow: var(--shadow-card);">
      <div class="flex items-center justify-between mb-2">
        <span class="label-md font-arabic" style="color: #4A8E85;">الطلاب الحاضرون</span>
        <UIcon name="i-lucide-users" class="w-5 h-5" style="color: #4A8E85;" />
      </div>
      <p class="display-md" style="color: #4A8E85;">{{ presentCount }}</p>
      <p class="body-md font-arabic mt-1" style="color: #4A8E85;">طالب</p>
    </div>
  </div>
</template>
