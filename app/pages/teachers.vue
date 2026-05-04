<script setup lang="ts">
definePageMeta({
  middleware: ['principal-only'],
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.teachers.title' }
  ]
})

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-bold">
        {{ t('pages.teachers.title') }}
      </h1>
      <p class="text-sm text-muted">
        {{ t('pages.teachers.subtitle') }}
      </p>
    </div>

    <UCard>
      <template #header>
        <h2 class="font-semibold">
          {{ t('pages.teachers.managementTitle') }}
        </h2>
      </template>

      <p class="text-sm text-muted">
        {{ t('pages.teachers.comingSoon') }}
      </p>
    </UCard>
  </div>
</template>
