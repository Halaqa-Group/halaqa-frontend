<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()
</script>

<template>
  <div class="flex justify-between gap-x-2.5">
    <div class="flex items-center gap-x-2">
      <UIcon name="i-custom-earth" class="text-muted size-5" />
      <span class="text-sm font-medium">{{ $t('language') }}</span>
    </div>
    <div class="flex items-center gap-x-1">
      <UButton
        v-for="l in locales"
        :key="l.code"
        :label="l.name"
        size="md"
        :color="locale === l.code ? 'primary' : 'neutral'"
        :variant="locale === l.code ? 'subtle' : 'outline'"
        @click="setLocale(l.code)"
      />
    </div>
  </div>
</template>
