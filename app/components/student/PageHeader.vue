<script setup lang="ts">
const { t } = useI18n()
const { canCreateStudent } = usePermissions()
const { openAdd } = useStudents()
</script>

<template>
  <div v-if="canCreateStudent" class="flex justify-end">
    <UButton
      icon="i-lucide-plus"
      class="shrink-0"
      @click="openAdd"
    >
      {{ t('pages.students.addNew') }}
    </UButton>
  </div>
</template>
