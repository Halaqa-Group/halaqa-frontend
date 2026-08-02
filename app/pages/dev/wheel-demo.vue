<script setup lang="ts">
// TEMP sandbox for verifying the collapsible mobile wheel range picker.
definePageMeta({ layout: 'none' })

const range = reactive({ start_surah: 2, start_verse: 6, end_surah: 2, end_verse: 20 })
</script>

<template>
  <div class="min-h-screen bg-default p-4">
    <div class="mx-auto max-w-md space-y-6">
      <h1 class="text-lg font-semibold text-highlighted">
        Collapsible wheel range
      </h1>
      <div class="grid grid-cols-1 gap-3">
        <div class="space-y-1">
          <span class="text-xs font-medium text-muted">From (surah/ayah)</span>
          <PlannerAyahSelect v-model:surah="range.start_surah" v-model:verse="range.start_verse" />
        </div>
        <div class="space-y-1">
          <span class="text-xs font-medium text-muted">To (surah/ayah)</span>
          <PlannerAyahSelect v-model:surah="range.end_surah" v-model:verse="range.end_verse" snap-to="last" />
        </div>
      </div>
      <pre class="rounded bg-elevated p-3 text-xs text-default">{{ JSON.stringify(range) }}</pre>
    </div>
  </div>
</template>
