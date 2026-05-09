<script setup lang="ts">
const { students } = useStudents()
const { sortedStudents, loadProgress } = useStudentsView()
</script>

<template>
  <div class="mt-12 text-center py-8">
    <div class="flex flex-col items-center gap-4">
      <p class="text-sm text-on-surface-variant">
        {{ $t('pages.students.showingCount', { filtered: sortedStudents.length, total: students.length }) }}
      </p>
      <div class="w-48 h-1.5 rounded-full overflow-hidden bg-primary-container">
        <div
          class="h-full rounded-full transition-all duration-200 bg-primary"
          :style="{ width: `${loadProgress}%` }"
        />
      </div>
    </div>
  </div>
</template>
