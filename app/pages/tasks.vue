<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] gap-4">
    <div class="w-16 h-16 rounded-2xl flex items-center justify-center" style="background-color: #FFF3E0;">
      <UIcon name="i-lucide-check-square" class="w-8 h-8" style="color: #F57C00;" />
    </div>
    <h2 class="display-md" style="color: var(--color-on-surface);">
      {{ $t('pages.tasks.title') }}
    </h2>
    <p class="body-md text-center max-w-xs" style="color: var(--color-on-surface-variant);">
      {{ $t('pages.tasks.comingSoon') }}
    </p>
  </div>
</template>
