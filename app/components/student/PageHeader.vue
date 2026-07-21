<script setup lang="ts">
const { t } = useI18n()
const { canCreateStudent } = usePermissions()
const { openAdd } = useStudents()
</script>

<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div class="space-y-1">
      <h1 class="text-2xl font-bold">
        {{ t('pages.students.title') }}
      </h1>
    </div>
    <UButton
      v-if="canCreateStudent"
      icon="i-lucide-plus"
      class="shrink-0"
      @click="openAdd"
    >
      {{ t('pages.students.addNew') }}
    </UButton>
  </div>
</template>
