<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] gap-4">
    <div class="w-16 h-16 rounded-2xl flex items-center justify-center" style="background-color: #EFB0C1;">
      <UIcon name="i-lucide-layout-grid" class="w-8 h-8" style="color: #8B3A52;" />
    </div>
    <h2 class="display-md font-arabic" style="color: var(--color-on-surface);">لوحة التحكم</h2>
    <p class="body-md font-arabic text-center max-w-xs" style="color: var(--color-on-surface-variant);">
      ستتوفر إحصائيات ونظرة عامة على الأكاديمية هنا قريباً
    </p>
  </div>
</template>
