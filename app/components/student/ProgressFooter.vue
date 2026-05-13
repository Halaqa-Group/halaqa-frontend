<script setup lang="ts">
const { t } = useI18n()
const { totalStudents } = useStudents()
const { sortedStudents, hasMore, isLoadingMore, loadMore } = useStudentsView()
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <span class="text-xs text-muted">
      {{ t('pages.students.showingCount', { filtered: sortedStudents.length, total: totalStudents }) }}
    </span>
    <UButton
      v-if="hasMore"
      variant="soft"
      color="neutral"
      size="sm"
      :loading="isLoadingMore"
      :disabled="isLoadingMore"
      @click="loadMore"
    >
      {{ t('pages.students.loadMore') }}
    </UButton>
  </div>
</template>
