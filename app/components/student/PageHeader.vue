<script setup lang="ts">
const { t } = useI18n()
const { user } = useAuth()
const { openAdd } = useStudents()

const canCreateStudent = computed(() => {
  const roles = user.value?.roles ?? []
  return roles.includes('principal') || roles.includes('vice_principal')
})
</script>

<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div class="space-y-1">
      <h1 class="text-2xl font-bold">
        {{ t('pages.students.title') }}
      </h1>
      <p class="text-sm text-muted">
        {{ t('pages.students.subtitle') }}
      </p>
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
