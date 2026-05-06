<script setup lang="ts">
const { openAdd } = useStudents()
const { viewMode } = useStudentsView()
</script>

<template>
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
    <div class="space-y-1">
      <h2 class="display-lg text-on-surface">
        {{ $t('pages.students.title') }}
      </h2>
      <p class="text-sm text-on-surface-variant">
        {{ $t('pages.students.subtitle') }}
      </p>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <div class="flex items-center bg-elevated p-1 rounded-full border border-default">
        <UButton
          :variant="viewMode === 'grid' ? 'soft' : 'ghost'"
          color="primary"
          icon="i-lucide-layout-grid"
          size="md"
          class="rounded-full px-3"
          :aria-label="$t('pages.students.view.grid')"
          @click="viewMode = 'grid'" />
        <UButton
          :variant="viewMode === 'table' ? 'soft' : 'ghost'"
          color="primary"
          icon="i-lucide-table-2"
          size="md"
          class="rounded-full px-3"
          :aria-label="$t('pages.students.view.table')"
          @click="viewMode = 'table'" />
      </div>

      <UButton
        icon="i-lucide-plus"
        size="lg"
        class="font-bold rounded-full shrink-0 px-6"
        @click="openAdd">
        {{ $t('pages.students.addNew') }}
      </UButton>
    </div>
  </div>
</template>
